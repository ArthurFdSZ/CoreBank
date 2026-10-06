import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./AdminDashboard.css";
import "./AdminContas.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type Conta = {
    id: number;
    clienteId: number;
    nomeCliente: string | null;
    cpfCliente: string | null;
    agencia: string;
    numero: string;
    saldo: number;
    status: string;
    dataCriacao: string;
};

type FiltroStatus =
    | "todas"
    | "ativas"
    | "bloqueadas";

type MovimentacaoConta = {
    id: number;
    tipo: string;
    valor: number;
    descricao: string | null;
    contaRelacionadaId: number | null;
    dataCriacao: string;
};

type SolicitacaoConta = {
    id: number;
    tipo: string;
    status: string;
    dataSolicitacao: string;
    dataProcessamento: string | null;
};

type DetalhesConta = {
    conta: {
        id: number;
        agencia: string;
        numero: string;
        saldo: number;
        status: string;
    };
    resumoMovimentacoes: {
        depositos: number;
        saques: number;
        transferencias: number;
        totalMovimentado: number;
    };
    ultimasMovimentacoes: MovimentacaoConta[];
    resumoSolicitacoes: {
        total: number;
        bloqueios: number;
        desbloqueios: number;
        pendentes: number;
    };
    solicitacoes: SolicitacaoConta[];
};

