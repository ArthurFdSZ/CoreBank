# 🏦 CoreBank

> Plataforma bancária Full Stack desenvolvida para simular operações e fluxos administrativos presentes em um ambiente financeiro.

O **CoreBank** é um projeto Full Stack desenvolvido com **C#, .NET, ASP.NET Core, Entity Framework Core, SQL Server, React e TypeScript**.

O objetivo do projeto é aplicar conceitos de **Engenharia de Software, desenvolvimento de APIs REST, arquitetura em camadas, regras de negócio, autenticação, persistência de dados e desenvolvimento frontend**, simulando uma aplicação bancária com ambientes distintos para **clientes e administradores**.

O sistema contempla desde o cadastro e abertura de uma conta até operações financeiras, extrato, solicitações administrativas, recuperação de acesso e acompanhamento gerencial.

---

# 📌 Visão geral

O CoreBank foi estruturado em duas grandes áreas:

### 👤 Área do Cliente

Ambiente destinado aos usuários da plataforma bancária.

Permite:

- criação de perfil;
- autenticação;
- solicitação de abertura de conta;
- acompanhamento da ativação;
- consulta de saldo;
- depósitos;
- saques;
- transferências;
- consulta de extrato;
- gerenciamento de solicitações;
- solicitação de bloqueio/desbloqueio;
- recuperação de senha;
- gerenciamento de perfil.

### 🛡️ Área Administrativa

Ambiente destinado à administração da plataforma.

Permite:

- acompanhamento de indicadores;
- gerenciamento de clientes;
- gerenciamento de contas;
- análise de solicitações;
- aprovação ou rejeição de abertura de conta;
- análise de bloqueios e desbloqueios;
- análise de solicitações de recuperação de senha;
- acompanhamento de movimentações;
- visualização de relatórios;
- gerenciamento do perfil administrativo.

---

# 🛠️ Tecnologias utilizadas

## Backend

- **C#**
- **.NET 10**
- **ASP.NET Core Web API**
- **Entity Framework Core**
- **SQL Server**
- **JWT**
- **Swagger / OpenAPI**

## Frontend

- **React**
- **TypeScript**
- **Vite**
- **HTML5**
- **CSS3**
- **React Router**

## Banco de dados

- **Microsoft SQL Server**
- **Entity Framework Core Migrations**

## Ferramentas

- **Visual Studio**
- **Visual Studio Code**
- **Git**
- **GitHub**
- **Swagger**
- **npm**
- **Vite**

---

# 🏗️ Arquitetura

O backend foi desenvolvido utilizando uma organização em camadas para separar responsabilidades e facilitar manutenção e evolução.

```text
CoreBank
│
├── CoreBank.Domain
├── CoreBank.Application
├── CoreBank.Infrastructure
├── CoreBank.Api
│
└── corebank-web
```

## CoreBank.Domain

Responsável pelas principais entidades, enums, exceções e regras relacionadas ao domínio bancário.

Exemplos de conceitos presentes no domínio:

- Cliente;
- Conta;
- Transação;
- Status da conta;
- Tipo da transação;
- regras de depósito;
- regras de saque;
- regras de transferência.

---

## CoreBank.Application

Camada destinada à lógica de aplicação e aos casos de uso do sistema.

Sua responsabilidade é fazer a comunicação entre as regras do domínio e as demais camadas da aplicação.

---

## CoreBank.Infrastructure

Responsável principalmente pela persistência e comunicação com o banco de dados.

Inclui:

- `DbContext`;
- configurações do Entity Framework Core;
- acesso ao SQL Server;
- migrations;
- persistência das entidades.

---

## CoreBank.Api

Camada responsável pela exposição da aplicação através de uma **API REST**.

Contém os controllers e endpoints utilizados pelo frontend.

A API é responsável por receber requisições HTTP, executar as regras da aplicação e devolver respostas ao cliente.

---

## corebank-web

Aplicação frontend desenvolvida com **React + TypeScript + Vite**.

Responsável pela interface utilizada por clientes e administradores.

O frontend consome a API CoreBank utilizando requisições HTTP e mantém separadas as experiências de cliente e administrador.

---

# 🔐 Autenticação

O sistema possui autenticação para controlar o acesso às funcionalidades protegidas.

Após o login, o usuário recebe um token utilizado nas requisições autenticadas.

O frontend mantém as informações necessárias da sessão e envia o token através do cabeçalho:

