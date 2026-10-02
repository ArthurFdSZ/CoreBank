import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Perfil.css";

type Usuario = {
    id: number;
    nome: string;
    cpf: string;
    email: string;
    perfil: string;
    createdAt?: string;
};

type UsuarioApi = {
    id: number;
    name: string;
    cpf: string;
    email: string;
    role: string;
    createdAt?: string;
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

function Perfil() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [conta, setConta] = useState<Conta | null>(null);

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
    const [alterandoSenha, setAlterandoSenha] = useState(false);
    const [erroSenha, setErroSenha] = useState("");
    const [sucessoSenha, setSucessoSenha] = useState("");

    const [sidebarRecolhida, setSidebarRecolhida] =
        useState(false);

    function limparSessao() {
        sessionStorage.removeItem("corebank_token");
        sessionStorage.removeItem("corebank_usuario");
    }

    function handleLogout() {
        limparSessao();

        navigate("/login", {
            replace: true,
        });
    }

    function formatarData(data: string | undefined) {
        if (!data) {
            return "Não informado";
        }

        const dataConvertida = new Date(data);

        if (Number.isNaN(dataConvertida.getTime())) {
            return data;
        }

        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(dataConvertida);
    }

    async function carregarPerfil() {
        const token = sessionStorage.getItem("corebank_token");

        if (!token) {
            limparSessao();
            navigate("/login", { replace: true });
            return;
        }

        setCarregando(true);
        setErro("");

        try {
            const headers = {
                Authorization: `Bearer ${token}`,
            };

            const [respostaUsuario, respostaConta] = await Promise.all([
                fetch("https://localhost:7122/api/Customers/me", { headers }),
                fetch("https://localhost:7122/api/Accounts/me", { headers }),
            ]);

            if (
                respostaUsuario.status === 401 ||
                respostaUsuario.status === 403 ||
                respostaConta.status === 401 ||
                respostaConta.status === 403
            ) {
                limparSessao();
                navigate("/login", { replace: true });
                return;
            }

            if (!respostaUsuario.ok || !respostaConta.ok) {
                throw new Error();
            }

            const dadosUsuarioApi = (await respostaUsuario.json()) as UsuarioApi;
            const dadosConta = (await respostaConta.json()) as Conta;

            // A API retorna Name e Role. A tela utiliza nome e perfil.
            const dadosUsuario: Usuario = {
                id: dadosUsuarioApi.id,
                nome: dadosUsuarioApi.name,
                cpf: dadosUsuarioApi.cpf,
                email: dadosUsuarioApi.email,
                perfil: dadosUsuarioApi.role,
                createdAt: dadosUsuarioApi.createdAt,
            };

            setUsuario(dadosUsuario);
            setConta(dadosConta);

            // Mantém os dados básicos da sessão sincronizados com o banco.
            sessionStorage.setItem(
                "corebank_usuario",
                JSON.stringify(dadosUsuario)
            );
        } catch {
            setErro(
                "Não foi possível carregar os dados do seu perfil."
            );
        } finally {
            setCarregando(false);
        }
    }

    function abrirModalSenha() {
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarNovaSenha("");
        setErroSenha("");
        setSucessoSenha("");
        setModalSenhaAberto(true);
    }

    function fecharModalSenha() {
        if (alterandoSenha) {
            return;
        }

        setModalSenhaAberto(false);
        setErroSenha("");
    }

    async function alterarSenha() {
        const token = sessionStorage.getItem("corebank_token");

        if (!token) {
            limparSessao();
            navigate("/login", { replace: true });
            return;
        }

        setErroSenha("");
        setSucessoSenha("");

        if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
            setErroSenha("Preencha todos os campos.");
            return;
        }

        if (novaSenha !== confirmarNovaSenha) {
            setErroSenha("A confirmação da nova senha não confere.");
            return;
        }

        if (senhaAtual === novaSenha) {
            setErroSenha("A nova senha deve ser diferente da senha atual.");
            return;
        }

        const senhaValida =
            novaSenha.length >= 8 &&
            novaSenha.length <= 100 &&
            /[a-z]/.test(novaSenha) &&
            /[A-Z]/.test(novaSenha) &&
            /\d/.test(novaSenha) &&
            /[^a-zA-Z0-9]/.test(novaSenha);

        if (!senhaValida) {
            setErroSenha(
                "A nova senha deve ter entre 8 e 100 caracteres, com letra maiúscula, minúscula, número e caractere especial."
            );
            return;
        }

        setAlterandoSenha(true);

        try {
            const resposta = await fetch(
                "https://localhost:7122/api/Customers/me/password",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        currentPassword: senhaAtual,
                        newPassword: novaSenha,
                    }),
                }
            );

            if (resposta.status === 401 || resposta.status === 403) {
                limparSessao();
                navigate("/login", { replace: true });
                return;
            }

            const dados = await resposta.json().catch(() => null);

            if (!resposta.ok) {
                const mensagemValidacao =
                    dados?.errors &&
                    Object.values(dados.errors).flat().join(" ");

                setErroSenha(
                    mensagemValidacao ||
                    dados?.mensagem ||
                    "Não foi possível alterar a senha."
                );
                return;
            }

            setSenhaAtual("");
            setNovaSenha("");
            setConfirmarNovaSenha("");
            setSucessoSenha(
                dados?.mensagem ?? "Senha alterada com sucesso."
            );
        } catch {
            setErroSenha(
                "Não foi possível conectar ao servidor. Tente novamente."
            );
        } finally {
            setAlterandoSenha(false);
        }
    }

    useEffect(() => {
        carregarPerfil();
    }, []);

    if (carregando) {
        return (
            <main className= "perfil-loading" >
            <strong>CoreBank </strong>

            < p > Carregando seu perfil...</p>
                </main>
        );
    }

    return (
        <main
            className= {`perfil-page ${sidebarRecolhida
            ? "sidebar-collapsed"
            : ""
            }`
}
        >
{/* SIDEBAR */ }
    < aside className = "perfil-sidebar" >
        <div className="sidebar-header" >
            <strong className="corebank-logo" >
                <span className="corebank-core" >
                    Core
                    </span>

                    < span className = "corebank-bank" >
                        Bank
                        </span>
                        </strong>

                        < button
type = "button"
className = "sidebar-toggle"
onClick = {() =>
setSidebarRecolhida(
    !sidebarRecolhida
)
                        }
title = {
    sidebarRecolhida
    ? "Expandir menu"
        : "Recolher menu"
}
    >
{ sidebarRecolhida? "›": "‹" }
    </button>
    </div>

    < nav className = "perfil-nav" >
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
className = "nav-item"
onClick = {() =>
navigate("/transacoes")
                        }
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
className = "nav-item active"
    >
    <span className="nav-icon" >
                            ♙
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

{/* CONTEÚDO */ }
<section className="perfil-content" >
    <header className="perfil-header" >
        <div>
        <span className="section-label" >
            MINHA CONTA
                </span>

                < h1 > Perfil </h1>

                <p>
                            Consulte seus dados pessoais e
                            informações da conta.
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
                                .toUpperCase() ?? "C"
    }
        </div>
        </div>
        </header>