function AdminContas() {
    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState<Usuario | null>(null);

    const [contas, setContas] =
        useState<Conta[]>([]);

    const [busca, setBusca] =
        useState("");

    const [filtroStatus, setFiltroStatus] =
        useState<FiltroStatus>("todas");

    const [carregando, setCarregando] =
        useState(true);

    const [erro, setErro] =
        useState("");

    const [sidebarRecolhida, setSidebarRecolhida] =
        useState(false);

    const [totalPendencias, setTotalPendencias] =
        useState(0);

    const [detalhesConta, setDetalhesConta] =
        useState<DetalhesConta | null>(null);

    const [carregandoDetalhes, setCarregandoDetalhes] =
        useState(false);

    const [erroDetalhes, setErroDetalhes] =
        useState("");

    // =========================================================
    // SESSÃO
    // =========================================================

    function encerrarSessao() {
        sessionStorage.removeItem("corebank_token");
        sessionStorage.removeItem("corebank_usuario");

        navigate("/login", {
            replace: true,
        });
    }

    // =========================================================
    // CARREGAR CONTAS
    // =========================================================

    useEffect(() => {
        async function carregarContas() {
            const token =
                sessionStorage.getItem(
                    "corebank_token"
                );

            const usuarioSalvo =
                sessionStorage.getItem(
                    "corebank_usuario"
                );

            if (!token || !usuarioSalvo) {
                encerrarSessao();
                return;
            }

            try {
                const usuarioAtual =
                    JSON.parse(
                        usuarioSalvo
                    ) as Usuario;

                const perfil =
                    usuarioAtual.perfil
                        ?.toLowerCase();

                if (
                    perfil !== "admin" &&
                    perfil !== "administrador"
                ) {
                    navigate(
                        "/dashboard",
                        {
                            replace: true,
                        }
                    );

                    return;
                }

                setUsuario(usuarioAtual);

                // Mantém o contador igual ao Dashboard administrativo.
                try {
                    const [dashboardResponse, senhaResponse] =
                        await Promise.all([
                            fetch(
                                "https://localhost:7122/api/Admin/dashboard",
                                {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                        "Content-Type": "application/json",
                                    },
                                }
                            ),
                            fetch(
                                "https://localhost:7122/api/Admin/password-reset-requests/pending",
                                {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                        "Content-Type": "application/json",
                                    },
                                }
                            ),
                        ]);

                    let solicitacoesContaPendentes = 0;
                    let solicitacoesSenhaPendentes = 0;

                    if (dashboardResponse.ok) {
                        const dashboardData =
                            (await dashboardResponse.json()) as {
                                solicitacoesPendentes: number;
                            };

                        solicitacoesContaPendentes =
                            dashboardData.solicitacoesPendentes ?? 0;
                    }

                    if (senhaResponse.ok) {
                        const senhaData =
                            (await senhaResponse.json()) as unknown[];

                        solicitacoesSenhaPendentes =
                            senhaData.length;
                    }

                    setTotalPendencias(
                        solicitacoesContaPendentes +
                        solicitacoesSenhaPendentes
                    );
                } catch {
                    // O badge não impede o carregamento da tela.
                    setTotalPendencias(0);
                }

                const response =
                    await fetch(
                        "https://localhost:7122/api/Admin/contas",
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,

                                "Content-Type":
                                    "application/json",
                            },
                        }
                    );

                if (
                    response.status === 401 ||
                    response.status === 403
                ) {
                    encerrarSessao();
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        "Não foi possível carregar as contas."
                    );
                }

                const data =
                    (await response.json()) as Conta[];

                setContas(data);
            } catch (error) {
                setErro(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar as contas."
                );
            } finally {
                setCarregando(false);
            }
        }

        carregarContas();
    }, []);

    // =========================================================
    // FORMATAÇÕES
    // =========================================================

    function formatarCpf(
        cpf: string | null
    ) {
        if (!cpf) {
            return "-";
        }

        const numeros =
            cpf.replace(/\D/g, "");

        if (numeros.length !== 11) {
            return cpf;
        }

        return numeros.replace(
            /(\d{3})(\d{3})(\d{3})(\d{2})/,
            "$1.$2.$3-$4"
        );
    }

    function formatarMoeda(
        valor: number
    ) {
        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
            }
        ).format(valor);
    }

    function statusEhAtivo(
        status: string
    ) {
        const valor =
            status
                ?.trim()
                .toLowerCase();

        return (
            valor === "ativa" ||
            valor === "ativo" ||
            valor === "active"
        );
    }

    function statusEhBloqueado(
        status: string
    ) {
        const valor =
            status
                ?.trim()
                .toLowerCase();

        return (
            valor === "bloqueada" ||
            valor === "bloqueado" ||
            valor === "blocked"
        );
    }

    function obterClasseStatus(
        status: string
    ) {
        if (statusEhAtivo(status)) {
            return "approved";
        }

        if (statusEhBloqueado(status)) {
            return "rejected";
        }

        return "pending";
    }

    function formatarDataHora(valor: string | null) {
        if (!valor) return "-";

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return valor;
        }

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
        }).format(data);
    }

    function nomeMovimentacao(tipo: string) {
        const valor = String(tipo).trim().toLowerCase();

        if (
            valor === "1" ||
            valor === "deposit" ||
            valor === "deposito" ||
            valor === "depósito"
        ) {
            return "Depósito";
        }

        if (
            valor === "2" ||
            valor === "withdrawal" ||
            valor === "saque"
        ) {
            return "Saque";
        }

        if (
            valor === "3" ||
            valor === "4" ||
            valor.includes("transfer")
        ) {
            return "Transferência";
        }

        return tipo;
    }

    async function abrirDetalhesConta(contaId: number) {
        const token =
            sessionStorage.getItem("corebank_token");

        if (!token) {
            encerrarSessao();
            return;
        }

        setCarregandoDetalhes(true);
        setErroDetalhes("");
        setDetalhesConta(null);

        try {
            const response = await fetch(
                `https://localhost:7122/api/Admin/contas/${contaId}/detalhes`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                encerrarSessao();
                return;
            }

            if (!response.ok) {
                throw new Error(
                    "Não foi possível carregar os detalhes da conta."
                );
            }

            const data =
                (await response.json()) as DetalhesConta;

            setDetalhesConta(data);
        } catch (error) {
            setErroDetalhes(
                error instanceof Error
                    ? error.message
                    : "Não foi possível carregar os detalhes da conta."
            );
        } finally {
            setCarregandoDetalhes(false);
        }
    }

    function fecharDetalhesConta() {
        setDetalhesConta(null);
        setErroDetalhes("");
        setCarregandoDetalhes(false);
    }

    // =========================================================
    // MÉTRICAS
    // =========================================================

    const totalAtivas =
        useMemo(
            () =>
                contas.filter(
                    (conta) =>
                        statusEhAtivo(
                            conta.status
                        )
                ).length,
            [contas]
        );

    const totalBloqueadas =
        useMemo(
            () =>
                contas.filter(
                    (conta) =>
                        statusEhBloqueado(
                            conta.status
                        )
                ).length,
            [contas]
        );

    const saldoTotal =
        useMemo(
            () =>
                contas.reduce(
                    (
                        total,
                        conta
                    ) =>
                        total +
                        Number(
                            conta.saldo
                        ),
                    0
                ),
            [contas]
        );

    // =========================================================
    // BUSCA E FILTROS
    // =========================================================

    const contasFiltradas =
        useMemo(() => {
            const texto =
                busca
                    .trim()
                    .toLowerCase();

            const numerosBusca =
                busca.replace(
                    /\D/g,
                    ""
                );

            return contas.filter(
                (conta) => {
                    if (
                        filtroStatus ===
                        "ativas" &&
                        !statusEhAtivo(
                            conta.status
                        )
                    ) {
                        return false;
                    }

                    if (
                        filtroStatus ===
                        "bloqueadas" &&
                        !statusEhBloqueado(
                            conta.status
                        )
                    ) {
                        return false;
                    }

                    if (!texto) {
                        return true;
                    }

                    const nome =
                        conta.nomeCliente
                            ?.toLowerCase() ??
                        "";

                    const cpf =
                        conta.cpfCliente
                            ?.replace(
                                /\D/g,
                                ""
                            ) ?? "";

                    const agencia =
                        conta.agencia
                            ?.toLowerCase() ??
                        "";

                    const numero =
                        conta.numero
                            ?.toLowerCase() ??
                        "";

                    return (
                        nome.includes(
                            texto
                        ) ||
                        agencia.includes(
                            texto
                        ) ||
                        numero.includes(
                            texto
                        ) ||
                        cpf.includes(
                            numerosBusca
                        )
                    );
                }
            );
        }, [
            busca,
            contas,
            filtroStatus,
        ]);

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
                    Carregando contas...
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
{/* =================================================
                SIDEBAR
               ================================================= */}

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
className = "admin-nav-item"
onClick = {() =>
navigate(
    "/admin"
)
                        }
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
onClick = {() =>
navigate(
    "/admin/clientes"
)
                        }
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
className = "admin-nav-item active"
onClick = {() =>
navigate(
    "/admin/contas"
)
                        }
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
onClick = {
    encerrarSessao
}
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

