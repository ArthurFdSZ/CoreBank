import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type MovimentacaoDia = {
    data: string;
    depositos: number;
    saques: number;
    transferencias: number;
};

type UltimaSolicitacao = {
    solicitacaoId: number;
    tipo: string;
    status: string;
    clienteId: number | null;
    nomeCliente: string | null;
    contaId: number;
    agencia: string;
    numeroConta: string;
    dataSolicitacao: string;
};

type UltimoCliente = {
    id: number;
    nome: string;
    email: string;
    cpf: string;
    dataCadastro: string;
};

type DashboardResponse = {
    totalClientes: number;
    totalContas: number;
    saldoTotal: number;
    solicitacoesPendentes: number;

    tiposSolicitacoesPendentes: {
        bloqueios: number;
        desbloqueios: number;
        outros: number;
    };

    movimentacoesUltimos7Dias: MovimentacaoDia[];
    ultimasSolicitacoes: UltimaSolicitacao[];
    ultimosClientes: UltimoCliente[];
};

type SolicitacaoSenha = {
    solicitacaoId: number;
    clienteId?: number;
    nomeCliente?: string;
    emailCliente?: string;
    status: string;
    dataSolicitacao?: string;
};

type SerieGrafico = {
    nome: string;
    classe: "deposito" | "saque" | "transferencia";
    valores: number[];
};

