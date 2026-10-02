import {
    useEffect,
    useState,
} from "react";
import type { FormEvent } from "react";

import { useNavigate } from "react-router-dom";
import "./Transacoes.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type Conta = {
    id: number;
    customerId: number;
    agency: string;
    number: string;
    balance: number;
    status: string;
    createdAt: string;
};

type MensagemApi = {
    mensagem?: string;
    erros?: string[];
};

function Transacoes() {
    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState<Usuario | null>(null);

    const [conta, setConta] =
        useState<Conta | null>(null);

    const [carregando, setCarregando] =
        useState(true);

    const [processando, setProcessando] =
        useState(false);

    const [sidebarRecolhida, setSidebarRecolhida] =
        useState(false);

    const [saldoVisivel, setSaldoVisivel] =
        useState(true);

    const [valorDeposito, setValorDeposito] =
        useState("");

    const [valorSaque, setValorSaque] =
        useState("");

    const [agenciaDestino, setAgenciaDestino] =
        useState("");

    const [contaDestino, setContaDestino] =
        useState("");

    const [valorTransferencia, setValorTransferencia] =
        useState("");

    const [mensagem, setMensagem] =
        useState("");

    const [tipoMensagem, setTipoMensagem] =
        useState<"success" | "error" | "">("");

    function formatarMoeda(valor: number) {
        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
            }
        ).format(valor);
    }

    function obterUsuarioSalvo() {
        const usuarioSalvo =
            sessionStorage.getItem(
                "corebank_usuario"
            );

        if (!usuarioSalvo) {
            return null;
        }

        try {
            return JSON.parse(
                usuarioSalvo
            ) as Usuario;
        } catch {
            return null;
        }
    }

    function obterToken() {
        return sessionStorage.getItem(
            "corebank_token"
        );
    }

    function limparSessao() {
        sessionStorage.removeItem(
            "corebank_token"
        );

        sessionStorage.removeItem(
            "corebank_usuario"
        );
    }

    function handleLogout() {
        limparSessao();

        navigate("/login", {
            replace: true,
        });
    }

    function exibirMensagem(
        texto: string,
        tipo: "success" | "error"
    ) {
        setMensagem(texto);
        setTipoMensagem(tipo);
    }

    function converterValor(valor: string) {
        const valorNormalizado =
            valor
                .replace(/\./g, "")
                .replace(",", ".");

        return Number(valorNormalizado);
    }

    async function carregarConta() {
        const token = obterToken();

        const usuarioAtual =
            obterUsuarioSalvo();

        if (!token || !usuarioAtual) {
            limparSessao();

            navigate("/login", {
                replace: true,
            });

            return;
        }

        setUsuario(usuarioAtual);
        setCarregando(true);

        try {
            const resposta = await fetch(
                "https://localhost:7122/api/Accounts/me",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            if (
                resposta.status === 401 ||
                resposta.status === 403
            ) {
                limparSessao();

                navigate("/login", {
                    replace: true,
                });

                return;
            }

            if (!resposta.ok) {
                throw new Error(
                    "Não foi possível carregar sua conta."
                );
            }

            const dados =
                (await resposta.json()) as Conta;

            setConta(dados);
        } catch (error) {
            exibirMensagem(
                error instanceof Error
                    ? error.message
                    : "Não foi possível carregar sua conta.",
                "error"
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarConta();
    }, []);

    async function handleDeposito(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const token = obterToken();

        const valor =
            converterValor(valorDeposito);

        if (!token) {
            handleLogout();
            return;
        }

        if (
            !valor ||
            Number.isNaN(valor) ||
            valor <= 0
        ) {
            exibirMensagem(
                "Informe um valor válido para o depósito.",
                "error"
            );

            return;
        }

        try {
            setProcessando(true);
            setMensagem("");
            setTipoMensagem("");

            const resposta = await fetch(
                "https://localhost:7122/api/Accounts/me/deposit",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        amount: valor,
                    }),
                }
            );

            if (
                resposta.status === 401 ||
                resposta.status === 403
            ) {
                handleLogout();
                return;
            }

            if (!resposta.ok) {
                let dados:
                    | MensagemApi
                    | null = null;

                try {
                    dados =
                        (await resposta.json()) as MensagemApi;
                } catch {
                    dados = null;
                }

                throw new Error(
                    dados?.mensagem ??
                    dados?.erros?.[0] ??
                    "Não foi possível realizar o depósito."
                );
            }

            setValorDeposito("");

            exibirMensagem(
                "Depósito realizado com sucesso.",
                "success"
            );

            await carregarConta();
        } catch (error) {
            exibirMensagem(
                error instanceof Error
                    ? error.message
                    : "Não foi possível realizar o depósito.",
                "error"
            );
        } finally {
            setProcessando(false);
        }
    }

    async function handleSaque(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const token = obterToken();

        const valor =
            converterValor(valorSaque);

        if (!token) {
            handleLogout();
            return;
        }

        if (
            !valor ||
            Number.isNaN(valor) ||
            valor <= 0
        ) {
            exibirMensagem(
                "Informe um valor válido para o saque.",
                "error"
            );

            return;
        }

        try {
            setProcessando(true);
            setMensagem("");
            setTipoMensagem("");

            const resposta = await fetch(
                "https://localhost:7122/api/Accounts/me/withdraw",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        amount: valor,
                    }),
                }
            );

            if (
                resposta.status === 401 ||
                resposta.status === 403
            ) {
                handleLogout();
                return;
            }

            if (!resposta.ok) {
                let dados:
                    | MensagemApi
                    | null = null;

                try {
                    dados =
                        (await resposta.json()) as MensagemApi;
                } catch {
                    dados = null;
                }

                throw new Error(
                    dados?.mensagem ??
                    dados?.erros?.[0] ??
                    "Não foi possível realizar o saque."
                );
            }

            setValorSaque("");

            exibirMensagem(
                "Saque realizado com sucesso.",
                "success"
            );

            await carregarConta();
        } catch (error) {
            exibirMensagem(
                error instanceof Error
                    ? error.message
                    : "Não foi possível realizar o saque.",
                "error"
            );
        } finally {
            setProcessando(false);
        }
    }

    async function handleTransferencia(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const token = obterToken();
        const agencia = agenciaDestino.trim();
        const numeroConta = contaDestino.trim();
        const valor = converterValor(valorTransferencia);

        if (!token) {
            handleLogout();
            return;
        }

        if (!agencia || !numeroConta || !valorTransferencia.trim()) {
            exibirMensagem(
                "Preencha os dados da transferência.",
                "error"
            );
            return;
        }

        if (!valor || Number.isNaN(valor) || valor <= 0) {
            exibirMensagem(
                "Informe um valor válido para a transferência.",
                "error"
            );
            return;
        }

        try {
            setProcessando(true);
            setMensagem("");
            setTipoMensagem("");

            const resposta = await fetch(
                "https://localhost:7122/api/Accounts/me/transfer",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        agency: agencia,
                        accountNumber: numeroConta,
                        amount: valor,
                    }),
                }
            );

            if (resposta.status === 401 || resposta.status === 403) {
                handleLogout();
                return;
            }

            if (!resposta.ok) {
                let dados: MensagemApi | null = null;

                try {
                    dados = (await resposta.json()) as MensagemApi;
                } catch {
                    dados = null;
                }

                throw new Error(
                    dados?.mensagem ??
                    dados?.erros?.[0] ??
                    "Não foi possível realizar a transferência."
                );
            }

            setAgenciaDestino("");
            setContaDestino("");
            setValorTransferencia("");

            exibirMensagem(
                "Transferência realizada com sucesso.",
                "success"
            );

            await carregarConta();
        } catch (error) {
            exibirMensagem(
                error instanceof Error
                    ? error.message
                    : "Não foi possível realizar a transferência.",
                "error"
            );
        } finally {
            setProcessando(false);
        }
    }

    if (carregando) {
        return (
            <main className= "trans-loading" >
            <strong>
            CoreBank
            </strong>

            <p>
                    Carregando transações...
        </p>
            </main>
        );
    }

    return (
        <main
            className= {`trans-page ${sidebarRecolhida
            ? "sidebar-collapsed"
            : ""
            }`
}
        >
    <aside className="trans-sidebar" >
        <div className="sidebar-header" >
            <strong className="corebank-logo" >
                <span className="corebank-core" > Core </span>
                    < span className = "corebank-bank" > Bank </span>
                        </strong>

                        < button
type = "button"
className = "sidebar-toggle"
onClick = {() =>
setSidebarRecolhida(
    !sidebarRecolhida
)
                        }
                    >
{
    sidebarRecolhida
    ? "›"
        : "‹"
}
    </button>
    </div>

    < nav className = "trans-nav" >
        <button
                        type="button"
className = "nav-item"
onClick = {() =>
navigate("/dashboard")
                        }
                    >
    <span className="nav-icon" >
                            ◆
</span>

    < span className = "nav-text" >
        Início
        </span>
        </button>

        < button
type = "button"
className = "nav-item active"
    >
    <span className="nav-icon" >
                            ➤
</span>

    < span className = "nav-text" >
        Transações
        </span>
        </button>

        < button
type = "button"
className = "nav-item"
onClick = {() =>
navigate("/extrato")
                        }
                    >
    <span className="nav-icon" >
                            ▤
</span>

    < span className = "nav-text" >
        Extrato
        </span>
        </button>

        < button
type = "button"
className = "nav-item"
onClick = {() =>
navigate("/solicitacoes")
                        }
                    >
    <span className="nav-icon" >
                            ◇
</span>

    < span className = "nav-text" >
        Solicitações
        </span>
        </button>

        < button
type = "button"
className = "nav-item"
onClick = {() =>
navigate("/perfil")
                        }
                    >
    <span className="nav-icon" >
                            ♟
</span>

    < span className = "nav-text" >
        Perfil
        </span>
        </button>
        </nav>

        < div className = "sidebar-footer" >
            <div className="security-box" >
                <span className="security-icon" >
                            ✓
</span>

    < div className = "security-text" >
        <strong>
        Ambiente seguro
            </strong>

            <small>
                                Sessão protegida
    </small>
    </div>
    </div>

    < button
type = "button"
className = "logout-button"
onClick = { handleLogout }
    >
    <span className="logout-icon" >
                            ↪
</span>

    < span className = "nav-text" >
        Sair
        </span>
        </button>
        </div>
        </aside>

        < section className = "trans-content" >
            <header className="trans-header" >
                <div>
                <span className="section-label" >
                    OPERAÇÕES
                    </span>

                    <h1>
Transações
    </h1>

    <p>
                            Movimente seu dinheiro de
                            forma rápida e segura.
                        </p>
    </div>

    < div className = "header-user" >
        <div className="header-user-info" >
            <strong>
            { usuario?.nome ??
            "Cliente CoreBank"}
</strong>

    <span>
{ usuario?.email }
</span>
    </div>

    < div className = "user-avatar" >
    {
        usuario?.nome
                                ?.charAt(0)
                                .toUpperCase() ??
            "C"
    }
        </div>
        </div>
        </header>

{
    mensagem && (
        <div
                        className={ `trans-message ${tipoMensagem}` }
                    >
        <span>
        { tipoMensagem ===
        "success"
        ? "✓"
        : "!"
}
</span>

    <p>
{ mensagem }
</p>
    </div>
                )}

<section className="trans-balance-card" >
    <div>
    <span className="section-label" >
        SALDO DISPONÍVEL
            </span>

            < div className = "trans-balance-value" >
                <strong>
                {
                    saldoVisivel
                    ? formatarMoeda(
                        conta?.balance ??
                0
                                    )
                                    : "R$ ••••••"}
</strong>

    < button
type = "button"
onClick = {() =>
setSaldoVisivel(
    !saldoVisivel
)
                                }
                            >
{
    saldoVisivel
    ? "◉"
        : "○"
}
    </button>
    </div>
    </div>

    < div className = "trans-account-data" >
        <div>
        <span>
        Agência
        </span>

        <strong>
{ conta?.agency }
</strong>
    </div>

    < div >
    <span>
    Conta
    </span>

    <strong>
{ conta?.number }
</strong>
    </div>

    < div >
    <span>
    Status
    </span>

    < strong className = "status-green" >
                                ● { conta?.status }
</strong>
    </div>
    </div>

    < div className = "trans-line line-one" > </div>
        < div className = "trans-line line-two" > </div>
            </section>

            < section className = "transactions-grid" >
                <form
                        className="transaction-card"
onSubmit = { handleDeposito }
    >
    <div className="transaction-title" >
        <div className="transaction-icon" >
                                ↓
</div>

    < div >
    <span className="section-label" >
        ENTRADA
        </span>

        <h2>
Depositar
    </h2>

    <p>
                                    Adicione dinheiro à
                                    sua conta.
                                </p>
    </div>
    </div>

    < label htmlFor = "deposito" >
        Valor do depósito
            </label>

            < div className = "money-input" >
            <span>
            R$
            </span>

            < input
                                id = "deposito"
type = "text"
inputMode = "decimal"
placeholder = "0,00"
value = {
    valorDeposito
}
onChange = {(event) =>
setValorDeposito(
    event.target
        .value
)
                                }
disabled = {
    processando
}
    />
    </div>

    < button
type = "submit"
className = "transaction-button"
disabled = { processando }
    >
{
    processando
    ? "Processando..."
        : "Realizar depósito"
}
    </button>
    </form>

    < form
className = "transaction-card"
onSubmit = { handleSaque }
    >
    <div className="transaction-title" >
        <div className="transaction-icon" >
                                ↑
</div>

    < div >
    <span className="section-label" >
        SAÍDA
        </span>

        <h2>
Sacar
    </h2>

    <p>
                                    Retire dinheiro do
                                    saldo disponível.
                                </p>
    </div>
    </div>

    < label htmlFor = "saque" >
        Valor do saque
            </label>

            < div className = "money-input" >
            <span>
            R$
            </span>

            < input
                                id = "saque"
type = "text"
inputMode = "decimal"
placeholder = "0,00"
value = { valorSaque }
onChange = {(event) =>
setValorSaque(
    event.target
        .value
)
                                }
disabled = {
    processando
}
    />
    </div>

    < button
type = "submit"
className = "transaction-button"
disabled = { processando }
    >
{
    processando
    ? "Processando..."
        : "Realizar saque"
}
    </button>
    </form>

    < form
className = "transaction-card transfer-card"
onSubmit = {
    handleTransferencia
}
    >
    <div className="transaction-title" >
        <div className="transaction-icon" >
                                ⇄
</div>

    < div >
    <span className="section-label" >
        TRANSFERÊNCIA
        </span>

        <h2>
Transferir
    </h2>

    <p>
                                    Envie dinheiro para
                                    outra conta CoreBank.
                                </p>
    </div>
    </div>

    < div className = "transfer-fields" >
        <div>
        <label htmlFor="agencia" >
            Agência
            </label>

            < div className = "text-input" >
                <input
                                        id="agencia"
type = "text"
placeholder = "0001"
value = {
    agenciaDestino
}
onChange = {(
    event
) =>
setAgenciaDestino(
    event
        .target
        .value
)
                                        }
disabled = { processando }
    />
    </div>
    </div>

    < div >
    <label htmlFor="conta" >
        Conta
        </label>

        < div className = "text-input" >
            <input
                                        id="conta"
type = "text"
placeholder = "000000"
value = {
    contaDestino
}
onChange = {(
    event
) =>
setContaDestino(
    event
        .target
        .value
)
                                        }
disabled = { processando }
    />
    </div>
    </div>
    </div>

    < label htmlFor = "transferencia" >
        Valor da transferência
            </label>

            < div className = "money-input" >
                <span>
                R$
                </span>

                < input
id = "transferencia"
type = "text"
inputMode = "decimal"
placeholder = "0,00"
value = {
    valorTransferencia
}
onChange = {(event) =>
setValorTransferencia(
    event.target
        .value
)
                                }
disabled = { processando }
    />
    </div>

    < button
type = "submit"
className = "transaction-button"
disabled = { processando }
    >
{ processando? "Processando...": "Realizar transferência" }
    </button>
    </form>
    </section>
    </section>
    </main>
    );
}

export default Transacoes;