{/* =================================================
                CONTEÚDO
               ================================================= */}

<section className="admin-content" >
    <header className="admin-header" >
        <div>
        <span className="admin-section-label" >
            PAINEL ADMINISTRATIVO
                </span>

                < h1 > Contas </h1>

                <p>
                            Consulte e acompanhe as contas bancárias do CoreBank.
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

{/* =================================================
                    CARDS
                   ================================================= */}

<section className="admin-contas-resumo" >
    <article className="admin-metric-card accounts-card" >
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
{ contas.length }
</strong>

    <p>
                            contas cadastradas
    </p>
    </article>

    < article className = "admin-metric-card clients-card" >
        <div className="admin-card-glow" > </div>

            < div className = "admin-metric-heading" >
                <span>
                CONTAS ATIVAS
                    </span>

                    < div className = "admin-metric-icon" >
                                ✓
</div>
    </div>

    <strong>
{ totalAtivas }
</strong>

    <p>
                            contas em operação
    </p>
    </article>

    < article className = "admin-metric-card requests-card" >
        <div className="admin-card-glow" > </div>

            < div className = "admin-metric-heading" >
                <span>
                BLOQUEADAS
                </span>

                < div className = "admin-metric-icon" >
                    !
                    </div>
                    </div>

                    <strong>
{ totalBloqueadas }
</strong>

    <p>
                            contas bloqueadas
    </p>
    </article>

    < article className = "admin-metric-card balance-card" >
        <div className="admin-card-glow" > </div>

            < div className = "admin-metric-heading" >
                <span>
                SALDO TOTAL
                    </span>

                    < div className = "admin-metric-icon" >
                        R$
                        </div>
                        </div>

                        < strong className = "admin-contas-saldo-card" >
                        {
                            formatarMoeda(
                                saldoTotal
                            )
                        }
                            </strong>

                            <p>
                            saldo consolidado
    </p>
    </article>
    </section>

{/* =================================================
                    TABELA
                   ================================================= */}

<article className="admin-dashboard-panel admin-contas-panel" >
    <div className="admin-contas-toolbar" >
        <div>
        <span className="admin-section-label" >
            CONTAS BANCÁRIAS
                </span>

                <h2>
                                Contas cadastradas
    </h2>
    </div>

    < div className = "admin-contas-actions" >
        <div className="admin-contas-search" >
            <span>
                                    ⌕
</span>

    < input
value = {
    busca
}
onChange = {(
    event
) =>
setBusca(
    event
        .target
        .value
)
                                    }
placeholder = "Cliente, CPF, agência ou conta"
    />
    </div>
    </div>
    </div>

    < div className = "admin-contas-filtros" >
        <button
                            type="button"
className = {
    filtroStatus ===
    "todas"
    ? "active"
    : ""
                            }
onClick = {() =>
setFiltroStatus(
    "todas"
)
                            }
                        >
    Todas
    <span>
{
    contas.length
}
</span>
    </button>

    < button
type = "button"
className = {
    filtroStatus ===
    "ativas"
    ? "active"
    : ""
                            }
onClick = {() =>
setFiltroStatus(
    "ativas"
)
                            }
                        >
    Ativas
    <span>
{
    totalAtivas
}
</span>
    </button>

    < button
