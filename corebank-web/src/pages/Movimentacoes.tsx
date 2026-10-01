import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Movimentacoes.css";

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

function Movimentacoes() {
    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState<Usuario | null>(null);

    const [conta, setConta] =
        useState<Conta | null>(null);

    const [movimentacoes, setMovimentacoes] =
        useState<Movimentacao[]>([]);

    const [carregando, setCarregando] =
        useState(true);

    const [erro, setErro] =
        useState("");

    const [saldoVisivel, setSaldoVisivel] =
        useState(true);

    const [sidebarRecolhida, setSidebarRecolhida] =
        useState(false);

    function formatarMoeda(valor: number) {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valor);
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

    async function carregarDados() {
        const token =
            sessionStorage.getItem(
                "corebank_token"
            );

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
        setErro("");

        try {
            const headers = {
                Authorization:
                    `Bearer ${token}`,
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
                throw new Error(
                    "Não foi possível carregar sua conta."
                );
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
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : "Não foi possível carregar os dados."
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarDados();
    }, []);

    function movimentacaoEhEntrada(
        tipo: string
    ) {
        return (
            tipo === "Depósito" ||
            tipo === "Transferência recebida"
        );
    }

    if (carregando) {
        return (
            <main className= "mov-loading" >
            <strong>
            CoreBank
            </strong>

            <p>
                    Carregando movimentações...
        </p>
            </main>
        );
    }

    return (
        <main
            className= {`mov-page ${sidebarRecolhida
                ? "sidebar-collapsed"
                : ""
            }`
}
        >
    <aside className="mov-sidebar" >
        <div className="sidebar-header" >
            <strong className="corebank-logo" >
                CoreBank
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
{
    sidebarRecolhida
    ? "›"
        : "‹"
}
    </button>
    </div>

    < nav className = "mov-nav" >
        <button
                        type="button"
className = "nav-item"
onClick = {() =>
navigate(
    "/dashboard"
)
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
                            ⇄
</span>

    < span className = "nav-text" >
        Movimentações
        </span>
        </button>

        < button
type = "button"
className = "nav-item"
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
navigate(
    "/transacoes"
)
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

        < section className = "mov-content" >
            <header className="mov-header" >
                <div>
                <span className="section-label" >
                    MOVIMENTAÇÕES
                    </span>

                    <h1>
Movimentações
    </h1>

    <p>
Acompanhe as movimentações
                            realizadas na sua conta.
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
    erro && (
        <div className="mov-message error" >
            <span>!</span>

            <p>
    { erro }
    </p>
        </div>
                )
}

<section className="mov-account-grid" >
    <article className="mov-balance-card" >
        <div className="balance-top" >
            <span className="section-label" >
                SALDO DISPONÍVEL
                    </span>

                    < span
className = {`account-status ${conta?.status ===
        "Ativa"
        ? "active"
        : "blocked"
    }`}
                            >
    <span></span>

{ conta?.status }
</span>
    </div>

    < div className = "balance-value" >
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
title = {
    saldoVisivel
    ? "Ocultar saldo"
        : "Mostrar saldo"
}
    >
{
    saldoVisivel
    ? "◉"
        : "○"
}
    </button>
    </div>

    < div className = "balance-details" >
        <div>
        <span>
        Agência
        </span>

        <strong>
{ conta?.agency }
</strong>
    </div>

    < div className = "detail-divider" > </div>

        < div >
        <span>
        Conta
        </span>

        <strong>
{ conta?.number }
</strong>
    </div>
    </div>

    < div className = "balance-line line-one" > </div>
        < div className = "balance-line line-two" > </div>
            </article>

            < article className = "mov-account-card" >
                <div className="account-card-header" >
                    <span className="section-label" >
                        CONTA
                        </span>

                        < div className = "account-icon" >
                                ▣
</div>
    </div>

    < div className = "account-information" >
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

    < strong
className = {
    conta?.status ===
    "Ativa"
    ? "status-green"
    : "status-red"
                                    }
                                >
                                    ● { conta?.status }
</strong>
    </div>
    </div>
    </article>
    </section>

    < section className = "mov-history-card" >
        <div className="history-header" >
            <div>
            <h2>
            Movimentações recentes
                </h2>

                <p>
                                Últimas operações
                                realizadas na sua conta.
                            </p>
    </div>

    < button type = "button" >
        Ver todas →
</button>
    </div>

{
    movimentacoes.length === 0 ? (
        <div className= "history-empty" >
        <span>
                                ⇄
    </span>

        <strong>
                                Nenhuma movimentação
        </strong>

        <p>
                                Suas movimentações
                                aparecerão aqui.
                            </p>
        </div>
                    ) : (
        <div className= "history-table-wrapper" >
        <table className="history-table" >
            <thead>
            <tr>
            <th>
            DATA E HORA
                </th>

                <th>
    TIPO
        </th>

        <th>
    DESCRIÇÃO
        </th>

        <th>
    VALOR
        </th>
        </tr>
        </thead>

        <tbody>
    {
        movimentacoes
            .slice(0, 5)
        .map(
            (
                movimentacao
            ) => {
                const entrada =
                    movimentacaoEhEntrada(
                        movimentacao.type
                    );

                return (
                    <tr
                                                        key= {
                        movimentacao.id
                    }
                    >
                    <td>
                    {
                        movimentacao.createdAt
                    }
                    </td>

                    < td >
                    <span
                                                                className={
                    `transaction-type ${entrada
                        ? "income"
                        : "expense"
                    }`
                }
                                                            >
                {
                    entrada
                    ? "↓"
                        : "↑"
                }{ " " }
                {
                    movimentacao.type
                }
                </span>
                    </td>

                    <td>
                {
                    movimentacao.description
                }
                </td>

                    < td >
                    <strong
                                                                className={
                    `transaction-value ${entrada
                        ? "income"
                        : "expense"
                    }`
                }
                                                            >
                {
                    entrada
                    ? "+"
                        : "-"
                }{ " " }
                {
                    formatarMoeda(
                        movimentacao.amount
                    )
                }
                </strong>
                    </td>
                    </tr>
                                                );
    }
                                        )
}
</tbody>
    </table>
    </div>
                    )}
</section>
    </section>
    </main>
    );
}

export default Movimentacoes;