{
    erro && (
        <div className="perfil-message error" >
            <span>!</span>

            < p > { erro } </p>
            </div>
                )
}

{/* CARD PRINCIPAL */ }
<section className="perfil-hero-card" >
    <div className="perfil-avatar" >
    {
        usuario?.nome
                            ?.charAt(0)
                            .toUpperCase() ?? "C"
    }
        </div>

        < div className = "perfil-hero-info" >
            <span className="section-label" >
                CLIENTE COREBANK
                    </span>

                    <h2>
{
    usuario?.nome ??
    "Cliente CoreBank"
}
</h2>

    < p > { usuario?.email } </p>
    </div>

    < div
className = {`perfil-status ${conta?.status === "Ativa"
    ? "active"
    : ""
    }`}
                    >
    <span></span>

{
    conta?.status ??
    "Status não informado"
}
</div>

    < div className = "perfil-decoration decoration-one" > </div>
        < div className = "perfil-decoration decoration-two" > </div>
            </section>

{/* CARDS */ }
<section className="perfil-grid" >
{/* DADOS PESSOAIS */ }
    < article className = "perfil-card" >
        <div className="perfil-card-header" >
            <div>
            <span className="section-label" >
                INFORMAÇÕES
                </span>

                < h2 > Dados pessoais </h2>

                    <p>
                                    Informações vinculadas ao
                                    seu cadastro CoreBank.
                                </p>
    </div>

    < div className = "perfil-card-icon" >
                                ♙
</div>
    </div>

    < div className = "perfil-data-list" >
        <div className="perfil-data-row" >
            <span>Nome completo </span>

                <strong>
{
    usuario?.nome ??
    "Não informado"
}
</strong>
    </div>

    < div className = "perfil-data-row" >
        <span>E - mail </span>

        <strong>
{
    usuario?.email ??
    "Não informado"
}
</strong>
    </div>

    < div className = "perfil-data-row" >
        <span>CPF </span>

        <strong>
{
    usuario?.cpf ??
    "Não informado"
}
</strong>
    </div>

    < div className = "perfil-data-row" >
        <span>Tipo de acesso </span>

            <strong>
{
    usuario?.perfil ===
    "Cliente"
    ? "Cliente"
    : usuario?.perfil ??
    "Cliente"
}
</strong>
    </div>
    </div>
    </article>

{/* DADOS DA CONTA */ }
<article className="perfil-card" >
    <div className="perfil-card-header" >
        <div>
        <span className="section-label" >
            CONTA BANCÁRIA
                </span>

                < h2 > Dados da conta </h2>

                    <p>
                                    Informações da sua conta
CoreBank.
                                </p>
    </div>

    < div className = "perfil-card-icon" >
                                ▣
