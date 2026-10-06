import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import "./AdminDashboard.css";
import "./AdminRelatorios.css";

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

type DashboardAdmin = {
    totalClientes: number;
    totalContas: number;
    saldoTotal: number;
    solicitacoesPendentes: number;
    movimentacoesUltimos7Dias: MovimentacaoDia[];
};

type SolicitacaoSenha = {
    solicitacaoId: number;
    status: string;
};

type SerieGrafico = {
    nome: string;
    classe: "deposito" | "saque" | "transferencia";
    valores: number[];
};

type LinhaDetalhamento = {
    id: string;
    data: string;
    tipo: "Depósito" | "Saque" | "Transferência";
    classe: "deposito" | "saque" | "transferencia";
    descricao: string;
    valor: number;
};

function AdminRelatorios() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [dashboard, setDashboard] = useState<DashboardAdmin | null>(null);
    const [solicitacoesSenha, setSolicitacoesSenha] = useState<SolicitacaoSenha[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [sidebarRecolhida, setSidebarRecolhida] = useState(false);

    function formatarMoeda(valor: number) {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valor);
    }

    function encerrarSessao() {
        sessionStorage.removeItem("corebank_token");
        sessionStorage.removeItem("corebank_usuario");
        navigate("/login", { replace: true });
    }

    useEffect(() => {
        async function carregarRelatorios() {
            const token = sessionStorage.getItem("corebank_token");
            const usuarioSalvo = sessionStorage.getItem("corebank_usuario");

            if (!token || !usuarioSalvo) {
                encerrarSessao();
                return;
            }

            try {
                const usuarioAtual = JSON.parse(usuarioSalvo) as Usuario;
                const perfil = usuarioAtual.perfil?.toLowerCase();

                if (perfil !== "admin" && perfil !== "administrador") {
                    navigate("/dashboard", { replace: true });
                    return;
                }

                setUsuario(usuarioAtual);

                const headers = {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                };

                const [resposta, respostaSenhas] = await Promise.all([
                    fetch("https://localhost:7122/api/Admin/dashboard", { headers }),
                    fetch(
                        "https://localhost:7122/api/Admin/password-reset-requests/pending",
                        { headers }
                    ),
                ]);

                if (
                    resposta.status === 401 ||
                    resposta.status === 403 ||
                    respostaSenhas.status === 401 ||
                    respostaSenhas.status === 403
                ) {
                    encerrarSessao();
                    return;
                }

                if (!resposta.ok) {
                    throw new Error(
                        "Não foi possível carregar os relatórios."
                    );
                }

                const dados = (await resposta.json()) as DashboardAdmin;
                setDashboard(dados);

                if (respostaSenhas.ok) {
                    const senhas = (await respostaSenhas.json()) as SolicitacaoSenha[];
                    setSolicitacoesSenha(senhas);
                } else {
                    setSolicitacoesSenha([]);
                }
            } catch (error) {
                setErro(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar os relatórios."
                );
            } finally {
                setCarregando(false);
            }
        }

        carregarRelatorios();
    }, []);

    const totalPendencias =
        (dashboard?.solicitacoesPendentes ?? 0) + solicitacoesSenha.length;

    const movimentacoes = dashboard?.movimentacoesUltimos7Dias ?? [];

    const resumo = useMemo(() => {
        const depositos = movimentacoes.reduce(
            (total, item) => total + item.depositos,
            0
        );

        const saques = movimentacoes.reduce(
            (total, item) => total + item.saques,
            0
        );

        const transferencias = movimentacoes.reduce(
            (total, item) => total + item.transferencias,
            0
        );

        const total = depositos + saques + transferencias;

        return {
            depositos,
            saques,
            transferencias,
            total,
        };
    }, [movimentacoes]);

    const seriesGrafico = useMemo<SerieGrafico[]>(
        () => [
            {
                nome: "Depósitos",
                classe: "deposito",
                valores: movimentacoes.map((item) => item.depositos),
            },
            {
                nome: "Saques",
                classe: "saque",
                valores: movimentacoes.map((item) => item.saques),
            },
            {
                nome: "Transferências",
                classe: "transferencia",
                valores: movimentacoes.map((item) => item.transferencias),
            },
        ],
        [movimentacoes]
    );

    const maiorMovimentacao = useMemo(() => {
        const valores = seriesGrafico.flatMap((serie) => serie.valores);
        return Math.max(1, ...valores);
    }, [seriesGrafico]);

    const larguraGrafico = 720;
    const alturaGrafico = 250;
    const paddingHorizontal = 24;
    const paddingSuperior = 24;
    const paddingInferior = 24;

    function obterPontosGrafico(valores: number[]) {
        if (valores.length === 0) {
            return [];
        }

        const larguraUtil = larguraGrafico - paddingHorizontal * 2;
        const alturaUtil =
            alturaGrafico - paddingSuperior - paddingInferior;

        return valores.map((valor, indice) => {
            const divisor = Math.max(valores.length - 1, 1);

            const x =
                paddingHorizontal + (indice / divisor) * larguraUtil;

            const y =
                paddingSuperior +
                alturaUtil -
                (valor / maiorMovimentacao) * alturaUtil;

            return { x, y, valor };
        });
    }

    function gerarPolyline(valores: number[]) {
        return obterPontosGrafico(valores)
            .map((ponto) => `${ponto.x},${ponto.y}`)
            .join(" ");
    }

    const percentualDepositos =
        resumo.total > 0 ? (resumo.depositos / resumo.total) * 100 : 0;

    const percentualTransferencias =
        resumo.total > 0
            ? (resumo.transferencias / resumo.total) * 100
            : 0;

    const percentualSaques =
        resumo.total > 0 ? (resumo.saques / resumo.total) * 100 : 0;

    const graficoCircular: CSSProperties = {
        background:
            resumo.total === 0
                ? "rgba(255,255,255,0.08)"
                : `conic-gradient(
                    #54c99a 0% ${percentualDepositos}%,
                    #6b8fbd ${percentualDepositos}% ${percentualDepositos + percentualTransferencias
                }%,
                    #8b72bd ${percentualDepositos + percentualTransferencias
                }% 100%
                )`,
    };

    const linhasDetalhamento = useMemo<LinhaDetalhamento[]>(() => {
        const linhas: LinhaDetalhamento[] = [];

        movimentacoes.forEach((item) => {
            if (item.depositos > 0) {
                linhas.push({
                    id: `${item.data}-deposito`,
                    data: item.data,
                    tipo: "Depósito",
                    classe: "deposito",
                    descricao: "Depósitos registrados no dia",
                    valor: item.depositos,
                });
            }

            if (item.transferencias > 0) {
                linhas.push({
                    id: `${item.data}-transferencia`,
                    data: item.data,
                    tipo: "Transferência",
                    classe: "transferencia",
                    descricao: "Transferências registradas no dia",
                    valor: item.transferencias,
                });
            }

            if (item.saques > 0) {
                linhas.push({
                    id: `${item.data}-saque`,
                    data: item.data,
                    tipo: "Saque",
                    classe: "saque",
                    descricao: "Saques registrados no dia",
                    valor: item.saques,
                });
            }
        });

        return linhas;
    }, [movimentacoes]);

    if (carregando) {
        return (
            <main className= "admin-loading" >
            <strong>CoreBank </strong>
            < p > Carregando relatórios...</p>
                </main>
        );
    }

    return (
        <main
            className= {`admin-page ${sidebarRecolhida ? "admin-sidebar-collapsed" : ""
            }`
}
        >
    <aside className="admin-sidebar" >
        <div className="admin-sidebar-header" >
            <strong className="admin-logo" >
                <span className="admin-logo-core" > Core </span>
                    < span className = "admin-logo-bank" > Bank </span>
                        </strong>

                        < button
type = "button"
className = "admin-sidebar-toggle"
onClick = {() =>
setSidebarRecolhida(!sidebarRecolhida)
                        }
aria-label="Recolher menu"
    >
{ sidebarRecolhida? "›": "‹" }
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
className = "admin-nav-item"
onClick = {() => navigate("/admin")}
                    >
    <span className="admin-nav-icon" >⌂</span>
        < span className = "admin-nav-text" > Dashboard </span>
            </button>

            < button
type = "button"
className = "admin-nav-item"
onClick = {() => navigate("/admin/clientes")}
                    >
    <span className="admin-nav-icon" >♙</span>
        < span className = "admin-nav-text" > Clientes </span>
            </button>

            < button
type = "button"
className = "admin-nav-item"
onClick = {() => navigate("/admin/contas")}
                    >
    <span className="admin-nav-icon" >▣</span>
        < span className = "admin-nav-text" > Contas </span>
            </button>

            < button
type = "button"
className = "admin-nav-item"
onClick = {() => navigate("/admin/solicitacoes")}
                    >
    <span className="admin-nav-icon" >◇</span>
        < span className = "admin-nav-text" > Solicitações </span>
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
className = "admin-nav-item active"
onClick = {() => navigate("/admin/relatorios")}
                    >
    <span className="admin-nav-icon" >▥</span>
        < span className = "admin-nav-text" > Relatórios </span>
            </button>

            < button
type = "button"
className = "admin-nav-item"
onClick = {() => navigate("/admin/perfil")}
                    >
    <span className="admin-nav-icon" >○</span>
        < span className = "admin-nav-text" > Perfil </span>
            </button>
            </nav>

            < div className = "admin-sidebar-footer" >
                <div className="admin-security-box" >
                    <span className="admin-security-icon" >✓</span>

                        < div className = "admin-security-text" >
                            <strong>Área administrativa </strong>
                                < small > Acesso protegido </small>
                                    </div>
                                    </div>

                                    < button
type = "button"
className = "admin-logout"
onClick = { encerrarSessao }
    >
    <span className="admin-nav-icon" >↪</span>
        < span className = "admin-nav-text" > Sair </span>
            </button>
            </div>
            </aside>

            < section className = "admin-content relatorios-content" >
                <header className="admin-header relatorios-header" >
                    <div>
                    <span className="admin-section-label" >
                        PAINEL ADMINISTRATIVO
                            </span>

                            < h1 > Relatórios </h1>

                            <p>
                            Acompanhe e analise os principais indicadores do
    CoreBank.
                        </p>
        </div>

        < div className = "admin-user" >
        <div className="admin-user-info" >
            <strong>
            { usuario?.nome ?? "Administrador"}
</strong>
    < span > { usuario?.email } </span>
    </div>

    < div className = "admin-avatar" >
    { usuario?.nome?.charAt(0).toUpperCase() ?? "A" }
        </div>
        </div>
        </header>

{
    erro && (
        <div className="admin-error" >
            <span>!</span>
            < div >
            <strong>Atenção </strong>
            < p > { erro } </p>
            </div>
            </div>
                )
}

<div className="relatorios-periodo-row" >
    <div />

    < div className = "relatorios-periodo" >
        <span className="relatorios-periodo-icon" >▦</span>
            < div >
            <small>Período </small>
            < strong > Últimos 7 dias </strong>
                </div>
                </div>
                </div>

                < section className = "relatorios-kpis" >
                    <article className="relatorios-kpi clientes" >
                        <div className="relatorios-kpi-icon" >♙</div>
                            < div className = "relatorios-kpi-text" >
                                <span>TOTAL DE CLIENTES </span>
                                    < strong > { dashboard?.totalClientes ?? 0}</strong>
                                        < small > clientes cadastrados </small>
                                            </div>
                                            < div className = "relatorios-mini-line" >
                                                <i />
                                                < i />
                                                <i />
                                                < i />
                                                </div>
                                                </article>

                                                < article className = "relatorios-kpi contas" >
                                                    <div className="relatorios-kpi-icon" >▣</div>
                                                        < div className = "relatorios-kpi-text" >
                                                            <span>TOTAL DE CONTAS </span>
                                                                < strong > { dashboard?.totalContas ?? 0}</strong>
                                                                    < small > contas cadastradas </small>
                                                                        </div>
                                                                        < div className = "relatorios-mini-line" >
                                                                            <i />
                                                                            < i />
                                                                            <i />
                                                                            < i />
                                                                            </div>
                                                                            </article>

                                                                            < article className = "relatorios-kpi solicitacoes" >
                                                                                <div className="relatorios-kpi-icon" >◇</div>
                                                                                    < div className = "relatorios-kpi-text" >
                                                                                        <span>SOLICITAÇÕES PENDENTES </span>
                                                                                            <strong>
{ dashboard?.solicitacoesPendentes ?? 0 }
</strong>
    < small > aguardando análise </small>
        </div>
        < div className = "relatorios-mini-line" >
            <i />
            < i />
            <i />
            < i />
            </div>
            </article>

            < article className = "relatorios-kpi saldo" >
                <div className="relatorios-kpi-icon" > $ </div>
                    < div className = "relatorios-kpi-text" >
                        <span>SALDO TOTAL EM CONTAS </span>
                            <strong>
{ formatarMoeda(dashboard?.saldoTotal ?? 0) }
</strong>
    < small > patrimônio total dos clientes </small>
        </div>
        < div className = "relatorios-mini-line" >
            <i />
            < i />
            <i />
            < i />
            </div>
            </article>
            </section>

            < section className = "relatorios-main-grid" >
                <article className="relatorios-panel relatorios-evolucao" >
                    <div className="relatorios-panel-header" >
                        <div>
                        <span className="admin-section-label" >
                            MOVIMENTAÇÕES
                            </span>
                            < h2 > Evolução financeira </h2>
                                <p>
                                    Valores movimentados por tipo de operação
                                    no período selecionado.
                                </p>
    </div>

    < div className = "relatorios-operacao" >
        Por operação
            <span>⌄</span>
                </div>
                </div>

                < div className = "relatorios-chart-legend" >
                    <span>
                    <i className="deposito" />
                        Depósitos
                        </span>
                        < span >
                        <i className="saque" />
                            Saques
                            </span>
                            < span >
                            <i className="transferencia" />
                                Transferências
                                </span>
                                </div>

                                < div className = "relatorios-chart-area" >
                                    <div className="relatorios-y-axis" >
                                        <span>{ formatarMoeda(maiorMovimentacao) } </span>
                                        <span>
{
    formatarMoeda(
        maiorMovimentacao * 0.66
    )
}
</span>
    <span>
{
    formatarMoeda(
        maiorMovimentacao * 0.33
    )
}
</span>
    < span > { formatarMoeda(0) } </span>
    </div>

    < div className = "relatorios-svg-wrap" >
        <svg
                                    className="relatorios-line-chart"
viewBox = {`0 0 ${larguraGrafico} ${alturaGrafico}`}
preserveAspectRatio = "none"
aria-label="Gráfico de evolução financeira"
    >
    <defs>
    <filter
                                            id="relatoriosGlow"
x = "-20%"
y = "-20%"
width = "140%"
height = "140%"
    >
    <feGaussianBlur
                                                stdDeviation="2"
result = "blur"
    />
    <feMerge>
    <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
            </feMerge>
            </filter>
            </defs>

            < g className = "relatorios-grid-lines" >
                <line x1="0" y1 = "24" x2 = "720" y2 = "24" />
                    <line x1="0" y1 = "91" x2 = "720" y2 = "91" />
                        <line x1="0" y1 = "158" x2 = "720" y2 = "158" />
                            <line x1="0" y1 = "226" x2 = "720" y2 = "226" />
                                </g>

{
    seriesGrafico.map((serie) => (
        <g
                                            key= { serie.nome }
                                            className = {`relatorios-serie ${serie.classe}`}
                                        >
    <polyline
                                                className="relatorios-chart-line"
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
                                            ).map((ponto, indice) => (
            <circle
                                                    key= {`${serie.nome}-${indice}`}
className = "relatorios-chart-point"
cx = { ponto.x }
cy = { ponto.y }
r = "4"
vectorEffect = "non-scaling-stroke"
    >
    <title>
    {`${serie.nome}: ${formatarMoeda(
        ponto.valor
    )}`}
</title>
    </circle>
                                            ))}
</g>
                                    ))}
