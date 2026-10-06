import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Solicitacoes.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type Solicitacao = {
    id: number;
    type?: string;
    tipo?: string;
    description?: string;
    descricao?: string;
    motivo?: string;
    reason?: string;
    status?: string;
    createdAt?: string;
    dataHora?: string;
};

function Solicitacoes() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [filtro, setFiltro] = useState("Todos");
    const [sidebarRecolhida, setSidebarRecolhida] = useState(false);
    const [confirmacao, setConfirmacao] = useState<"bloqueio" | "desbloqueio" | null>(null);
    const [motivo, setMotivo] = useState("");

    const API_URL = "https://localhost:7122";

    function obterToken() {
        return sessionStorage.getItem("corebank_token");
    }

    function obterUsuarioSalvo(): Usuario | null {
        const usuarioSalvo = sessionStorage.getItem("corebank_usuario");

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

    function sair() {
        limparSessao();

        navigate("/login", {
            replace: true,
        });
    }

    async function tratarResposta(resposta: Response) {
        if (resposta.status === 401 || resposta.status === 403) {
            limparSessao();

            navigate("/login", {
                replace: true,
            });

            throw new Error("Sessão expirada.");
        }

        const texto = await resposta.text();

        let dados: any = null;

        if (texto) {
            try {
                dados = JSON.parse(texto);
            } catch {
                dados = texto;
            }
        }

        if (!resposta.ok) {
            let mensagemErro = "Não foi possível concluir a operação.";

            if (typeof dados === "string") {
                mensagemErro = dados;
            }

            if (dados?.message) {
                mensagemErro = dados.message;
            }

            if (dados?.mensagem) {
                mensagemErro = dados.mensagem;
            }

            if (dados?.title) {
                mensagemErro = dados.title;
            }

            throw new Error(mensagemErro);
        }

        return dados;
    }

    async function carregarSolicitacoes() {
        const token = obterToken();
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
                `${API_URL}/api/AccountRequests/me`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const dados = await tratarResposta(resposta);

            if (Array.isArray(dados)) {
                setSolicitacoes(dados);
                return;
            }

            if (Array.isArray(dados?.requests)) {
                setSolicitacoes(dados.requests);
                return;
            }

            if (Array.isArray(dados?.solicitacoes)) {
                setSolicitacoes(dados.solicitacoes);
                return;
            }

            setSolicitacoes([]);
        } catch (error) {
            if (error instanceof Error && error.message !== "Sessão expirada.") {
                setErro(error.message);
            }
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarSolicitacoes();
    }, []);

    async function solicitarBloqueio() {
        const motivoNormalizado = motivo.trim();

        if (!motivoNormalizado) {
            setErro("Informe o motivo da solicitação.");
            return;
        }

        if (motivoNormalizado.length > 500) {
            setErro("O motivo deve ter no máximo 500 caracteres.");
            return;
        }

        const token = obterToken();

        if (!token) {
            sair();
            return;
        }

        setProcessando(true);
        setErro("");
        setMensagem("");

        try {
            const resposta = await fetch(
                `${API_URL}/api/AccountRequests/me/block`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        motivo: motivoNormalizado,
                    }),
                }
            );

            const dados = await tratarResposta(resposta);

            setMensagem(
                dados?.message ??
                dados?.mensagem ??
                "Solicitação de bloqueio realizada com sucesso."
            );

            await carregarSolicitacoes();
            setMotivo("");
            setConfirmacao(null);
        } catch (error) {
            if (error instanceof Error && error.message !== "Sessão expirada.") {
                setErro(error.message);
            }
        } finally {
            setProcessando(false);
        }
    }

    async function solicitarDesbloqueio() {
        const motivoNormalizado = motivo.trim();

        if (!motivoNormalizado) {
            setErro("Informe o motivo da solicitação.");
            return;
        }

        if (motivoNormalizado.length > 500) {
            setErro("O motivo deve ter no máximo 500 caracteres.");
            return;
        }

        const token = obterToken();

        if (!token) {
            sair();
            return;
        }

        setProcessando(true);
        setErro("");
        setMensagem("");

        try {
            const resposta = await fetch(
                `${API_URL}/api/AccountRequests/me/unblock`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        motivo: motivoNormalizado,
                    }),
                }
            );

            const dados = await tratarResposta(resposta);

            setMensagem(
                dados?.message ??
                dados?.mensagem ??
                "Solicitação de desbloqueio realizada com sucesso."
            );

            await carregarSolicitacoes();
            setMotivo("");
            setConfirmacao(null);
        } catch (error) {
            if (error instanceof Error && error.message !== "Sessão expirada.") {
                setErro(error.message);
            }
        } finally {
            setProcessando(false);
        }
    }

    function obterTipo(solicitacao: Solicitacao) {
        return solicitacao.tipo ?? solicitacao.type ?? "Solicitação";
    }

    function obterDescricao(solicitacao: Solicitacao) {
        return (
            solicitacao.descricao ??
            solicitacao.description ??
            "Solicitação registrada no CoreBank."
        );
    }

    function obterMotivo(solicitacao: Solicitacao) {
        return solicitacao.motivo ?? solicitacao.reason ?? "";
    }

    function obterStatus(solicitacao: Solicitacao) {
        return solicitacao.status ?? "Pendente";
    }

    function formatarData(data?: string) {
        if (!data) {
            return "-";
        }

        if (data.includes("/") && data.includes(":")) {
            return data;
        }

        const dataConvertida = new Date(data);

        if (Number.isNaN(dataConvertida.getTime())) {
            return data;
        }

        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(dataConvertida);
    }

    function classeStatus(status: string) {
        const statusNormalizado = status.toLowerCase();

        if (
            statusNormalizado.includes("conclu") ||
            statusNormalizado.includes("aprov")
        ) {
            return "status-concluida";
        }

        if (
            statusNormalizado.includes("cancel") ||
            statusNormalizado.includes("recus") ||
            statusNormalizado.includes("rejeit")
        ) {
            return "status-rejeitada";
        }

        if (
            statusNormalizado.includes("análise") ||
            statusNormalizado.includes("analise")
        ) {
            return "status-analise";
        }

        return "status-pendente";
    }

    const solicitacoesFiltradas = solicitacoes.filter((solicitacao) => {
        if (filtro === "Todos") {
            return true;
        }

        const tipo = obterTipo(solicitacao).toLowerCase();

        if (filtro === "Bloqueio") {
            return tipo.includes("bloque") && !tipo.includes("desbloque");
        }

        if (filtro === "Desbloqueio") {
            return tipo.includes("desbloque");
        }

        return true;
    });

    return (
        <main
            className= {`solicitacoes-page ${sidebarRecolhida ? "sidebar-collapsed" : ""
            }`
}
        >
    <aside className="solicitacoes-sidebar" >
        <div className="sidebar-header" >
            <strong className="corebank-logo" >
                <span>Core </span>
                < span className = "logo-bank" > Bank </span>
                    </strong>

                    < button
type = "button"
className = "sidebar-toggle"
onClick = {() =>
setSidebarRecolhida(!sidebarRecolhida)
                        }
                    >
{ sidebarRecolhida? "›": "‹" }
    </button>
    </div>

    < nav className = "solicitacoes-nav" >
        <button
                        type="button"
className = "nav-item"
onClick = {() => navigate("/dashboard")}
                    >
    <span className="nav-icon" >◆</span>
        < span className = "nav-text" > Início </span>
            </button>

            < button
type = "button"
className = "nav-item"
onClick = {() => navigate("/transacoes")}
                    >
    <span className="nav-icon" >➤</span>
        < span className = "nav-text" > Transações </span>
            </button>

            < button
type = "button"
className = "nav-item"
onClick = {() => navigate("/extrato")}
                    >
    <span className="nav-icon" >▤</span>
        < span className = "nav-text" > Extrato </span>
            </button>

            < button
type = "button"
className = "nav-item active"
    >
    <span className="nav-icon" >◇</span>
        < span className = "nav-text" > Solicitações </span>
            </button>

            < button
type = "button"
className = "nav-item"
onClick = {() => navigate("/perfil")}
                    >
    <span className="nav-icon" >♟</span>
        < span className = "nav-text" > Perfil </span>
            </button>
            </nav>

            < div className = "sidebar-footer" >
                <div className="security-box" >
                    <span className="security-icon" >✓</span>

                        < div className = "security-text" >
                            <strong>Ambiente seguro </strong>
                                < small > Sessão protegida </small>
                                    </div>
                                    </div>

                                    < button
type = "button"
className = "logout-button"
onClick = { sair }
    >
    <span className="nav-icon" >↪</span>
        < span className = "nav-text" > Sair </span>
            </button>
            </div>
            </aside>

            < section className = "solicitacoes-content" >
                <header className="solicitacoes-header" >
                    <div>
                    <span className="section-label" > SOLICITAÇÕES </span>

                        < h1 > Solicitações </h1>

                        <p>
                            Gerencie suas solicitações de forma simples e segura.
                        </p>
    </div>

    < div className = "header-user" >
        <div className="header-user-info" >
            <strong>
            { usuario?.nome ?? "Cliente CoreBank"}
</strong>

    <span>
{ usuario?.email ?? "" }
</span>
    </div>

    < div className = "user-avatar" >
    { usuario?.nome?.charAt(0).toUpperCase() ?? "C" }
        </div>
        </div>
        </header>

{
    erro && (
        <div className="feedback feedback-error" >
            <span>!</span>

            < div >
            <strong>Não foi possível concluir a operação </strong>
                < p > { erro } </p>
                </div>
                </div>
                )
}

{
    mensagem && (
        <div className="feedback feedback-success" >
            <span>✓</span>

                < div >
                <strong>Solicitação registrada </strong>
                    < p > { mensagem } </p>
                    </div>
                    </div>
                )
}

<section className="request-actions" >
    <button
                        type="button"
className = "request-card"
onClick = {() => {
    setErro("");
    setMotivo("");
    setConfirmacao("bloqueio");
}}
disabled = { processando }
    >
    <div className="request-card-icon" >
                            🔒
</div>

    < div className = "request-card-text" >
        <strong>Bloquear conta </strong>

            <p>
                                Bloqueie sua conta em caso de perda,
    roubo ou por segurança.
                            </p>
        </div>

        < span className = "request-arrow" >›</span>
            </button>

            < button
type = "button"
className = "request-card"
onClick = {() => {
    setErro("");
    setMotivo("");
    setConfirmacao("desbloqueio");
}}
disabled = { processando }
    >
    <div className="request-card-icon" >
                            🔓
</div>

    < div className = "request-card-text" >
        <strong>Desbloquear conta </strong>

            <p>
                                Solicite o desbloqueio da sua conta após
                                verificação de segurança.
                            </p>
    </div>

    < span className = "request-arrow" >›</span>
        </button>
        </section>

        < section className = "requests-panel" >
            <div className="requests-panel-header" >
                <div>
                <h2>Minhas solicitações </h2>

                    <p>
                                Acompanhe o status de todas as suas solicitações.
                            </p>
    </div>

    < select
value = { filtro }
onChange = {(event) =>
setFiltro(event.target.value)
                            }
                        >
    <option value="Todos" >
        Todos os tipos
            </option>

            < option value = "Bloqueio" >
                Bloqueio
                </option>

                < option value = "Desbloqueio" >
                    Desbloqueio
                    </option>
                    </select>
                    </div>

{
    carregando ? (
        <div className= "requests-empty" >
        <div className="empty-icon" >◌</div>

            < strong > Carregando solicitações...</strong>
                </div>
                    ) : solicitacoesFiltradas.length === 0 ? (
        <div className= "requests-empty" >
        <div className="empty-icon" >◇</div>

            < strong > Nenhuma solicitação encontrada </strong>

                <p>
                                Suas solicitações aparecerão aqui.
                            </p>
        </div>
                    ) : (
        <div className= "requests-table" >
        <div className="requests-table-header" >
            <span>ID </span>
            < span > Tipo de solicitação </span>
                < span > Descrição </span>
                < span > Status </span>
                < span > Data da solicitação </span>
                    </div>

    {
        solicitacoesFiltradas.map((solicitacao) => {
            const status = obterStatus(solicitacao);

            return (
                <div
                                        className= "requests-table-row"
            key = { solicitacao.id }
                >
                <span className="request-id" >
                                            #{ solicitacao.id }
            </span>

                <strong>
            { obterTipo(solicitacao) }
            </strong>

                < span className = "request-description" >
                { obterDescricao(solicitacao) }

            {
                obterMotivo(solicitacao) && (
                    <small className="request-reason" >
                        Motivo: { obterMotivo(solicitacao) }
                </small>
                        )
    }
    </span>

        < span
    className = {`request-status ${classeStatus(
        status
    )}`
}
                                        >
{ status }
    </span>

    <span>
{
    formatarData(
        solicitacao.createdAt ??
        solicitacao.dataHora
    )
}
</span>
    </div>
                                );
})}
</div>
                    )}
</section>
    </section>

{
    confirmacao && (
        <div
                    className="confirmacao-overlay"
    role = "presentation"
    onMouseDown = {(event) => {
        if (event.target === event.currentTarget && !processando) {
            setConfirmacao(null);
        }
    }
}
                >
    <section
                        className="confirmacao-modal"
role = "dialog"
aria-modal="true"
aria-labelledby="confirmacao-titulo"
    >
    <button
                            type="button"
className = "confirmacao-fechar"
onClick = {() => {
    setConfirmacao(null);
    setMotivo("");
}}
disabled = { processando }
aria-label="Fechar confirmação"
    >
                            ×
</button>

    < div className = "confirmacao-icone" >
    { confirmacao === "bloqueio" ? "◆" : "◇"}
</div>

    < span className = "confirmacao-label" > CONFIRMAÇÃO </span>

        < h2 id = "confirmacao-titulo" >
        { confirmacao === "bloqueio"
            ? "Solicitar bloqueio da conta?"
            : "Solicitar desbloqueio da conta?"}
</h2>

    <p>
{
    confirmacao === "bloqueio"
        ? "Sua conta continuará ativa até que a solicitação seja analisada pelo administrador."
        : "O desbloqueio será realizado somente após a solicitação ser analisada e aprovada pelo administrador."
}
</p>

    < div className = "confirmacao-motivo" >
        <label htmlFor="motivo-solicitacao" >
            Motivo da solicitação
                </label>

                < textarea
id = "motivo-solicitacao"
value = { motivo }
onChange = {(event) =>
setMotivo(event.target.value)
            }
maxLength = { 500}
disabled = { processando }
placeholder = {
    confirmacao === "bloqueio"
    ? "Explique por que deseja bloquear sua conta..."
    : "Explique por que deseja desbloquear sua conta..."
            }
        />

    < div className = "confirmacao-motivo-footer" >
        <small>
        Campo obrigatório
            </small>

            <span>
{ motivo.length }/500
    </span>
    </div>
    </div>

    < div className = "confirmacao-aviso" >
        <span>i </span>
        < div >
        <strong>Análise necessária </strong>
            <small>
                                    A solicitação ficará com status Pendente até a análise administrativa.
                                </small>
    </div>
    </div>

    < div className = "confirmacao-acoes" >
        <button
                                type="button"
className = "confirmacao-cancelar"
onClick = {() => {
    setConfirmacao(null);
    setMotivo("");
}}
disabled = { processando }
    >
    Cancelar
    </button>

    < button
type = "button"
className = "confirmacao-confirmar"
onClick = {
    confirmacao === "bloqueio"
    ? solicitarBloqueio
    : solicitarDesbloqueio
                                }
disabled = { processando || !motivo.trim() }
    >
{
    processando
    ? "Enviando..."
        : confirmacao === "bloqueio"
            ? "Confirmar bloqueio"
            : "Confirmar desbloqueio"
}
    </button>
    </div>
    </section>
    </div>
            )}
</main>
    );
}

export default Solicitacoes;