</div>
    </div>

    < div className = "perfil-data-list" >
        <div className="perfil-data-row" >
            <span>Agência </span>

            <strong>
{
    conta?.agency ??
    "Não informado"
}
</strong>
    </div>

    < div className = "perfil-data-row" >
        <span>Número da conta </span>

            <strong>
{
    conta?.number ??
    "Não informado"
}
</strong>
    </div>

    < div className = "perfil-data-row" >
        <span>Status </span>

        < strong
className = {
    conta?.status ===
    "Ativa"
    ? "text-active"
    : ""
                                    }
                                >
{ conta?.status ??
    "Não informado"}
</strong>
    </div>

    < div className = "perfil-data-row" >
        <span>Cliente desde </span>

            <strong>
{
    formatarData(
        conta?.createdAt
    )
}
</strong>
    </div>
    </div>
    </article>

{/* SEGURANÇA */ }
<article className="perfil-card security-card" >
    <div className="perfil-card-header" >
        <div>
        <span className="section-label" >
            SEGURANÇA
            </span>

            < h2 > Acesso e segurança </h2>

                <p>
                                    Gerencie a segurança da
                                    sua sessão.
                                </p>
    </div>

    < div className = "perfil-card-icon" >
                                ✓
</div>
    </div>

    < div className = "security-actions" >
        <div className="security-action" >
            <div>
            <strong>Senha </strong>

            <span>
                                        Protege o acesso à sua
                                        conta CoreBank.
                                    </span>
    </div>

    < button
type = "button"
className = "secondary-button"
onClick = { abrirModalSenha }
    >
    Alterar senha
        </button>
        </div>

        < div className = "security-divider" > </div>

            < div className = "security-action" >
                <div>
                <strong>
                Encerrar sessão
                    </strong>

                    <span>
                                        Finalize seu acesso
                                        neste dispositivo.
                                    </span>
    </div>

    < button
type = "button"
className = "logout-profile-button"
onClick = { handleLogout }
    >
    Sair da conta
        </button>
        </div>
        </div>
        </article>
        </section>
        </section>

{
    modalSenhaAberto && (
        <div
                    className="password-modal-overlay"
    onMouseDown = {(event) => {
        if (event.target === event.currentTarget) {
            fecharModalSenha();
        }
    }
}
                >
    <section
                        className="password-modal"
role = "dialog"
aria-modal="true"
aria-labelledby="password-modal-title"
    >
    <div className="password-modal-header" >
        <div>
        <span className="section-label" >
            SEGURANÇA
            </span>
            < h2 id = "password-modal-title" >
                Alterar senha
                    </h2>
                    <p>
                                    Confirme sua senha atual e cadastre uma nova senha de acesso.
                                </p>
    </div>

    < button
type = "button"
className = "password-modal-close"
onClick = { fecharModalSenha }
disabled = { alterandoSenha }
aria-label="Fechar"
    >
                                ×
</button>
    </div>

{
    erroSenha && (
        <div className="password-feedback error" >
        { erroSenha }
            </div>
                        )
}

{
    sucessoSenha && (
        <div className="password-feedback success" >
        { sucessoSenha }
            </div>
                        )
}

{
    !sucessoSenha && (
        <>
        <div className="password-fields" >
            <label>
            <span>Senha atual </span>
                < input
    type = "password"
    value = { senhaAtual }
    onChange = {(event) =>
    setSenhaAtual(event.target.value)
}
autoComplete = "current-password"
placeholder = "Digite sua senha atual"
    />
    </label>

    < label >
    <span>Nova senha </span>
        < input
type = "password"
value = { novaSenha }
onChange = {(event) =>
setNovaSenha(event.target.value)
                                            }
autoComplete = "new-password"
placeholder = "Digite sua nova senha"
    />
    </label>

    < label >
    <span>Confirmar nova senha </span>
        < input
type = "password"
value = { confirmarNovaSenha }
onChange = {(event) =>
setConfirmarNovaSenha(event.target.value)
                                            }
autoComplete = "new-password"
placeholder = "Repita sua nova senha"
    />
    </label>
    </div>

    < p className = "password-rule" >
        Use de 8 a 100 caracteres, com letra maiúscula, minúscula, número e caractere especial.
                                </p>
            </>
                        )}

<div className="password-modal-actions" >
    <button
                                type="button"
className = "password-cancel-button"
onClick = { fecharModalSenha }
disabled = { alterandoSenha }
    >
{ sucessoSenha? "Fechar": "Cancelar" }
    </button>

{
    !sucessoSenha && (
        <button
                                    type="button"
    className = "password-confirm-button"
    onClick = { alterarSenha }
    disabled = { alterandoSenha }
        >
    {
        alterandoSenha
        ? "Alterando..."
            : "Alterar senha"
    }
        </button>
                            )
}
</div>
    </section>
    </div>
            )}
</main>
    );
}

export default Perfil;