function AdminDashboard() {
    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState<Usuario | null>(null);

    const [dashboard, setDashboard] =
        useState<DashboardResponse | null>(null);

    const [
        solicitacoesSenha,
        setSolicitacoesSenha,
    ] = useState<SolicitacaoSenha[]>([]);

    const [carregando, setCarregando] =
        useState(true);

    const [erro, setErro] =
        useState("");

    const [sidebarRecolhida, setSidebarRecolhida] =
        useState(false);

    // =========================================================
    // SESSÃO
    // =========================================================

    function obterToken() {
        return sessionStorage.getItem(
            "corebank_token"
        );
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

    function sessaoExpirada() {
        limparSessao();

        navigate("/login", {
            replace: true,
        });
    }

    function obterHeaders() {
        const token = obterToken();

        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    }

    // =========================================================
    // CARREGAMENTO
    // =========================================================

    async function carregarDadosDashboard() {
        const response = await fetch(
            "https://localhost:7122/api/Admin/dashboard",
            {
                headers: obterHeaders(),
            }
        );

        if (
            response.status === 401 ||
            response.status === 403
        ) {
            sessaoExpirada();
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Não foi possível carregar o Dashboard administrativo."
            );
        }

        const data =
            (await response.json()) as DashboardResponse;

        setDashboard(data);
    }

    async function carregarSolicitacoesSenha() {
        const response = await fetch(
            "https://localhost:7122/api/Admin/password-reset-requests/pending",
            {
                headers: obterHeaders(),
            }
        );

        if (
            response.status === 401 ||
            response.status === 403
        ) {
            sessaoExpirada();
            return;
        }

        if (!response.ok) {
            setSolicitacoesSenha([]);
            return;
        }

        const data =
            (await response.json()) as
            SolicitacaoSenha[];

        setSolicitacoesSenha(data);
    }

    async function carregarDashboard() {
        const token = obterToken();
        const usuarioAtual =
            obterUsuarioSalvo();

        if (!token || !usuarioAtual) {
            sessaoExpirada();
            return;
        }

        const perfil =
            usuarioAtual.perfil
                ?.toLowerCase();

        if (
            perfil !== "admin" &&
            perfil !== "administrador"
        ) {
            navigate("/dashboard", {
                replace: true,
            });

            return;
        }

        setUsuario(usuarioAtual);
        setCarregando(true);
        setErro("");

        try {
            await Promise.all([
                carregarDadosDashboard(),
                carregarSolicitacoesSenha(),
            ]);
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : "Não foi possível carregar os dados administrativos."
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarDashboard();
    }, []);

    // =========================================================
    // FORMATAÇÕES
    // =========================================================

    function formatarMoeda(valor: number) {
        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
            }
        ).format(valor);
    }

    function formatarCpf(cpf: string) {
        const somenteNumeros =
            cpf?.replace(/\D/g, "") ?? "";

        if (somenteNumeros.length !== 11) {
            return cpf;
        }

        return somenteNumeros.replace(
            /(\d{3})(\d{3})(\d{3})(\d{2})/,
            "$1.$2.$3-$4"
        );
    }

    function obterClasseStatus(status: string) {
        const valor =
            status?.toLowerCase();

        if (
            valor === "aprovada" ||
            valor === "aprovado"
        ) {
            return "approved";
        }

        if (
            valor === "rejeitada" ||
            valor === "rejeitado" ||
            valor === "recusada" ||
            valor === "recusado"
        ) {
            return "rejected";
        }

        return "pending";
    }

    // =========================================================
    // SOLICITAÇÕES
    // =========================================================

    const totalPendencias =
        (dashboard?.solicitacoesPendentes ?? 0) +
        solicitacoesSenha.length;

    const totalBloqueios =
        dashboard
            ?.tiposSolicitacoesPendentes
            .bloqueios ?? 0;

    const totalDesbloqueios =
        dashboard
            ?.tiposSolicitacoesPendentes
            .desbloqueios ?? 0;

    const totalSenhas =
        solicitacoesSenha.length;

    const totalGraficoSolicitacoes =
        totalBloqueios +
        totalDesbloqueios +
        totalSenhas;

    const percentualBloqueios =
        totalGraficoSolicitacoes > 0
            ? (
                totalBloqueios /
                totalGraficoSolicitacoes
            ) * 100
            : 0;

    const percentualDesbloqueios =
        totalGraficoSolicitacoes > 0
            ? (
                totalDesbloqueios /
                totalGraficoSolicitacoes
            ) * 100
            : 0;

    const graficoCircular = {
        background:
            totalGraficoSolicitacoes === 0
                ? "rgba(255,255,255,0.08)"
                : `conic-gradient(
                    #f2c94c 0% ${percentualBloqueios}%,
                    #4f8cff ${percentualBloqueios}% ${percentualBloqueios +
                percentualDesbloqueios
                }%,
                    #9b6cff ${percentualBloqueios +
                percentualDesbloqueios
                }% 100%
                )`,
    };

    // =========================================================
    // GRÁFICO EM LINHAS
    // =========================================================

    const seriesGrafico =
        useMemo<SerieGrafico[]>(() => {
            const movimentacoes =
                dashboard
                    ?.movimentacoesUltimos7Dias ??
                [];

            return [
                {
                    nome: "Depósitos",
                    classe: "deposito",
                    valores: movimentacoes.map(
                        (item) => item.depositos
                    ),
                },
                {
                    nome: "Saques",
                    classe: "saque",
                    valores: movimentacoes.map(
                        (item) => item.saques
                    ),
                },
                {
                    nome: "Transferências",
                    classe: "transferencia",
                    valores: movimentacoes.map(
                        (item) =>
                            item.transferencias
                    ),
                },
            ];
        }, [dashboard]);

    const maiorMovimentacao =
        useMemo(() => {
            const valores =
                seriesGrafico.flatMap(
                    (serie) => serie.valores
                );

            return Math.max(
                1,
                ...valores
            );
        }, [seriesGrafico]);

    const larguraGrafico = 700;
    const alturaGrafico = 220;

    const paddingHorizontal = 18;
    const paddingSuperior = 18;
    const paddingInferior = 18;

    function obterPontosGrafico(
        valores: number[]
    ) {
        if (valores.length === 0) {
            return [];
        }

        const larguraUtil =
            larguraGrafico -
            paddingHorizontal * 2;

        const alturaUtil =
            alturaGrafico -
            paddingSuperior -
            paddingInferior;

        return valores.map(
            (valor, indice) => {
                const divisor =
                    Math.max(
                        valores.length - 1,
                        1
                    );

                const x =
                    paddingHorizontal +
                    (indice / divisor) *
                    larguraUtil;

                const y =
                    paddingSuperior +
                    alturaUtil -
                    (valor /
                        maiorMovimentacao) *
                    alturaUtil;

                return {
                    x,
                    y,
                    valor,
                };
            }
        );
    }

    function gerarPolyline(
        valores: number[]
    ) {
        return obterPontosGrafico(
            valores
        )
            .map(
                (ponto) =>
                    `${ponto.x},${ponto.y}`
            )
            .join(" ");
    }

    // =========================================================
    // LOADING
    // =========================================================

    if (carregando) {
        return (
            <main className= "admin-loading" >
            <strong>
            CoreBank
            </strong>

            <p>
                    Carregando painel administrativo...
        </p>
            </main>
        );
    }

    return (
        <main
            className= {`admin-page ${sidebarRecolhida
            ? "admin-sidebar-collapsed"
            : ""
            }`
}
        >
{/* SIDEBAR */ }
    < aside className = "admin-sidebar" >
        <div className="admin-sidebar-header" >
            <strong className="admin-logo" >
                <span className="admin-logo-core" >
                    Core
                    </span>

                    < span className = "admin-logo-bank" >
                        Bank
                        </span>
                        </strong>

                        < button
type = "button"
className = "admin-sidebar-toggle"
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

    < div className = "admin-profile-label" >
        <span className="admin-nav-text" >
            ADMINISTRAÇÃO
            </span>
            </div>

            < nav className = "admin-nav" >
                <button
                        type="button"
className = "admin-nav-item active"
onClick = {() => navigate("/admin")}
    >
    <span className="admin-nav-icon" >
                            ◆
</span>

    < span className = "admin-nav-text" >
        Dashboard
        </span>
        </button>

        < button
type = "button"
className = "admin-nav-item"
onClick = {() => navigate("/admin/clientes")}
    >
    <span className="admin-nav-icon" >
                            ♙
</span>

    < span className = "admin-nav-text" >
        Clientes
        </span>
        </button>

        < button
type = "button"
className = "admin-nav-item"
onClick = {() => navigate("/admin/contas")}
    >
    <span className="admin-nav-icon" >
                            ▣
</span>

    < span className = "admin-nav-text" >
        Contas
        </span>
        </button>

        < button
type = "button"
className = "admin-nav-item"
onClick = {() => navigate("/admin/solicitacoes")}
    >
    <span className="admin-nav-icon" >
                            ◇
</span>

    < span className = "admin-nav-text" >
        Solicitações
        </span>

{
    totalPendencias > 0 && (
        <span className="admin-nav-badge" >
        { totalPendencias }
            </span>
                        )
}
</button>

    < button
type = "button"
className = "admin-nav-item"

onClick = {() => navigate("/admin/relatorios")}
>
    <span className="admin-nav-icon" >
                            ▤
</span>

    < span className = "admin-nav-text" >
        Relatórios
        </span>
        </button>

        < button
type = "button"
className = "admin-nav-item"

onClick = {() => navigate("/admin/perfil")}
>
    <span className="admin-nav-icon" >
                            ◉
</span>

    < span className = "admin-nav-text" >
        Perfil
        </span>
        </button>
        </nav>

        < div className = "admin-sidebar-footer" >
            <div className="admin-security-box" >
                <span className="admin-security-icon" >
                            ✓
</span>

    < div className = "admin-security-text" >
        <strong>
        Área administrativa
            </strong>

            <small>
                                Acesso protegido
    </small>
    </div>
    </div>

    < button
type = "button"
className = "admin-logout"
onClick = { handleLogout }
    >
    <span className="admin-nav-icon" >
                            ↪
</span>

    < span className = "admin-nav-text" >
        Sair
        </span>
        </button>
        </div>
        </aside>

{/* CONTEÚDO */ }
<section className="admin-content" >
    <header className="admin-header" >
        <div>
        <span className="admin-section-label" >
            PAINEL ADMINISTRATIVO
                </span>

                <h1>
Dashboard
    </h1>

    <p>
                            Visão geral das operações do CoreBank.
                        </p>
    </div>

    < div className = "admin-user" >
    <div className="admin-user-info" >
        <strong>
        { usuario?.nome ??
        "Administrador"}
</strong>

    <span>
{ usuario?.email }
</span>
    </div>

    < div className = "admin-avatar" >
    {
        usuario?.nome
                                ?.charAt(0)
                                .toUpperCase() ??
            "A"
    }
        </div>
        </div>
        </header>

{
    erro && (
        <div className="admin-error" >
            <span>!</span>

            < div >
            <strong>
            Atenção
            </strong>

            <p>
    { erro }
    </p>
        </div>
        </div>
                )
}

{/* CARDS */ }
<section className="admin-metrics" >
    <article className="admin-metric-card clients-card" >
        <div className="admin-card-glow" > </div>

            < div className = "admin-metric-heading" >
                <span>
                TOTAL DE CLIENTES
                    </span>

                    < div className = "admin-metric-icon" >
                                ♙
</div>
    </div>

    <strong>
{ dashboard?.totalClientes ?? 0 }
</strong>

    <p>
                            clientes cadastrados
    </p>
    </article>

    < article className = "admin-metric-card accounts-card" >
        <div className="admin-card-glow" > </div>

            < div className = "admin-metric-heading" >
                <span>
                TOTAL DE CONTAS
                    </span>

                    < div className = "admin-metric-icon" >
                                ▣
</div>
    </div>

    <strong>
{ dashboard?.totalContas ?? 0 }
</strong>

    <p>
                            contas no CoreBank
    </p>
    </article>

    < article className = "admin-metric-card pending-card" >
        <div className="admin-card-glow" > </div>

            < div className = "admin-metric-heading" >
                <span>
                SOLICITAÇÕES PENDENTES
                    </span>

                    < div className = "admin-metric-icon" >
                                ◇
</div>
    </div>

    <strong>
{ totalPendencias }
</strong>

    <p>
                            aguardando análise
    </p>
    </article>

    < article className = "admin-metric-card balance-card" >
        <div className="admin-card-glow" > </div>

            < div className = "admin-metric-heading" >
                <span>
                SALDO TOTAL EM CONTAS
                    </span>

                    < div className = "admin-metric-icon" >
                        $
                        </div>
                        </div>

                        < strong className = "admin-money-value" >
                        {
                            formatarMoeda(
                                dashboard?.saldoTotal ??
                            0
                            )}
</strong>

    <p>
                            patrimônio total dos clientes
    </p>
    </article>
    </section>

{/* GRÁFICOS */ }
<section className="admin-charts-grid" >
    <article className="admin-dashboard-panel movement-panel" >
        <div className="admin-panel-title" >
            <div>
            <span className="admin-section-label" >
                MOVIMENTAÇÕES
                </span>

                <h2>
                                    Últimos 7 dias
    </h2>
    </div>

    < div className = "admin-chart-legend" >
        <span>
        <i className="legend-dot deposit" > </i>
Depósitos
    </span>

    < span >
    <i className="legend-dot withdrawal" > </i>
Saques
    </span>

    < span >
    <i className="legend-dot transfer" > </i>
Transferências
    </span>
    </div>
    </div>

    < div className = "admin-line-chart" >
        <div className="admin-chart-grid-lines" >
            <span></span>
            < span > </span>
            < span > </span>
            < span > </span>
            < span > </span>
            </div>

            < svg
className = "admin-chart-svg"
viewBox = {`0 0 ${larguraGrafico} ${alturaGrafico}`}
preserveAspectRatio = "none"
    >
    <defs>
    <filter
                                        id="lineGlow"
x = "-20%"
y = "-20%"
width = "140%"
height = "140%"
    >
    <feGaussianBlur
                                            stdDeviation="2.5"
result = "blur"
    />

    <feMerge>
    <feMergeNode
                                                in="blur"
    />

    <feMergeNode
                                                in="SourceGraphic"
    />
    </feMerge>
    </filter>
    </defs>

{
    seriesGrafico.map(
        (serie) => (
            <g
                                            key= {
            serie.nome
        }
                                            className = {`chart-series ${serie.classe}`}
                                        >
    <polyline
                                                className="chart-line"
points = {
    gerarPolyline(
        serie.valores
                                                )
}
vectorEffect = "non-scaling-stroke"
    />

{
    obterPontosGrafico(
        serie.valores
                                            ).map(
            (
                ponto,
                indice
            ) => (
                <circle
                                                        key= {
                    indice
                }
                                                        className = "chart-point"
                                                        cx = {
                ponto.x
            }
                                                        cy = {
                ponto.y
            }
                                                        r = "4"
                                                        vectorEffect = "non-scaling-stroke"
            >
            <title>
            {`${serie.nome}: ${formatarMoeda(
                ponto.valor
            )}`}
    </title>
    </circle>
                                                )
                                            )}
</g>
                                    )
                                )}
</svg>

    < div className = "admin-chart-dates" >
    {
        dashboard
                                    ?.movimentacoesUltimos7Dias
                                    .map(
            (item) => (
                <span
                                                key= {
                    item.data
                }
                >
                {
                    item.data
                }
                </span>
        )
                                    )
    }
        </div>
        </div>
        </article>

        < article className = "admin-dashboard-panel requests-chart-panel" >
            <div className="admin-panel-title" >
                <div>
                <span className="admin-section-label" >
                    SOLICITAÇÕES
                    </span>

                    <h2>
                                    Pendências por tipo
    </h2>
    </div>
    </div>

    < div className = "admin-donut-area" >
        <div
                                className="admin-donut"
style = { graficoCircular }
    >
    <div className="admin-donut-center" >
        <strong>
        {
            totalGraficoSolicitacoes
        }
        </strong>

        <span>
pendentes
    </span>
    </div>
    </div>

    < div className = "admin-donut-legend" >
        <div>
        <span className="donut-dot block" > </span>

            < p >
            <small>
            Bloqueios
            </small>

            <strong>
{
    totalBloqueios
}
</strong>
    </p>
    </div>

    < div >
    <span className="donut-dot unblock" > </span>

        < p >
        <small>
        Desbloqueios
        </small>

        <strong>
{
    totalDesbloqueios
}
</strong>
    </p>
    </div>

    < div >
    <span className="donut-dot password" > </span>

        < p >
        <small>
        Recuperação de senha
            </small>

            <strong>
{ totalSenhas }
</strong>
    </p>
    </div>
    </div>
    </div>
    </article>
    </section>

{/* TABELAS */ }
<section className="admin-tables-grid" >
    <article className="admin-dashboard-panel" >
        <div className="admin-panel-title table-title" >
            <div>
            <span className="admin-section-label" >
                SOLICITAÇÕES
                </span>

                <h2>
                                    Últimas solicitações
    </h2>
    </div>

    < span className = "admin-panel-count" >
    {
        dashboard
                                        ?.ultimasSolicitacoes
                                        .length ?? 0
    }
        </span>
        </div>

        < div className = "admin-table-wrapper" >
            <table className="admin-table" >
                <thead>
                <tr>
                <th>TIPO </th>
                < th > CLIENTE </th>
                < th > CONTA </th>
                < th > DATA </th>
                < th > STATUS </th>
                </tr>
                </thead>

                <tbody>
{
    dashboard
        ?.ultimasSolicitacoes
        .length === 0 && (
            <tr>
            <td
                                                colSpan={ 5 }
    className = "admin-table-empty"
        >
        Nenhuma solicitação encontrada.
                                            </td>
            </tr>
                                    )
}

{
    dashboard
        ?.ultimasSolicitacoes
        .map(
            (
                solicitacao
            ) => (
                <tr
                                                    key= {
                    solicitacao.solicitacaoId
                }
                >
                <td>
                <strong>
                {
                    solicitacao.tipo
                }
                </strong>
                </td>

                <td>
                                                        {
                solicitacao.nomeCliente ??
                    "Cliente"
            }
            </td>

            <td>
                                                        Ag.{ " "}
                                                        {
                solicitacao.agencia
            }{ " "}
                                                        ·{ " "}
                                                        {
                solicitacao.numeroConta
            }
            </td>

            <td>
                                                        {
                solicitacao.dataSolicitacao
            }
            </td>

            < td >
            <span
                                                            className={`admin-status ${obterClasseStatus(
                solicitacao.status
            )}`}
                                                        >
{
    solicitacao.status
}
    </span>
    </td>
    </tr>
                                            )
                                        )}
</tbody>
    </table>
    </div>
    </article>

    < article className = "admin-dashboard-panel" >
        <div className="admin-panel-title table-title" >
            <div>
            <span className="admin-section-label" >
                CLIENTES
                </span>

                <h2>
                                    Últimos cadastrados
    </h2>
    </div>

    < span className = "admin-panel-count" >
    {
        dashboard
                                        ?.ultimosClientes
                                        .length ?? 0
    }
        </span>
        </div>

        < div className = "admin-table-wrapper" >
            <table className="admin-table" >
                <thead>
                <tr>
                <th>CLIENTE </th>
                < th > CPF </th>
                < th > CADASTRO </th>
                </tr>
                </thead>

                <tbody>
{
    dashboard
        ?.ultimosClientes
        .length === 0 && (
            <tr>
            <td
                                                colSpan={ 3 }
    className = "admin-table-empty"
        >
        Nenhum cliente encontrado.
                                            </td>
            </tr>
                                    )
}

{
    dashboard
        ?.ultimosClientes
        .map(
            (cliente) => (
                <tr
                                                    key= {
                    cliente.id
                }
                >
                <td>
                <div className="admin-client-cell" >
        <div className="admin-client-avatar" >
        {
            cliente.nome
                ?.charAt(
                    0
                )
                .toUpperCase()
        }
        </div>

        < div >
        <strong>
        {
            cliente.nome
        }
        </strong>

        <span>
                                                                    {
                cliente.email
            }
            </span>
            </div>
            </div>
            </td>

            <td>
                                                        {
                formatarCpf(
                    cliente.cpf
                                                        )
}
</td>

    <td>
{
    cliente.dataCadastro
}
</td>
    </tr>
                                            )
                                        )}
</tbody>
    </table>
    </div>
    </article>
    </section>
    </section>
    </main>
    );
}

export default AdminDashboard;