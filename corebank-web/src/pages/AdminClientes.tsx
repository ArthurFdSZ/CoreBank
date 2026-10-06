import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import "./AdminClientes.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type Cliente = {
    id: number;
    nome: string;
    email: string;
    cpf: string;
    dataCadastro: string;
    quantidadeContas: number;
    contasAtivas: number;
    contasBloqueadas: number;
};

type ContaCliente = {
    id: number;
    agencia: string;
    numero: string;
    saldo: number;
    status: string;
    dataCriacao: string;
};

type ClienteDetalhes = {
    id: number;
    nome: string;
    email: string;
    cpf: string;
    dataCadastro: string;
    contas: ContaCliente[];
};

function AdminClientes() {
    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState<Usuario | null>(null);

    const [clientes, setClientes] =
        useState<Cliente[]>([]);

    const [busca, setBusca] =
        useState("");

    const [carregando, setCarregando] =
        useState(true);

    const [erro, setErro] =
        useState("");

    const [totalPendencias, setTotalPendencias] =
        useState(0);

    const [sidebarRecolhida, setSidebarRecolhida] =
        useState(false);

    const [clienteSelecionado, setClienteSelecionado] =
        useState<ClienteDetalhes | null>(null);

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
    // CARREGAR CLIENTES
    // =========================================================

    useEffect(() => {
        async function carregar() {
            const token =
                sessionStorage.getItem("corebank_token");

            const salvo =
                sessionStorage.getItem("corebank_usuario");

            if (!token || !salvo) {
                encerrarSessao();
                return;
            }

            try {
                const atual =
                    JSON.parse(salvo) as Usuario;

                const perfil =
                    atual.perfil?.toLowerCase();

                if (
                    perfil !== "admin" &&
                    perfil !== "administrador"
                ) {
                    navigate("/dashboard", {
                        replace: true,
                    });

                    return;
                }

                setUsuario(atual);

                const response = await fetch(
                    "https://localhost:7122/api/Admin/clientes",
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
                        "Não foi possível carregar os clientes."
                    );
                }

                const data =
                    (await response.json()) as Cliente[];

                setClientes(data);

                // Mantém o contador de solicitações da sidebar
                // sincronizado com o Dashboard administrativo.
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

                if (
                    dashboardResponse.status === 401 ||
                    dashboardResponse.status === 403 ||
                    senhaResponse.status === 401 ||
                    senhaResponse.status === 403
                ) {
                    encerrarSessao();
                    return;
                }

                let pendenciasConta = 0;
                let pendenciasSenha = 0;

                if (dashboardResponse.ok) {
                    const dashboardData =
                        (await dashboardResponse.json()) as {
                            solicitacoesPendentes: number;
                        };

                    pendenciasConta =
                        dashboardData.solicitacoesPendentes ?? 0;
                }

                if (senhaResponse.ok) {
                    const senhaData =
                        (await senhaResponse.json()) as unknown[];

                    pendenciasSenha = senhaData.length;
                }

                setTotalPendencias(
                    pendenciasConta + pendenciasSenha
                );
            } catch (error) {
                setErro(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível carregar os clientes."
                );
            } finally {
                setCarregando(false);
            }
        }

        carregar();
    }, []);

    // =========================================================
    // BUSCA
    // =========================================================

    const clientesFiltrados = useMemo(() => {
        const texto =
            busca.trim().toLowerCase();

        const numeros =
            busca.replace(/\D/g, "");

        if (!texto) {
            return clientes;
        }

        return clientes.filter((cliente) => {
            const nome =
                cliente.nome.toLowerCase();

            const email =
                cliente.email.toLowerCase();

            const cpf =
                cliente.cpf.replace(/\D/g, "");

            return (
                nome.includes(texto) ||
                email.includes(texto) ||
                cpf.includes(numeros)
            );
        });
    }, [busca, clientes]);

    // =========================================================
    // FORMATAÇÕES
    // =========================================================

    function formatarCpf(cpf: string) {
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

    function formatarMoeda(valor: number) {
        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
            }
        ).format(valor);
    }

    function obterSituacaoCliente(
        cliente: Cliente
    ) {
        if (cliente.quantidadeContas === 0) {
            return {
                texto: "Sem conta",
                classe: "neutral",
            };
        }

        if (cliente.contasBloqueadas > 0) {
            return {
                texto:
                    cliente.contasAtivas > 0
                        ? "Parcial"
                        : "Bloqueada",
                classe:
                    cliente.contasAtivas > 0
                        ? "pending"
                        : "rejected",
            };
        }

        return {
            texto: "Ativa",
            classe: "approved",
        };
    }

    function obterClasseConta(
        status: string
    ) {
        const valor =
            status?.toLowerCase();

        if (
            valor === "active" ||
            valor === "ativa" ||
            valor === "ativo"
        ) {
            return "approved";
        }

        if (
            valor === "blocked" ||
            valor === "bloqueada" ||
            valor === "bloqueado"
        ) {
            return "rejected";
        }

        return "pending";
    }

    function traduzirStatusConta(
        status: string
    ) {
        const valor =
            status?.toLowerCase();

        if (
            valor === "active" ||
            valor === "ativa" ||
            valor === "ativo"
        ) {
            return "Ativa";
        }

        if (
            valor === "blocked" ||
            valor === "bloqueada" ||
            valor === "bloqueado"
        ) {
            return "Bloqueada";
        }

        return status;
    }

    // =========================================================
    // DETALHES DO CLIENTE
    // =========================================================

    async function abrirDetalhes(
        clienteId: number
    ) {
        const token =
            sessionStorage.getItem(
                "corebank_token"
            );

        if (!token) {
            encerrarSessao();
            return;
        }

        setCarregandoDetalhes(true);
        setErroDetalhes("");
        setClienteSelecionado(null);

        try {
            const response = await fetch(
                `https://localhost:7122/api/Admin/clientes/${clienteId}`,
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

            if (response.status === 404) {
                throw new Error(
                    "Cliente não encontrado."
                );
            }

            if (!response.ok) {
                throw new Error(
                    "Não foi possível carregar os detalhes do cliente."
                );
            }

            const data =
                (await response.json()) as ClienteDetalhes;

            setClienteSelecionado(data);
        } catch (error) {
            setErroDetalhes(
                error instanceof Error
                    ? error.message
                    : "Não foi possível carregar os detalhes."
            );
        } finally {
            setCarregandoDetalhes(false);
        }
    }

    function fecharDetalhes() {
        setClienteSelecionado(null);
        setErroDetalhes("");
        setCarregandoDetalhes(false);
    }

    // =========================================================
    // LOADING
    // =========================================================

    if (carregando) {
        return (
            <main className= "admin-loading" >
            <strong>CoreBank </strong>

            <p>
                    Carregando clientes...
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
{/* =====================================================
                SIDEBAR
               ===================================================== */}

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
navigate("/admin")
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
className = "admin-nav-item active"
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
className = "admin-nav-item"
onClick = {() =>
navigate("/admin/contas")
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
onClick = { encerrarSessao }
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

{/* =====================================================
                CONTEÚDO
               ===================================================== */}

<section className="admin-content" >
    <header className="admin-header" >
        <div>
        <span className="admin-section-label" >
            PAINEL ADMINISTRATIVO
                </span>

                < h1 > Clientes </h1>

                <p>
                            Consulte os clientes cadastrados no CoreBank.
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

            < p > { erro } </p>
            </div>
            </div>
                )
}

{/* =================================================
                    RESUMO
                   ================================================= */}

<section className="admin-clientes-resumo" >
    <article className="admin-metric-card clients-card" >
        <div className="admin-card-glow" > </div>

            < div className = "admin-metric-heading" >
                <span>
                CLIENTES CADASTRADOS
                    </span>

                    < div className = "admin-metric-icon" >
                                ♙
</div>
    </div>

    <strong>
{ clientes.length }
</strong>

    <p>
                            clientes encontrados
    </p>
    </article>

    < article className = "admin-metric-card accounts-card" >
        <div className="admin-card-glow" > </div>

            < div className = "admin-metric-heading" >
                <span>
                CONTAS VINCULADAS
                    </span>

                    < div className = "admin-metric-icon" >
                                ▣
</div>
    </div>

    <strong>
{
    clientes.reduce(
        (soma, cliente) =>
            soma +
            cliente.quantidadeContas,
        0
    )
}
</strong>

    <p>
                            contas dos clientes
    </p>
    </article>

    < article className = "admin-metric-card balance-card" >
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
{
    clientes.reduce(
        (soma, cliente) =>
            soma +
            cliente.contasAtivas,
        0
    )
}
</strong>

    <p>
                            contas em situação ativa
    </p>
    </article>
    </section>

{/* =================================================
                    TABELA
                   ================================================= */}

<article className="admin-dashboard-panel admin-clientes-panel" >
    <div className="admin-clientes-toolbar" >
        <div>
        <span className="admin-section-label" >
            BASE DE CLIENTES
                </span>

                <h2>
                                Clientes cadastrados
    </h2>
    </div>

    < div className = "admin-clientes-search" >
        <span>⌕</span>

            < input
value = { busca }
onChange = {(event) =>
setBusca(
    event.target.value
)
                                }
placeholder = "Buscar por nome, CPF ou e-mail"
    />
    </div>
    </div>

    < div className = "admin-table-wrapper" >
        <table className="admin-table admin-clientes-table" >
            <thead>
            <tr>
            <th>CLIENTE </th>
            < th > CPF </th>
            < th > CONTAS </th>
            < th > SITUAÇÃO </th>
            < th > CADASTRO </th>
            < th > AÇÕES </th>
            </tr>
            </thead>

            <tbody>
{
    clientesFiltrados.length ===
        0 ? (
            <tr>
            <td
                                            colSpan= { 6}
                                            className = "admin-table-empty"
        >
        Nenhum cliente encontrado.
                                        </td>
            </tr>
                                ) : (
        clientesFiltrados.map(
            (cliente) => {
                const situacao =
                    obterSituacaoCliente(
                        cliente
                    );

                return (
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
                                .charAt(
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

                    < td >
                    <strong>
                    {
                        cliente.quantidadeContas
                    }
                    </strong>

                    < span className = "admin-contas-label" >
                    {
                        cliente.quantidadeContas ===
                            1
                            ? " conta"
                            : " contas"
                    }
                        </span>
                        </td>

                        < td >
                        <span
                                                            className={ `admin-status ${situacao.classe}` }
                                                        >
                {
                    situacao.texto
                }
                    </span>
                    </td>

                    <td>
                {
                    cliente.dataCadastro
                }
                </td>

                    < td >
                    <button
                                                            type="button"
                className = "admin-detalhes-button"
                onClick = {() =>
                abrirDetalhes(
                    cliente.id
                )
            }
                                                        >
            Ver detalhes
            </button>
            </td>
        </tr>
        );
}
                                    )
                                )}
</tbody>
    </table>
    </div>

    < div className = "admin-clientes-footer" >
        Exibindo{ " " }
<strong>
    { clientesFiltrados.length }
    </strong>{" "}
                        de{ " " }
<strong>
    { clientes.length }
    </strong>{" "}
clientes
    </div>
    </article>
    </section>

{/* =====================================================
                MODAL - CARREGANDO
               ===================================================== */}

{
    carregandoDetalhes && (
        <div
                    className="admin-modal-overlay"
    onClick = { fecharDetalhes }
        >
        <div
                        className="admin-cliente-modal admin-modal-loading"
    onClick = {(event) =>
    event.stopPropagation()
}
                    >
    <div className="admin-modal-spinner" > </div>

        <strong>
                            Carregando cliente...
</strong>
    </div>
    </div>
            )}

{/* =====================================================
                MODAL - ERRO
               ===================================================== */}

{
    erroDetalhes &&
        !carregandoDetalhes && (
            <div
                        className="admin-modal-overlay"
    onClick = { fecharDetalhes }
        >
        <div
                            className="admin-cliente-modal admin-modal-error"
    onClick = {(event) =>
    event.stopPropagation()
}
                        >
    <button
                                type="button"
className = "admin-modal-close"
onClick = {
    fecharDetalhes
}
    >
                                ×
</button>

    < span className = "admin-modal-error-icon" >
        !
        </span>

        <h2>
                                Não foi possível abrir
    </h2>

    <p>
{ erroDetalhes }
</p>
    </div>
    </div>
                )}

{/* =====================================================
                MODAL - DETALHES
               ===================================================== */}

{
    clienteSelecionado &&
        !carregandoDetalhes && (
            <div
                        className="admin-modal-overlay"
    onClick = { fecharDetalhes }
        >
        <div
                            className="admin-cliente-modal"
    onClick = {(event) =>
    event.stopPropagation()
}
                        >
    <div className="admin-modal-header" >
        <div className="admin-modal-cliente" >
            <div className="admin-modal-avatar" >
            {
                clienteSelecionado.nome
                    .charAt(0)
                    .toUpperCase()
            }
                </div>

                < div >
                <span className="admin-section-label" >
                    DETALHES DO CLIENTE
                        </span>

                        <h2>
{
    clienteSelecionado.nome
}
</h2>

    <p>
                                            Cliente #
{
    clienteSelecionado.id
}
</p>
    </div>
    </div>

    < button
type = "button"
className = "admin-modal-close"
onClick = {
    fecharDetalhes
}
    >
                                    ×
</button>
    </div>

    < section className = "admin-modal-section" >
        <div className="admin-modal-section-title" >
            <span>
            DADOS PESSOAIS
                </span>
                </div>

                < div className = "admin-dados-grid" >
                    <div className="admin-dado-item" >
                        <span>
                        Nome completo
                            </span>

                            <strong>
{
    clienteSelecionado.nome
}
</strong>
    </div>

    < div className = "admin-dado-item" >
        <span>
        CPF
        </span>

        <strong>
{
    formatarCpf(
        clienteSelecionado.cpf
    )
}
</strong>
    </div>

    < div className = "admin-dado-item" >
        <span>
        E - mail
        </span>

        <strong>
{
    clienteSelecionado.email
}
</strong>
    </div>

    < div className = "admin-dado-item" >
        <span>
        Cliente desde
            </span>

            <strong>
{
    clienteSelecionado.dataCadastro
}
</strong>
    </div>
    </div>
    </section>

    < section className = "admin-modal-section" >
        <div className="admin-modal-section-title admin-contas-title" >
            <span>
            CONTAS VINCULADAS
                </span>

                <strong>
{
    clienteSelecionado
        .contas
        .length
}
</strong>
    </div>

{
    clienteSelecionado
        .contas.length ===
        0 ? (
            <div className= "admin-sem-contas" >
    Este cliente ainda não possui conta vinculada.
                                    </div>
                                ) : (
        <div className= "admin-contas-lista" >
        {
            clienteSelecionado.contas.map(
                (
                    conta
                ) => (
                    <article
                                                    key= {
                        conta.id
                    }
                                                    className = "admin-conta-card"
                >
                <div className="admin-conta-card-header" >
                <div>
                <span>
                CONTA
            </span>

            <strong>
                                                                {
                    conta.numero
                }
                </strong>
                </div>

                < span
                                                            className = {`admin-status ${obterClasseConta(
                    conta.status
                )}`}
        >
        {
            traduzirStatusConta(
                conta.status
                                                            )
        }
        </span>
        </div>

        < div className = "admin-conta-info-grid" >
            <div>
            <span>
            Agência
            </span>

            <strong>
    {
        conta.agencia
    }
    </strong>
        </div>

        < div >
        <span>
        Número
        </span>

        <strong>
    {
        conta.numero
    }
    </strong>
        </div>

        < div >
        <span>
        Saldo
        </span>

        < strong className = "admin-conta-saldo" >
        {
            formatarMoeda(
                conta.saldo
                                                                )
        }
            </strong>
            </div>

            < div >
            <span>
            Criada em
                </span>

                <strong>
    {
        conta.dataCriacao
    }
    </strong>
        </div>
        </div>
        </article>
                                            )
                                        )
}
</div>
                                )}
</section>

    < div className = "admin-modal-footer" >
        <button
                                    type="button"
className = "admin-modal-close-button"
onClick = {
    fecharDetalhes
}
    >
    Fechar
    </button>
    </div>
    </div>
    </div>
                )}
</main>
    );
}

export default AdminClientes;