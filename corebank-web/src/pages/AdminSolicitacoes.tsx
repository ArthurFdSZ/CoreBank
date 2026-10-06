import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./AdminDashboard.css";
import "./AdminSolicitacoes.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type Solicitacao = {
    solicitacaoId: number;
    tipo: string;
    motivo: string;
    status: string;
    dataSolicitacao: string;
    dataAnalise: string | null;
    contaId: number;
    agencia: string;
    numeroConta: string;
    statusConta: string;
    clienteId: number | null;
    nomeCliente: string | null;
    cpfCliente: string | null;
    emailCliente?: string | null;
    origem?: "conta" | "senha";
};

type FiltroStatus = "todas" | "pendentes" | "aprovadas" | "rejeitadas";
type AcaoAnalise = "approve" | "reject" | null;

function AdminSolicitacoes() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
    const [selecionada, setSelecionada] = useState<Solicitacao | null>(null);
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todas");
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState<AcaoAnalise>(null);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [sidebarRecolhida, setSidebarRecolhida] = useState(false);

    function encerrarSessao() {
        sessionStorage.removeItem("corebank_token");
        sessionStorage.removeItem("corebank_usuario");
        navigate("/login", { replace: true });
    }

    function obterToken() {
        return sessionStorage.getItem("corebank_token");
    }

    function normalizarStatus(status: string) {
        return status.trim().toLowerCase();
    }

    function classeStatus(status: string) {
        const valor = normalizarStatus(status);

        if (valor.startsWith("aprov") || valor.startsWith("conclu")) return "approved";
        if (valor.startsWith("rejeit") || valor.startsWith("recus")) return "rejected";
        return "pending";
    }

    function formatarCpf(cpf: string | null) {
        if (!cpf) return "CPF não informado";

        const numeros = cpf.replace(/\D/g, "");
        if (numeros.length !== 11) return cpf;

        return numeros.replace(
            /(\d{3})(\d{3})(\d{3})(\d{2})/,
            "$1.$2.$3-$4"
        );
    }

    async function lerResposta(response: Response) {
        const texto = await response.text();
        let dados: any = null;

        if (texto) {
            try {
                dados = JSON.parse(texto);
            } catch {
                dados = texto;
            }
        }

        if (response.status === 401 || response.status === 403) {
            encerrarSessao();
            throw new Error("Sessão expirada.");
        }

        if (!response.ok) {
            const mensagemErro =
                typeof dados === "string"
                    ? dados
                    : dados?.mensagem ??
                    dados?.message ??
                    dados?.title ??
                    "Não foi possível concluir a operação.";

            throw new Error(mensagemErro);
        }

        return dados;
    }

    async function carregarSolicitacoes() {
        const token = obterToken();
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
            setErro("");

            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const [contasResponse, senhasResponse] = await Promise.all([
                fetch(
                    "https://localhost:7122/api/Admin/account-requests",
                    { headers }
                ),
                fetch(
                    "https://localhost:7122/api/Admin/password-reset-requests",
                    { headers }
                ),
            ]);

            const dadosContas = await lerResposta(contasResponse);
            const dadosSenhas = await lerResposta(senhasResponse);

            const solicitacoesConta: Solicitacao[] = Array.isArray(dadosContas)
                ? dadosContas.map((item: Solicitacao) => ({
                    ...item,
                    origem: "conta" as const,
                }))
                : [];

            const solicitacoesSenha: Solicitacao[] = Array.isArray(dadosSenhas)
                ? dadosSenhas.map((item: any) => ({
                    solicitacaoId: item.solicitacaoId,
                    tipo: "Recuperação de senha",
                    motivo: "Solicitação de recuperação de senha.",
                    status: item.status,
                    dataSolicitacao: item.dataSolicitacao,
                    dataAnalise: item.dataAnalise ?? null,
                    contaId: 0,
                    agencia: "-",
                    numeroConta: "-",
                    statusConta: "-",
                    clienteId: item.clienteId ?? null,
                    nomeCliente: item.nomeCliente ?? null,
                    cpfCliente: item.cpfCliente ?? null,
                    emailCliente: item.emailCliente ?? null,
                    origem: "senha" as const,
                }))
                : [];

            setSolicitacoes([...solicitacoesConta, ...solicitacoesSenha]);
        } catch (error) {
            if (error instanceof Error && error.message !== "Sessão expirada.") {
                setErro(error.message);
            }
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        void carregarSolicitacoes();
    }, []);

    async function analisarSolicitacao(acao: "approve" | "reject") {
        if (!selecionada || processando) return;

        const token = obterToken();
        if (!token) {
            encerrarSessao();
            return;
        }

        setProcessando(acao);
        setErro("");
        setMensagem("");

        try {
            const recurso =
                selecionada.origem === "senha"
                    ? "password-reset-requests"
                    : "account-requests";

            const response = await fetch(
                `https://localhost:7122/api/Admin/${recurso}/${selecionada.solicitacaoId}/${acao}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const dados = await lerResposta(response);

            setMensagem(
                dados?.mensagem ??
                (acao === "approve"
                    ? "Solicitação aprovada com sucesso."
                    : "Solicitação rejeitada com sucesso.")
            );

            setSelecionada(null);
            await carregarSolicitacoes();
        } catch (error) {
            if (error instanceof Error && error.message !== "Sessão expirada.") {
                setErro(error.message);
            }
        } finally {
            setProcessando(null);
        }
    }

    const totalPendentes = useMemo(
        () => solicitacoes.filter((item) => classeStatus(item.status) === "pending").length,
        [solicitacoes]
    );

    const totalAprovadas = useMemo(
        () => solicitacoes.filter((item) => classeStatus(item.status) === "approved").length,
        [solicitacoes]
    );

    const totalRejeitadas = useMemo(
        () => solicitacoes.filter((item) => classeStatus(item.status) === "rejected").length,
        [solicitacoes]
    );

    const totalBloqueios = useMemo(
        () => solicitacoes.filter((item) => item.tipo.toLowerCase() === "bloqueio").length,
        [solicitacoes]
    );

    const solicitacoesFiltradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();

        return solicitacoes.filter((item) => {
            const status = classeStatus(item.status);

            const correspondeStatus =
                filtroStatus === "todas" ||
                (filtroStatus === "pendentes" && status === "pending") ||
                (filtroStatus === "aprovadas" && status === "approved") ||
                (filtroStatus === "rejeitadas" && status === "rejected");

            const conteudo = [
                item.nomeCliente,
                item.cpfCliente,
                item.emailCliente,
                item.agencia,
                item.numeroConta,
                item.tipo,
                item.motivo,
                item.status,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return correspondeStatus && (!termo || conteudo.includes(termo));
        });
    }, [solicitacoes, busca, filtroStatus]);

    if (carregando) {
        return (
            <main className= "admin-page admin-solicitacoes-loading-page" >
            <div className="admin-solicitacoes-loading" >
                <strong>CoreBank </strong>
                < span > Carregando solicitações...</span>
                    </div>
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
            <div className="admin-logo" >
                <span className="admin-logo-core" > Core </span>
                    < span className = "admin-logo-bank" > Bank </span>
                        </div>

                        < button
type = "button"
className = "admin-sidebar-toggle"
onClick = {() => setSidebarRecolhida(!sidebarRecolhida)}
aria-label="Recolher menu"
    >
{ sidebarRecolhida? "›": "‹" }
    </button>
    </div>

    < div className = "admin-profile-label" >
        <span className="admin-nav-text" > ADMINISTRAÇÃO </span>
            </div>

            < nav className = "admin-nav" >
                <button
                        type="button"
className = "admin-nav-item"
onClick = {() => navigate("/admin")}
                    >
    <span className="admin-nav-icon" >◆</span>
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
className = "admin-nav-item active"
onClick = {() => navigate("/admin/solicitacoes")}
                    >
    <span className="admin-nav-icon" >◇</span>
        < span className = "admin-nav-text" > Solicitações </span>
{
    totalPendentes > 0 && (
        <span className="admin-nav-badge" > { totalPendentes } </span>
                        )
}
</button>

    < button type = "button" className = "admin-nav-item"
onClick = {() => navigate("/admin/relatorios")}
>
    <span className="admin-nav-icon" >▤</span>
        < span className = "admin-nav-text" > Relatórios </span>
            </button>

            < button type = "button" className = "admin-nav-item"
onClick = {() => navigate("/admin/perfil")}
>
    <span className="admin-nav-icon" >◉</span>
        < span className = "admin-nav-text" > Perfil </span>
            </button>
            </nav>

            < div className = "admin-sidebar-footer" >
                <div className="admin-security-box" >
                    <span className="admin-security-icon" >✓</span>
                        < div className = "admin-security-text" >
                            <strong>Área administrativa </strong>
                                < span > Acesso protegido </span>
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

            < section className = "admin-content" >
                <header className="admin-header" >
                    <div>
                    <span className="admin-section-label" > PAINEL ADMINISTRATIVO </span>
                        < h1 > Solicitações </h1>
                        < p > Analise solicitações de bloqueio e desbloqueio de contas.</p>
                            </div>

                            < div className = "admin-user" >
                                <div className="admin-user-info" >
                                    <strong>{ usuario?.nome ?? "Administrador"}</strong>
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

{
    mensagem && (
        <div className="admin-solicitacoes-success" >
            <span>✓</span>
                < div >
                <strong>Solicitação atualizada </strong>
                    < p > { mensagem } </p>
                    </div>
                    </div>
                )
}

<section className="admin-solicitacoes-resumo" >
    <article className="admin-metric-card requests-card" >
        <div className="admin-card-glow" > </div>
            < div className = "admin-metric-heading" >
                <span>PENDENTES </span>
                < div className = "admin-metric-icon" > !</div>
                    </div>
                    < strong > { totalPendentes } </strong>
                    < p > aguardando análise </p>
                        </article>

                        < article className = "admin-metric-card accounts-card" >
                            <div className="admin-card-glow" > </div>
                                < div className = "admin-metric-heading" >
                                    <span>TOTAL </span>
                                    < div className = "admin-metric-icon" >◇</div>
                                        </div>
                                        < strong > { solicitacoes.length } </strong>
                                        < p > solicitações registradas </p>
                                            </article>

                                            < article className = "admin-metric-card clients-card" >
                                                <div className="admin-card-glow" > </div>
                                                    < div className = "admin-metric-heading" >
                                                        <span>BLOQUEIOS </span>
                                                        < div className = "admin-metric-icon" >▣</div>
                                                            </div>
                                                            < strong > { totalBloqueios } </strong>
                                                            < p > pedidos de bloqueio </p>
                                                                </article>

                                                                < article className = "admin-metric-card balance-card" >
                                                                    <div className="admin-card-glow" > </div>
                                                                        < div className = "admin-metric-heading" >
                                                                            <span>ANALISADAS </span>
                                                                            < div className = "admin-metric-icon" >✓</div>
                                                                                </div>
                                                                                < strong > { totalAprovadas + totalRejeitadas}</strong>
                                                                                    < p > decisões concluídas </p>
                                                                                        </article>
                                                                                        </section>

                                                                                        < article className = "admin-dashboard-panel admin-solicitacoes-panel" >
                                                                                            <div className="admin-solicitacoes-toolbar" >
                                                                                                <div>
                                                                                                <span className="admin-section-label" > SOLICITAÇÕES DE CONTA </span>
                                                                                                    < h2 > Histórico de solicitações </h2>
                                                                                                        </div>

                                                                                                        < div className = "admin-solicitacoes-search" >
                                                                                                            <span>⌕</span>
                                                                                                                < input
value = { busca }
onChange = {(event) => setBusca(event.target.value)}
placeholder = "Cliente, CPF, agência ou conta"
    />
    </div>
    </div>

    < div className = "admin-solicitacoes-filtros" >
        <button
                            type="button"
className = { filtroStatus === "todas" ? "active" : ""}
onClick = {() => setFiltroStatus("todas")}
                        >
    Todas < span > { solicitacoes.length } </span>
    </button>

    < button
type = "button"
className = { filtroStatus === "pendentes" ? "active" : ""}
onClick = {() => setFiltroStatus("pendentes")}
                        >
    Pendentes < span > { totalPendentes } </span>
    </button>

    < button
type = "button"
className = { filtroStatus === "aprovadas" ? "active" : ""}
onClick = {() => setFiltroStatus("aprovadas")}
                        >
    Aprovadas < span > { totalAprovadas } </span>
    </button>

    < button
type = "button"
className = { filtroStatus === "rejeitadas" ? "active" : ""}
onClick = {() => setFiltroStatus("rejeitadas")}
                        >
    Rejeitadas < span > { totalRejeitadas } </span>
    </button>
    </div>

    < div className = "admin-table-wrapper" >
        <table className="admin-table admin-solicitacoes-table" >
            <thead>
            <tr>
            <th>CLIENTE </th>
            < th > CONTA </th>
            < th > TIPO </th>
            < th > DATA </th>
            < th > STATUS </th>
            < th > AÇÃO </th>
            </tr>
            </thead>

            <tbody>
{
    solicitacoesFiltradas.length === 0 ? (
        <tr>
        <td colSpan= { 6} >
        <div className="admin-table-empty" >
            Nenhuma solicitação encontrada.
                                            </div>
                </td>
                </tr>
                                ) : (
        solicitacoesFiltradas.map((item) => (
            <tr key= { `${item.origem ?? "conta"}-${item.solicitacaoId}` } >
                <td>
                <div className="admin-solicitacao-cliente" >
                    <div className="admin-solicitacao-avatar" >
                    { item.nomeCliente?.charAt(0).toUpperCase() ?? "C" }
                        </div>
                        < div >
                        <strong>{ item.nomeCliente ?? "Cliente" } </strong>
                        < span > { formatarCpf(item.cpfCliente) } </span>
                        </div>
                        </div>
                        </td>
                        < td >
                        <strong>{ item.agencia } / { item.numeroConta } </strong>
                        </td>
                        < td >
                        <span className={ `admin-solicitacao-tipo ${item.tipo.toLowerCase() === "bloqueio" ? "block" : "unblock"}` }>
                        { item.tipo }
                            </span>
                            </td>
                            < td > { item.dataSolicitacao } </td>
                            < td >
                            <span className={ `admin-status ${classeStatus(item.status)}` }>
                            { item.status }
                                </span>
                                </td>
                                < td >
                                <button
                                                    type="button"
className = "admin-solicitacao-detalhes"
onClick = {() => {
    setMensagem("");
    setErro("");
    setSelecionada(item);
}}
                                                >
{ classeStatus(item.status) === "pending" ? "Analisar" : "Detalhes"}
</button>
    </td>
    </tr>
                                    ))
                                )}
</tbody>
    </table>
    </div>

    < div className = "admin-solicitacoes-footer" >
        Exibindo < strong > { solicitacoesFiltradas.length } </strong> de{" "}
        < strong > { solicitacoes.length } </strong> solicitações
        </div>
        </article>
        </section>

{
    selecionada && (
        <div
                    className="admin-solicitacao-modal-backdrop"
    onMouseDown = {(event) => {
        if (event.target === event.currentTarget && !processando) {
            setSelecionada(null);
        }
    }
}
                >
    <section className="admin-solicitacao-modal" >
        <div className="admin-solicitacao-modal-header" >
            <div>
            <span className="admin-section-label" > ANÁLISE DA SOLICITAÇÃO </span>
                < h2 > Solicitação #{ selecionada.solicitacaoId } </h2>
                    < p > Confira os dados antes de aprovar ou rejeitar.</p>
                        </div>

                        < button
type = "button"
className = "admin-solicitacao-modal-close"
onClick = {() => setSelecionada(null)}
disabled = {!!processando}
aria-label="Fechar"
    >
                                ×
</button>
    </div>

    < div className = "admin-solicitacao-modal-grid" >
        <div>
        <span>CLIENTE </span>
        < strong > { selecionada.nomeCliente ?? "Cliente" } </strong>
        </div>
        < div >
        <span>CPF </span>
        < strong > { formatarCpf(selecionada.cpfCliente) } </strong>
        </div>
        < div >
        <span>AGÊNCIA </span>
        < strong > { selecionada.agencia } </strong>
        </div>
        < div >
        <span>CONTA </span>
        < strong > { selecionada.numeroConta } </strong>
        </div>
        < div >
        <span>TIPO </span>
        < strong > { selecionada.tipo } </strong>
        </div>
        < div >
        <span>DATA DA SOLICITAÇÃO </span>
            < strong > { selecionada.dataSolicitacao } </strong>
            </div>
            </div>

            < div className = "admin-solicitacao-motivo" >
                <span>MOTIVO INFORMADO PELO CLIENTE </span>
                    < p > { selecionada.motivo?.trim() || "Nenhum motivo foi informado." } </p>
                    </div>

                    < div className = "admin-solicitacao-modal-status" >
                        <div>
                        <span>STATUS DA SOLICITAÇÃO </span>
                            < span className = {`admin-status ${classeStatus(selecionada.status)}`}>
                            { selecionada.status }
                                </span>
                                </div>
                                < div >
                                <span>STATUS DA CONTA </span>
                                    < strong > { selecionada.statusConta } </strong>
                                    </div>
                                    </div>

{
    selecionada.dataAnalise && (
        <div className="admin-solicitacao-data-analise" >
            Analisada em < strong > { selecionada.dataAnalise } </strong>
                </div>
                        )
}

<div className="admin-solicitacao-modal-actions" >
    <button
                                type="button"
className = "admin-solicitacao-secondary"
onClick = {() => setSelecionada(null)}
disabled = {!!processando}
                            >
    Fechar
    </button>

{
    classeStatus(selecionada.status) === "pending" && (
        <>
        <button
                                        type="button"
    className = "admin-solicitacao-reject"
    onClick = {() => void analisarSolicitacao("reject")
}
disabled = {!!processando}
                                    >
{ processando === "reject" ? "Rejeitando..." : "Rejeitar"}
</button>

    < button
type = "button"
className = "admin-solicitacao-approve"
onClick = {() => void analisarSolicitacao("approve")}
disabled = {!!processando}
                                    >
{ processando === "approve" ? "Aprovando..." : "Aprovar"}
</button>
    </>
                            )}
</div>
    </section>
    </div>
            )}
</main>
    );
}

export default AdminSolicitacoes;