</svg>

    < div className = "relatorios-chart-dates" >
    {
        movimentacoes.map((item) => (
            <span key= { item.data } >
            { item.data }
            </span>
        ))
    }
        </div>
        </div>
        </div>
        </article>

        < article className = "relatorios-panel relatorios-distribuicao" >
            <div className="relatorios-panel-header" >
                <div>
                <span className="admin-section-label" >
                    DISTRIBUIÇÃO DAS MOVIMENTAÇÕES
                        </span>
                        <p>
                                    Participação de cada tipo no período.
                                </p>
    </div>
    </div>

    < div className = "relatorios-donut-layout" >
        <div
                                className="relatorios-donut"
style = { graficoCircular }
    >
    <div className="relatorios-donut-center" >
        <strong>
        { formatarMoeda(resumo.total) }
        </strong>
        < span > total movimentado </span>
            </div>
            </div>

            < div className = "relatorios-distribuicao-lista" >
                <div className="relatorios-dist-item deposito" >
                    <div className="relatorios-dist-title" >
                        <span>
                        <i />
Depósitos
    </span>
    <strong>
{ formatarMoeda(resumo.depositos) }
</strong>
    </div>
    < div className = "relatorios-progress" >
        <span
                                            style={
    {
        width: `${percentualDepositos}%`,
                                            }
}
                                        />
    </div>
    <small>
{ percentualDepositos.toFixed(1) }%
    </small>
    </div>

    < div className = "relatorios-dist-item transferencia" >
        <div className="relatorios-dist-title" >
            <span>
            <i />
