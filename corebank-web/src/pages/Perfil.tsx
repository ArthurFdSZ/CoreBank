import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Perfil.css";

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

function Perfil() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [conta, setConta] = useState<Conta | null>(null);

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const [sidebarRecolhida, setSidebarRecolhida] =
        useState(false);

    function obterUsuarioSalvo() {
        const usuarioSalvo =
            sessionStorage.getItem("corebank_usuario");

        if (!usuarioSalvo) {
            return null;
        }

        try {
            return JSON.parse(usuarioSalvo) as Usuario;
        } catch {
            return null;
        }
    }

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
        const token =
            sessionStorage.getItem("corebank_token");

        const usuarioAtual = obterUsuarioSalvo();

        if (!token || !usuarioAtual) {
            limparSessao();

            navigate("/login", {
                replace: true,
            });

            return;
        }

        setUsuario(usuarioAtual);
        setCarregando(true);
        setErro("");

        try {
            const resposta = await fetch(
                "https://localhost:7122/api/Accounts/me",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
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
                throw new Error();
            }

            const dados =
                (await resposta.json()) as Conta;

            setConta(dados);
        } catch {
            setErro(
                "Não foi possível carregar todos os dados da sua conta."
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarPerfil();
    }, []);

    if (carregando) {
        return (
            <main className="perfil-loading">
                <strong>CoreBank</strong>

                <p>Carregando seu perfil...</p>
            </main>
        );
    }

    return (
        <main
            className={`perfil-page ${sidebarRecolhida
                    ? "sidebar-collapsed"
                    : ""
                }`}
        >
            {/* SIDEBAR */}
            <aside className="perfil-sidebar">
                <div className="sidebar-header">
                    <strong className="corebank-logo">
                        <span className="corebank-core">
                            Core
                        </span>

                        <span className="corebank-bank">
                            Bank
                        </span>
                    </strong>

                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={() =>
                            setSidebarRecolhida(
                                !sidebarRecolhida
                            )
                        }
                        title={
                            sidebarRecolhida
                                ? "Expandir menu"
                                : "Recolher menu"
                        }
                    >
                        {sidebarRecolhida ? "›" : "‹"}
                    </button>
                </div>

                <nav className="perfil-nav">
                    <button
                        type="button"
                        className="nav-item"
                        onClick={() =>
                            navigate("/dashboard")
                        }
                    >
                        <span className="nav-icon">
                            ◆
                        </span>

                        <span className="nav-text">
                            Início
                        </span>
                    </button>

                    <button
                        type="button"
                        className="nav-item"
                        onClick={() =>
                            navigate("/transacoes")
                        }
                    >
                        <span className="nav-icon">
                            ➤
                        </span>

                        <span className="nav-text">
                            Transações
                        </span>
                    </button>

                    <button
                        type="button"
                        className="nav-item"
                        onClick={() =>
                            navigate("/extrato")
                        }
                    >
                        <span className="nav-icon">
                            ▤
                        </span>

                        <span className="nav-text">
                            Extrato
                        </span>
                    </button>

                    <button
                        type="button"
                        className="nav-item"
                        onClick={() =>
                            navigate("/solicitacoes")
                        }
                    >
                        <span className="nav-icon">
                            ◇
                        </span>

                        <span className="nav-text">
                            Solicitações
                        </span>
                    </button>

                    <button
                        type="button"
                        className="nav-item active"
                    >
                        <span className="nav-icon">
                            ♙
                        </span>

                        <span className="nav-text">
                            Perfil
                        </span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="security-box">
                        <span className="security-icon">
                            ✓
                        </span>

                        <div className="security-text">
                            <strong>
                                Ambiente seguro
                            </strong>

                            <small>
                                Sessão protegida
                            </small>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        <span className="logout-icon">
                            ↪
                        </span>

                        <span className="nav-text">
                            Sair
                        </span>
                    </button>
                </div>
            </aside>

            {/* CONTEÚDO */}
            <section className="perfil-content">
                <header className="perfil-header">
                    <div>
                        <span className="section-label">
                            MINHA CONTA
                        </span>

                        <h1>Perfil</h1>

                        <p>
                            Consulte seus dados pessoais e
                            informações da conta.
                        </p>
                    </div>

                    <div className="header-user">
                        <div className="header-user-info">
                            <strong>
                                {usuario?.nome ??
                                    "Cliente CoreBank"}
                            </strong>

                            <span>
                                {usuario?.email}
                            </span>
                        </div>

                        <div className="user-avatar">
                            {usuario?.nome
                                ?.charAt(0)
                                .toUpperCase() ?? "C"}
                        </div>
                    </div>
                </header>

                {erro && (
                    <div className="perfil-message error">
                        <span>!</span>

                        <p>{erro}</p>
                    </div>
                )}

                {/* CARD PRINCIPAL */}
                <section className="perfil-hero-card">
                    <div className="perfil-avatar">
                        {usuario?.nome
                            ?.charAt(0)
                            .toUpperCase() ?? "C"}
                    </div>

                    <div className="perfil-hero-info">
                        <span className="section-label">
                            CLIENTE COREBANK
                        </span>

                        <h2>
                            {usuario?.nome ??
                                "Cliente CoreBank"}
                        </h2>

                        <p>{usuario?.email}</p>
                    </div>

                    <div
                        className={`perfil-status ${conta?.status === "Ativa"
                                ? "active"
                                : ""
                            }`}
                    >
                        <span></span>

                        {conta?.status ??
                            "Status não informado"}
                    </div>

                    <div className="perfil-decoration decoration-one"></div>
                    <div className="perfil-decoration decoration-two"></div>
                </section>

                {/* CARDS */}
                <section className="perfil-grid">
                    {/* DADOS PESSOAIS */}
                    <article className="perfil-card">
                        <div className="perfil-card-header">
                            <div>
                                <span className="section-label">
                                    INFORMAÇÕES
                                </span>

                                <h2>Dados pessoais</h2>

                                <p>
                                    Informações vinculadas ao
                                    seu cadastro CoreBank.
                                </p>
                            </div>

                            <div className="perfil-card-icon">
                                ♙
                            </div>
                        </div>

                        <div className="perfil-data-list">
                            <div className="perfil-data-row">
                                <span>Nome completo</span>

                                <strong>
                                    {usuario?.nome ??
                                        "Não informado"}
                                </strong>
                            </div>

                            <div className="perfil-data-row">
                                <span>E-mail</span>

                                <strong>
                                    {usuario?.email ??
                                        "Não informado"}
                                </strong>
                            </div>

                            <div className="perfil-data-row">
                                <span>CPF</span>

                                <strong>
                                    Não disponível
                                </strong>
                            </div>

                            <div className="perfil-data-row">
                                <span>Tipo de acesso</span>

                                <strong>
                                    {usuario?.perfil ===
                                        "Cliente"
                                        ? "Cliente"
                                        : usuario?.perfil ??
                                        "Cliente"}
                                </strong>
                            </div>
                        </div>
                    </article>

                    {/* DADOS DA CONTA */}
                    <article className="perfil-card">
                        <div className="perfil-card-header">
                            <div>
                                <span className="section-label">
                                    CONTA BANCÁRIA
                                </span>

                                <h2>Dados da conta</h2>

                                <p>
                                    Informações da sua conta
                                    CoreBank.
                                </p>
                            </div>

                            <div className="perfil-card-icon">
                                ▣
                            </div>
                        </div>

                        <div className="perfil-data-list">
                            <div className="perfil-data-row">
                                <span>Agência</span>

                                <strong>
                                    {conta?.agency ??
                                        "Não informado"}
                                </strong>
                            </div>

                            <div className="perfil-data-row">
                                <span>Número da conta</span>

                                <strong>
                                    {conta?.number ??
                                        "Não informado"}
                                </strong>
                            </div>

                            <div className="perfil-data-row">
                                <span>Status</span>

                                <strong
                                    className={
                                        conta?.status ===
                                            "Ativa"
                                            ? "text-active"
                                            : ""
                                    }
                                >
                                    {conta?.status ??
                                        "Não informado"}
                                </strong>
                            </div>

                            <div className="perfil-data-row">
                                <span>Cliente desde</span>

                                <strong>
                                    {formatarData(
                                        conta?.createdAt
                                    )}
                                </strong>
                            </div>
                        </div>
                    </article>

                    {/* SEGURANÇA */}
                    <article className="perfil-card security-card">
                        <div className="perfil-card-header">
                            <div>
                                <span className="section-label">
                                    SEGURANÇA
                                </span>

                                <h2>Acesso e segurança</h2>

                                <p>
                                    Gerencie a segurança da
                                    sua sessão.
                                </p>
                            </div>

                            <div className="perfil-card-icon">
                                ✓
                            </div>
                        </div>

                        <div className="security-actions">
                            <div className="security-action">
                                <div>
                                    <strong>Senha</strong>

                                    <span>
                                        Protege o acesso à sua
                                        conta CoreBank.
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="secondary-button"
                                    disabled
                                    title="Funcionalidade preparada para uma próxima evolução"
                                >
                                    Alterar senha
                                </button>
                            </div>

                            <div className="security-divider"></div>

                            <div className="security-action">
                                <div>
                                    <strong>
                                        Encerrar sessão
                                    </strong>

                                    <span>
                                        Finalize seu acesso
                                        neste dispositivo.
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="logout-profile-button"
                                    onClick={handleLogout}
                                >
                                    Sair da conta
                                </button>
                            </div>
                        </div>
                    </article>
                </section>
            </section>
        </main>
    );
}

export default Perfil;