type = "button"
className = {
    filtroStatus ===
    "bloqueadas"
    ? "active"
    : ""
                            }
onClick = {() =>
setFiltroStatus(
    "bloqueadas"
)
                            }
                        >
    Bloqueadas
    <span>
{
    totalBloqueadas
}
</span>
    </button>
    </div>

    < div className = "admin-table-wrapper" >
        <table className="admin-table admin-contas-table" >
            <thead>
            <tr>
            <th>
            CLIENTE
            </th>

            <th>
CPF
    </th>

    <th>
AGÊNCIA
    </th>

    <th>
CONTA
    </th>

    <th>
SALDO
    </th>

    <th>
STATUS
    </th>

    <th>
CRIAÇÃO
    </th>

    <th>
AÇÕES
    </th>
    </tr>
    </thead>

    <tbody>
{
    contasFiltradas.length ===
        0 ? (
            <tr>
            <td
                                            colSpan= { 8}
                                            className = "admin-table-empty"
        >
        Nenhuma conta encontrada.
                                        </td>
            </tr>
                                ) : (
        contasFiltradas.map(
            (
                conta
            ) => (
                <tr
                                                key= {
                    conta.id
                }
                >
                <td>
                <div className="admin-conta-cliente-cell" >
        <div className="admin-conta-cliente-avatar" >
        {
            conta.nomeCliente
                ?.charAt(
                    0
                )
                .toUpperCase() ??
                "C"
        }
        </div>

        < div >
        <strong>
        {
            conta.nomeCliente ??
                "Cliente"
        }
        </strong>

        <span>
                                                                ID #
                                                                {
                conta.clienteId
            }
            </span>
            </div>
            </div>
            </td>

            <td>
                                                    {
                formatarCpf(
                    conta.cpfCliente
                                                    )}
</td>

    < td >
    <strong>
    {
        conta.agencia
    }
    </strong>
    </td>

    < td >
    <strong className="admin-numero-conta" >
    {
        conta.numero
    }
        </strong>
        </td>

        < td >
        <strong className="admin-saldo-conta" >
            {
                formatarMoeda(
                    Number(
                        conta.saldo
                    )
                                                        )}
</strong>
    </td>

    < td >
    <span
                                                        className={
    `admin-status ${obterClasseStatus(
        conta.status
    )}`
}
                                                    >
{
    conta.status
}
    </span>
    </td>

    <td>
{
    conta.dataCriacao
}
</td>
    < td >
    <button
        type="button"
className = "admin-conta-detalhes-btn"
onClick = {() =>
abrirDetalhesConta(conta.id)
        }
    >
    Ver detalhes
        </button>
        </td>
        </tr>
                                        )
                                    )
                                )}
</tbody>
    </table>
    </div>

    < div className = "admin-contas-footer" >
        Exibindo{ " " }
<strong>
    {
        contasFiltradas.length
    }
    </strong>{" "}
                        de{ " " }
<strong>
    { contas.length }
    </strong>{" "}
contas
    </div>
    </article>