Transferências
    </span>
    <strong>
{
    formatarMoeda(
        resumo.transferencias
    )
}
</strong>
    </div>
    < div className = "relatorios-progress" >
        <span
                                            style={
    {
        width: `${percentualTransferencias}%`,
                                            }
}
                                        />
    </div>
    <small>
{ percentualTransferencias.toFixed(1) }%
    </small>
    </div>

    < div className = "relatorios-dist-item saque" >
        <div className="relatorios-dist-title" >
            <span>
            <i />
Saques
    </span>
    <strong>
{ formatarMoeda(resumo.saques) }
</strong>
    </div>
    < div className = "relatorios-progress" >
        <span
                                            style={
    {
        width: `${percentualSaques}%`,
                                            }
}
                                        />
    </div>
    <small>
{ percentualSaques.toFixed(1) }%
    </small>
    </div>
    </div>
    </div>
    </article>
    </section>

    < section className = "relatorios-bottom-grid" >
        <article className="relatorios-panel relatorios-detalhamento" >
            <div className="relatorios-panel-header" >
                <div>
                <span className="admin-section-label" >
                    DETALHAMENTO DAS MOVIMENTAÇÕES
                        </span>
                        <p>
                                    Movimentações consolidadas no período.
                                </p>
    </div>
    </div>

    < div className = "relatorios-table-wrap" >
        <table className="relatorios-table" >
            <thead>
            <tr>
            <th>DATA </th>
            < th > TIPO </th>
            < th > DESCRIÇÃO </th>
            < th > VALOR </th>
            </tr>
            </thead>

            <tbody>
{
    linhasDetalhamento.length === 0 ? (
        <tr>
        <td
                                                colSpan= { 4}
                                                className = "relatorios-empty"
        >
        Nenhuma movimentação no período.
                                            </td>
            </tr>
                                    ) : (
        linhasDetalhamento.map((linha) => (
            <tr key= { linha.id } >
            <td>{ linha.data } </td>
            < td >
            <span
                                                        className={`relatorios-tipo ${linha.classe}`}
                                                    >
    <i />
{ linha.tipo }
</span>
    </td>
    < td > { linha.descricao } </td>
    < td
className = {`relatorios-valor ${linha.classe}`}
                                                >
{ formatarMoeda(linha.valor) }
    </td>
    </tr>
                                        ))
                                    )}
