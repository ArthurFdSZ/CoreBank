import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

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

type Movimentacao = {
    id: number;
    type: string;
    amount: number;
    description: string;
    relatedAccountId: number | null;
    createdAt: string;
};

type Extrato = {
    accountId: number;
    agency: string;
    number: string;
    balance: number;
    status: string;
    transactions: Movimentacao[];
};

function Dashboard() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [conta, setConta] = useState<Conta | null>(null);
    const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const [saldoVisivel, setSaldoVisivel] = useState(true);
    const [sidebarRecolhida, setSidebarRecolhida] = useState(false);

    function formatarMoeda(valor: number) {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valor);
    }

    function obterUsuarioSalvo() {
        const usuarioSalvo = sessionStorage.getItem(
            "corebank_usuario"
        );

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

    async function carregarDashboard() {
        const token = sessionStorage.getItem(
            "corebank_token"
        );

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
            const headers = {
                Authorization: `Bearer ${token}`,
            };

            const [
                respostaConta,
                respostaExtrato,
            ] = await Promise.all([
                fetch(
                    "https://localhost:7122/api/Accounts/me",
                    {
                        headers,
                    }
                ),
                fetch(
                    "https://localhost:7122/api/Accounts/me/statement",
                    {
                        headers,
                    }
                ),
            ]);

            if (
                respostaConta.status === 401 ||
                respostaConta.status === 403 ||
                respostaExtrato.status === 401 ||
                respostaExtrato.status === 403
            ) {
                limparSessao();

                navigate("/login", {
                    replace: true,
                });

                return;
            }

            if (!respostaConta.ok) {
                if (respostaConta.status === 404) {
                    setErro(
                        "Você ainda não possui uma conta bancária vinculada ao seu cadastro."
                    );

                    return;
                }

                throw new Error();
            }

            const dadosConta =
                (await respostaConta.json()) as Conta;

            setConta(dadosConta);

            if (respostaExtrato.ok) {
                const dadosExtrato =
                    (await respostaExtrato.json()) as Extrato;

                setMovimentacoes(
                    dadosExtrato.transactions ?? []
                );
            }
        } catch {
            setErro(
                "Não foi possível carregar os dados da sua conta."
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarDashboard();
    }, []);

    function movimentacaoEhEntrada(tipo: string) {
        return (
            tipo === "Depósito" ||
            tipo === "Transferência recebida"
        );
    }

    function obterIconeMovimentacao(tipo: string) {
        return movimentacaoEhEntrada(tipo)
            ? "↓"
            : "↑";
    }

    if (carregando) {
        return (
            <main className="dashboard-loading">
                <strong>CoreBank</strong>

                <p>
                    Carregando sua conta...
                </p>
            </main>
        );
    }

    return (
        <main
            className={`dashboard-page ${sidebarRecolhida
                    ? "sidebar-collapsed"
                    : ""
                }`}
        >
            {/* SIDEBAR */}
            <aside className="dashboard-sidebar">
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
                        {sidebarRecolhida
                            ? "›"
                            : "‹"}
                    </button>
                </div>

                <nav className="dashboard-nav">
                    <button
                        type="button"
                        className="nav-item active"
                        title="Início"
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
                        title="Transações"
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
                        title="Extrato"
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
                        title="Solicitações"
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
                        className="nav-item"
                        title="Perfil"
                        onClick={() =>
                            navigate("/perfil")
                        }
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
                        title="Sair"
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
            <section className="dashboard-content">
                <header className="dashboard-header">
                    <div className="welcome-area">
                        <span className="section-label">
                            VISÃO GERAL
                        </span>

                        <h1>
                            Olá
                            {usuario?.nome
                                ? `, ${usuario.nome.split(
                                    " "
                                )[0]}`
                                : ""}
                            .
                        </h1>

                        <p>
                            Aqui está um resumo da sua
                            conta hoje.
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
                                .toUpperCase() ??
                                "C"}
                        </div>
                    </div>
                </header>

                {erro ? (
                    <section className="dashboard-error">
                        <div className="error-icon">
                            !
                        </div>

                        <div>
                            <strong>
                                Não foi possível exibir
                                sua conta
                            </strong>

                            <p>
                                {erro}
                            </p>
                        </div>
                    </section>
                ) : (
                    <>
                        {/* RESUMO SUPERIOR */}
                        <section className="dashboard-summary">
                            <article className="balance-card">
                                <div className="card-header-row">
                                    <span className="section-label">
                                        SALDO DISPONÍVEL
                                    </span>

                                    <span
                                        className={`account-status ${conta?.status ===
                                                "Ativa"
                                                ? "active"
                                                : "blocked"
                                            }`}
                                    >
                                        <span></span>

                                        {conta?.status}
                                    </span>
                                </div>

                                <div className="balance-row">
                                    <strong>
                                        {saldoVisivel
                                            ? formatarMoeda(
                                                conta?.balance ??
                                                0
                                            )
                                            : "R$ ••••••"}
                                    </strong>

                                    <button
                                        type="button"
                                        className="visibility-button"
                                        onClick={() =>
                                            setSaldoVisivel(
                                                !saldoVisivel
                                            )
                                        }
                                        title={
                                            saldoVisivel
                                                ? "Ocultar saldo"
                                                : "Mostrar saldo"
                                        }
                                    >
                                        {saldoVisivel
                                            ? "◉"
                                            : "○"}
                                    </button>
                                </div>

                                <div className="account-details">
                                    <div>
                                        <span>
                                            Agência
                                        </span>

                                        <strong>
                                            {conta?.agency}
                                        </strong>
                                    </div>

                                    <div className="details-divider"></div>

                                    <div>
                                        <span>
                                            Conta
                                        </span>

                                        <strong>
                                            {conta?.number}
                                        </strong>
                                    </div>
                                </div>

                                <div className="balance-wave wave-one"></div>
                                <div className="balance-wave wave-two"></div>
                            </article>

                            <article className="summary-card">
                                <div className="summary-card-top">
                                    <span className="section-label">
                                        CONTA
                                    </span>

                                    <div className="summary-icon">
                                        ▣
                                    </div>
                                </div>

                                <strong className="summary-main-value">
                                    {conta?.status ??
                                        "Não informado"}
                                </strong>

                                <div className="summary-progress">
                                    <span></span>
                                </div>

                                <div className="summary-bottom">
                                    <span>
                                        Agência
                                    </span>

                                    <strong>
                                        {conta?.agency}
                                    </strong>
                                </div>
                            </article>

                            <article className="summary-card">
                                <div className="summary-card-top">
                                    <span className="section-label">
                                        RESUMO
                                    </span>

                                    <div className="summary-icon">
                                        ↗
                                    </div>
                                </div>

                                <strong className="summary-main-value">
                                    {movimentacoes.length}
                                </strong>

                                <div className="summary-description">
                                    movimentações registradas
                                </div>

                                <div className="summary-bottom">
                                    <span>
                                        Conta
                                    </span>

                                    <strong>
                                        {conta?.number}
                                    </strong>
                                </div>
                            </article>
                        </section>

                        {/* ÁREA PRINCIPAL */}
                        <section className="dashboard-main-grid">
                            <article className="quick-actions-card">
                                <div className="card-title">
                                    <h2>
                                        Ações rápidas
                                    </h2>

                                    <p>
                                        Realize suas operações
                                        de forma rápida e
                                        segura.
                                    </p>
                                </div>

                                <div className="quick-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                "/transacoes"
                                            )
                                        }
                                    >
                                        <span className="quick-icon">
                                            ↓
                                        </span>

                                        <strong>
                                            Depositar
                                        </strong>

                                        <small>
                                            Adicione dinheiro
                                            à sua conta
                                        </small>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                "/transacoes"
                                            )
                                        }
                                    >
                                        <span className="quick-icon">
                                            ↑
                                        </span>

                                        <strong>
                                            Sacar
                                        </strong>

                                        <small>
                                            Retire dinheiro
                                            da sua conta
                                        </small>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                "/transacoes"
                                            )
                                        }
                                    >
                                        <span className="quick-icon">
                                            ⇄
                                        </span>

                                        <strong>
                                            Transferir
                                        </strong>

                                        <small>
                                            Envie dinheiro
                                            para outra conta
                                        </small>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                "/extrato"
                                            )
                                        }
                                    >
                                        <span className="quick-icon">
                                            ▤
                                        </span>

                                        <strong>
                                            Ver extrato
                                        </strong>

                                        <small>
                                            Visualize todas
                                            as movimentações
                                        </small>
                                    </button>
                                </div>
                            </article>

                            {/* ÚLTIMAS MOVIMENTAÇÕES */}
                            <article className="recent-card">
                                <div className="recent-header">
                                    <h2>
                                        Últimas movimentações
                                    </h2>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                "/extrato"
                                            )
                                        }
                                    >
                                        Ver todas
                                        <span>
                                            →
                                        </span>
                                    </button>
                                </div>

                                <div className="recent-list">
                                    {movimentacoes.length ===
                                        0 ? (
                                        <div className="empty-state">
                                            <span>
                                                ⇄
                                            </span>

                                            <strong>
                                                Nenhuma
                                                movimentação
                                            </strong>

                                            <p>
                                                Suas
                                                movimentações
                                                aparecerão
                                                aqui.
                                            </p>
                                        </div>
                                    ) : (
                                        movimentacoes
                                            .slice(0, 4)
                                            .map(
                                                (
                                                    movimentacao
                                                ) => {
                                                    const entrada =
                                                        movimentacaoEhEntrada(
                                                            movimentacao.type
                                                        );

                                                    return (
                                                        <div
                                                            className="transaction-item"
                                                            key={
                                                                movimentacao.id
                                                            }
                                                        >
                                                            <div
                                                                className={`transaction-icon ${entrada
                                                                        ? "income"
                                                                        : "expense"
                                                                    }`}
                                                            >
                                                                {obterIconeMovimentacao(
                                                                    movimentacao.type
                                                                )}
                                                            </div>

                                                            <div className="transaction-info">
                                                                <strong>
                                                                    {
                                                                        movimentacao.type
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    {
                                                                        movimentacao.description
                                                                    }
                                                                </span>
                                                            </div>

                                                            <div className="transaction-date">
                                                                {
                                                                    movimentacao.createdAt
                                                                }
                                                            </div>

                                                            <div
                                                                className={`transaction-amount ${entrada
                                                                        ? "income"
                                                                        : "expense"
                                                                    }`}
                                                            >
                                                                {entrada
                                                                    ? "+"
                                                                    : "-"}{" "}
                                                                {formatarMoeda(
                                                                    movimentacao.amount
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )
                                    )}
                                </div>
                            </article>
                        </section>
                    </>
                )}
            </section>
        </main>
    );
}

export default Dashboard;