{
    (detalhesConta || carregandoDetalhes || erroDetalhes) && (
        <div
            className="admin-conta-modal-overlay"
    onMouseDown = {(event) => {
        if (event.currentTarget === event.target) {
            fecharDetalhesConta();
        }
    }
}
        >
    <section className="admin-conta-modal" >
        <header className="admin-conta-modal-header" >
            <div>
            <span className="admin-section-label" >
                DETALHES DA CONTA
                    </span>

                    <h2>
{
    detalhesConta
        ? `Conta ${detalhesConta.conta.numero}`
        : "Conta bancária"
}
</h2>

{
    detalhesConta && (
        <p>
        Agência { detalhesConta.conta.agencia }
    </p>
                        )
}
</div>

    < button
type = "button"
className = "admin-conta-modal-close"
onClick = { fecharDetalhesConta }
aria-label="Fechar"
    >
                        ×
</button>
    </header>

{
    carregandoDetalhes && (
        <div className="admin-conta-modal-state" >
            Carregando detalhes da conta...
    </div>
                )
}

{
    erroDetalhes && !carregandoDetalhes && (
        <div className="admin-conta-modal-state erro" >
        { erroDetalhes }
            </div>
                )
}

{
    detalhesConta && !carregandoDetalhes && (
        <div className="admin-conta-modal-content" >
            <section className="admin-conta-modal-resumo" >
                <article>
                <span>SALDO ATUAL </span>
                    < strong className = "valor" >
                        {
                            formatarMoeda(
                                Number(detalhesConta.conta.saldo)
                                    )
}
</strong>
    </article>

    < article >
    <span>STATUS </span>
    <strong>
{ detalhesConta.conta.status }
</strong>
    </article>

    < article >
    <span>TOTAL MOVIMENTADO </span>
        <strong>
{
    formatarMoeda(
        Number(
            detalhesConta
                .resumoMovimentacoes
                .totalMovimentado
        )
    )
}
</strong>
    </article>

    < article >
    <span>SOLICITAÇÕES </span>
    <strong>
{
    detalhesConta
        .resumoSolicitacoes
        .total
}
</strong>
    </article>
    </section>

    < section className = "admin-conta-modal-section" >
        <div className="admin-conta-modal-section-title" >
            <div>
            <span className="admin-section-label" >
                MOVIMENTAÇÕES
                </span>
                < h3 > Resumo da conta </h3>
                    </div>
                    </div>

                    < div className = "admin-conta-mov-metricas" >
                        <article>
                        <span>Depósitos </span>
                        <strong>
{ detalhesConta.resumoMovimentacoes.depositos }
</strong>
    </article>

    < article >
    <span>Saques </span>
    <strong>
{ detalhesConta.resumoMovimentacoes.saques }
</strong>
    </article>

    < article >
    <span>Transferências </span>
    <strong>
{ detalhesConta.resumoMovimentacoes.transferencias }
</strong>
    </article>

    < article >
    <span>Solicitações pendentes </span>
        <strong>
{ detalhesConta.resumoSolicitacoes.pendentes }
</strong>
    </article>
    </div>
    </section>

    < section className = "admin-conta-modal-section" >
        <div className="admin-conta-modal-section-title" >
            <div>
            <span className="admin-section-label" >
                HISTÓRICO
                </span>
                < h3 > Últimas movimentações </h3>
                    </div>
                    </div>

{
    detalhesConta.ultimasMovimentacoes.length === 0 ? (
        <div className= "admin-conta-modal-vazio" >
        Nenhuma movimentação encontrada.
                                </div>
                            ) : (
        <div className= "admin-conta-historico" >
        {
            detalhesConta.ultimasMovimentacoes.map(
                (movimentacao) => (
                    <article
                                                key= { movimentacao.id }
                                                className = "admin-conta-historico-item"
                >
                <div>
                <strong>
                {
                    nomeMovimentacao(
                        movimentacao.tipo
                                                        )
        }
        </strong>
        <span>
    {
        movimentacao.descricao ||
            "Movimentação bancária"
    }
    </span>
        </div>

        < div className = "admin-conta-historico-valor" >
            <strong>
            {
                formatarMoeda(
                    Number(
                        movimentacao.valor
                    )
                                                        )
}
</strong>
    <span>
{
    formatarDataHora(
        movimentacao.dataCriacao
    )
}
</span>
    </div>
    </article>
                                        )
                                    )}
</div>
                            )}
</section>

    < section className = "admin-conta-modal-section" >
        <div className="admin-conta-modal-section-title" >
            <div>
            <span className="admin-section-label" >
                SOLICITAÇÕES
                </span>
                < h3 > Histórico da conta </h3>
                    </div>

                    < div className = "admin-conta-solicitacoes-resumo" >
                        <span>
                        Bloqueios{ " " }
<strong>
    { detalhesConta.resumoSolicitacoes.bloqueios }
    </strong>
    </span>

    <span>
                                        Desbloqueios{ " " }
<strong>
    { detalhesConta.resumoSolicitacoes.desbloqueios }
    </strong>
    </span>
    </div>
    </div>

{
    detalhesConta.solicitacoes.length === 0 ? (
        <div className= "admin-conta-modal-vazio" >
        Nenhuma solicitação encontrada.
                                </div>
                            ) : (
        <div className= "admin-conta-historico" >
        {
            detalhesConta.solicitacoes.map(
                (solicitacao) => (
                    <article
                                                key= { solicitacao.id }
                                                className = "admin-conta-historico-item"
                >
                <div>
                <strong>
                { solicitacao.tipo }
                </strong>
                <span>
                                                        Solicitada em{ " "}
                                                        {
                    formatarDataHora(
                        solicitacao.dataSolicitacao
                                                        )
        }
        </span>
        </div>

        < span
    className = {`admin-status ${obterClasseStatus(
        solicitacao.status
    )}`
}
                                                >
{ solicitacao.status }
    </span>
    </article>
                                        )
                                    )}
</div>
                            )}
</section>
    </div>
                )}

<footer className="admin-conta-modal-footer" >
    <button
                        type="button"
onClick = { fecharDetalhesConta }
    >
    Fechar
    </button>
    </footer>
    </section>
    </div>
    )}
</section>
    </main>
    );
}

export default AdminContas;