</tbody>
    </table>
    </div>
    </article>

    < article className = "relatorios-panel relatorios-resumo" >
        <div className="relatorios-panel-header" >
            <div>
            <span className="admin-section-label" >
                RESUMO DO PERÍODO
                    </span>
                    < p > Principais indicadores financeiros.</p>
                        </div>
                        </div>

                        < div className = "relatorios-resumo-lista" >
                            <div className="relatorios-resumo-item deposito" >
                                <div className="relatorios-resumo-icon" >↑</div>
                                    < div className = "relatorios-resumo-info" >
                                        <span>Total de depósitos </span>
                                            <strong>
{ formatarMoeda(resumo.depositos) }
</strong>
    </div>
    <small>
{ percentualDepositos.toFixed(1) }% do total
    </small>
    </div>

    < div className = "relatorios-resumo-item transferencia" >
    <div className="relatorios-resumo-icon" >↔</div>
        < div className = "relatorios-resumo-info" >
            <span>Total de transferências </span>
                <strong>
{
    formatarMoeda(
        resumo.transferencias
    )
}
</strong>
    </div>
    <small>
{ percentualTransferencias.toFixed(1) }% do
    total
        </small>
        </div>

        < div className = "relatorios-resumo-item saque" >
        <div className="relatorios-resumo-icon" >↓</div>
            < div className = "relatorios-resumo-info" >
                <span>Total de saques </span>
                    <strong>
{ formatarMoeda(resumo.saques) }
</strong>
    </div>
    <small>
{ percentualSaques.toFixed(1) }% do total
    </small>
    </div>
    </div>
    </article>
    </section>
    </section>
    </main>
    );
}

export default AdminRelatorios;