```http
Authorization: Bearer TOKEN
```

O sistema também diferencia os perfis de acesso.

Exemplos:

```text
Cliente
Administrador
```

Com isso, usuários administrativos são direcionados para o ambiente administrativo, enquanto clientes utilizam a área bancária.

---

# 👤 Cadastro e abertura de conta

No CoreBank, **cadastro de usuário e abertura de conta são processos diferentes**.

Ao realizar o cadastro, inicialmente é criado o perfil do cliente.

O usuário que ainda não possui conta bancária não recebe acesso imediato às operações financeiras.

O fluxo é:

```text
Cadastro
   ↓
Perfil criado
   ↓
Solicitação de abertura de conta
   ↓
Análise administrativa
   ↓
Aprovação
   ↓
Conta criada/ativada
   ↓
Acesso aos serviços bancários
```

Enquanto a solicitação está pendente, o cliente acompanha o processo através de uma tela específica de ativação.

Essa separação simula um processo de **onboarding bancário**, no qual a existência de um cadastro não significa automaticamente a existência de uma conta operacional.

---

# 💳 Contas bancárias

As contas possuem informações como:

- identificador;
- cliente associado;
- agência;
- número da conta;
- saldo;
- status;
- data de criação.

O sistema diferencia o **cliente** da **conta bancária**.

Um cliente representa a pessoa cadastrada na plataforma.

A conta representa o recurso financeiro associado ao cliente.

---

# 💰 Operações financeiras

O CoreBank implementa operações bancárias fundamentais.

## Depósito

Permite adicionar valores à conta.

Exemplo:

```text
Saldo atual: R$ 100,00
Depósito:    R$ 50,00

Novo saldo: R$ 150,00
```

A operação também gera uma transação registrada no histórico.

---

## Saque

Permite retirar dinheiro do saldo disponível.

Antes da operação, o domínio valida se existe saldo suficiente.

Exemplo:

```text
Saldo: R$ 100,00
Saque: R$ 40,00

Novo saldo: R$ 60,00
```

Uma tentativa de saque superior ao saldo disponível é rejeitada.

---

## Transferência

Permite movimentar valores entre contas.

A operação envolve:

1. validação da conta de origem;
2. validação do saldo;
3. identificação da conta de destino;
4. débito da origem;
5. crédito no destino;
6. registro das movimentações.

O histórico diferencia transferências enviadas e recebidas.

---

# 📑 Transações

As movimentações financeiras são registradas para permitir rastreabilidade.

Entre os tipos utilizados estão:

```text
Deposit
Withdrawal
TransferSent
TransferReceived
```

Cada movimentação pode armazenar informações como:

- identificador;
- conta;
- tipo;
- valor;
- descrição;
- conta relacionada;
- data da operação.

---

# 📜 Extrato

O cliente possui acesso ao histórico de movimentações da conta.

O extrato apresenta informações relacionadas às operações realizadas, permitindo acompanhar:

- depósitos;
- saques;
- transferências enviadas;
- transferências recebidas;
- valores;
- datas;
- saldo da conta.

---

# 📩 Sistema de solicitações

O projeto possui um fluxo administrativo para operações que precisam de análise.

Entre as solicitações tratadas pelo sistema estão:

- abertura de conta;
- bloqueio;
- desbloqueio;
- recuperação de senha.

O fluxo básico é:

```text
Cliente cria solicitação
        ↓
Solicitação fica pendente
        ↓
Administrador recebe notificação
        ↓
Administrador analisa
        ↓
Aprovação ou rejeição
        ↓
Sistema executa a ação correspondente
```

O painel administrativo possui indicadores para destacar solicitações que aguardam análise.

---

# 🔒 Bloqueio e desbloqueio

O cliente pode solicitar alterações relacionadas ao status da conta.

Essas operações passam pela área administrativa.

O administrador pode analisar a solicitação e decidir entre:

```text
Aprovar
Rejeitar
```

Uma conta bloqueada mantém seu histórico, permitindo que o sistema diferencie clientes que nunca tiveram uma conta daqueles que possuem uma conta bloqueada.

---

# 🔑 Recuperação de senha

O sistema também possui fluxo de recuperação de acesso.

O usuário inicia o processo através da opção:

```text
Esqueci minha senha
```

A solicitação é registrada e pode ser acompanhada pelo ambiente administrativo.

As solicitações de recuperação de senha são integradas à central de solicitações do administrador juntamente com os demais processos administrativos.

---

# 🛡️ Painel administrativo

O CoreBank possui uma interface independente para administradores.

Principais páginas:

```text
Dashboard
Clientes
Contas
Solicitações
Relatórios
Perfil
```

---

# 📊 Dashboard administrativo

O dashboard fornece uma visão consolidada da plataforma.

Ele permite acompanhar indicadores importantes relacionados ao funcionamento do sistema e acessar rapidamente as principais áreas administrativas.

---

# 👥 Gestão de clientes

A administração possui uma área dedicada aos clientes cadastrados.

Essa separação permite visualizar os usuários da plataforma independentemente das contas bancárias existentes.

---

# 🏦 Gestão de contas

O sistema possui uma área administrativa específica para acompanhamento das contas bancárias.

A separação entre **Clientes** e **Contas** reflete a modelagem utilizada no backend.

---

# 📬 Central de solicitações

A página administrativa de solicitações centraliza processos que precisam de intervenção do administrador.

São apresentados:

- solicitações pendentes;
- solicitações aprovadas;
- solicitações rejeitadas;
- histórico das análises.

Também são utilizados indicadores e notificações para destacar novas solicitações.

---

# 📈 Relatórios

O ambiente administrativo possui uma página de relatórios destinada à análise dos principais indicadores do CoreBank.

A interface apresenta informações financeiras e operacionais através de:

- indicadores;
- resumos;
- gráficos;
- distribuição das movimentações;
- histórico financeiro;
- detalhamento das operações.

---

# 🎨 Interface

O CoreBank possui identidade visual própria inspirada em interfaces modernas do setor financeiro.

A aplicação utiliza predominantemente:

- fundos escuros;
- elementos translúcidos;
- tons metálicos;
- efeitos discretos de iluminação;
- cards;
- indicadores visuais;
- feedback de status;
- layouts distintos para cliente e administrador.

O objetivo foi criar uma interface consistente com uma aplicação financeira moderna sem comprometer a legibilidade.

---

# 🗄️ Banco de dados

O projeto utiliza **SQL Server** em conjunto com **Entity Framework Core**.

O banco é atualizado através de migrations.

Exemplo:

```powershell
Add-Migration NomeDaMigration -StartupProject CoreBank.Api
```

Depois:

```powershell
Update-Database -StartupProject CoreBank.Api
```

Entre as informações persistidas estão dados relacionados a:

```text
Customers
Accounts
Transactions
AccountRequests
PasswordResetRequests
```

Além das tabelas auxiliares necessárias para funcionamento da aplicação.

---

# 🔄 Entity Framework Core

O Entity Framework Core é utilizado como ORM da aplicação.

Ele permite mapear objetos C# para estruturas relacionais do SQL Server.

O projeto utiliza migrations para versionar alterações na estrutura do banco.

Isso possibilita evoluir o modelo sem precisar reconstruir manualmente todo o banco a cada mudança.

---

# 🌐 API REST

A comunicação entre frontend e backend ocorre através de uma API REST.

Exemplos conceituais de recursos utilizados:

```http
/api/Auth
/api/Customers
/api/Accounts
/api/AccountRequests
/api/Admin
```

A API utiliza métodos HTTP de acordo com cada operação.

```text
GET     → consulta
POST    → criação/operação
PUT     → atualização
```

As informações são trafegadas principalmente utilizando **JSON**.

---

# 📚 Swagger / OpenAPI

Durante o desenvolvimento, a API pode ser testada através da documentação OpenAPI/Swagger configurada no backend.

Isso permite validar os endpoints independentemente do frontend.

---

# 📂 Estrutura geral

Uma representação simplificada do projeto:

```text
CoreBank/
│
├── CoreBank.Domain/
│   ├── Entities/
│   ├── Enums/
│   └── Exceptions/
│
├── CoreBank.Application/
│
├── CoreBank.Infrastructure/
│   ├── Data/
│   └── Migrations/
│
├── CoreBank.Api/
│   ├── Controllers/
│   ├── Program.cs
│   └── appsettings.json
│
├── corebank-web/
│   ├── src/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

# ▶️ Como executar o projeto

## Pré-requisitos

Para executar o projeto localmente é necessário possuir:

- .NET SDK 10;
- SQL Server;
- Node.js;
- npm;
- Git.

---

## 1. Clone o repositório

```bash
git clone https://github.com/ArthurFdSZ/CoreBank.git
```

Entre na pasta:

```bash
cd CoreBank
```

---

## 2. Configure o banco

Confira a connection string da API no arquivo de configuração.

O ambiente local utiliza uma configuração semelhante a:

```text
Server=localhost;
Database=CoreBank;
Trusted_Connection=True;
```

A configuração pode precisar ser adaptada de acordo com a instalação local do SQL Server.

---

## 3. Aplique as migrations

Pelo Visual Studio, utilizando o **Package Manager Console**:

```powershell
Update-Database -StartupProject CoreBank.Api
```

Ou utilize a configuração equivalente do Entity Framework disponível no ambiente.

---

## 4. Execute a API

Na raiz:

```powershell
dotnet run --project .\CoreBank.Api\CoreBank.Api.csproj
```

No ambiente de desenvolvimento utilizado no projeto, a API pode ser disponibilizada através de HTTPS local.

---

## 5. Instale as dependências do frontend

Abra outro terminal:

```powershell
cd corebank-web
```

Execute:

```powershell
npm install
```

---

## 6. Execute o frontend

```powershell
npm run dev
```

O Vite informará o endereço local utilizado pela aplicação.

No ambiente de desenvolvimento do projeto:

```text
http://localhost:5173
```

---

# 🧪 Build

## Backend

Para validar o backend:

```powershell
dotnet build .\CoreBank.Api\CoreBank.Api.csproj
```

## Frontend

Dentro de `corebank-web`:

```powershell
npm run build
```

O build do frontend executa a validação TypeScript e gera a versão de produção através do Vite.

---

# 🧪 Testes funcionais

Durante o desenvolvimento foram realizados testes dos principais fluxos da aplicação.

Entre eles:

```text
✓ Cadastro de cliente
✓ Login
✓ Separação entre cliente e administrador
✓ Solicitação de abertura de conta
✓ Aprovação administrativa
✓ Criação/ativação da conta
✓ Depósito
✓ Saque
✓ Validação de saldo insuficiente
✓ Transferência
✓ Extrato
✓ Bloqueio
✓ Desbloqueio
✓ Recuperação de senha
✓ Solicitações administrativas
✓ Indicadores de solicitações pendentes
✓ Build do backend
✓ Build do frontend
```

---

# ⚠️ Ambiente de desenvolvimento

Este projeto foi desenvolvido como aplicação de estudo e portfólio.

Algumas configurações estão direcionadas ao ambiente local, como:

```text
localhost
SQL Server local
HTTPS de desenvolvimento
URLs locais da API
```

Para implantação em produção seria necessário revisar configurações como:

- connection strings;
- gerenciamento de secrets;
- CORS;
- certificados HTTPS;
- variáveis de ambiente;
- URLs da API;
- política de armazenamento de tokens;
- logging;
- monitoramento;
- infraestrutura de hospedagem.

---

# 🚀 Possíveis evoluções

O CoreBank pode continuar evoluindo com funcionalidades como:

- testes unitários;
- testes de integração;
- Docker;
- CI/CD;
- refresh tokens;
- autenticação multifator;
- notificações;
- paginação;
- auditoria avançada;
- observabilidade;
- exportação de extratos;
- integração com serviços externos;
- deploy em nuvem.

---

# 🎯 Objetivo do projeto

O CoreBank foi desenvolvido principalmente como projeto de **estudo e portfólio**, com foco na aplicação prática de conhecimentos relacionados ao desenvolvimento de software para sistemas financeiros.

Durante o desenvolvimento foram trabalhados conceitos como:

- orientação a objetos;
- arquitetura em camadas;
- APIs REST;
- autenticação;
- autorização;
- modelagem de banco de dados;
- Entity Framework Core;
- migrations;
- SQL;
- regras de negócio;
- desenvolvimento frontend;
- integração frontend/backend;
- controle de versão;
- tratamento de erros;
- experiência do usuário;
- fluxos administrativos.

---

# 👨‍💻 Autor

**Arthur Farias de Souza**

Estudante de Engenharia de Software com foco em desenvolvimento, dados e tecnologia aplicada ao setor financeiro.

GitHub: **ArthurFdSZ**

---

# 📄 Status

**CoreBank MVP — Concluído ✅**

O MVP contempla os principais fluxos planejados para clientes e administradores e está disponível como projeto de estudo e portfólio.