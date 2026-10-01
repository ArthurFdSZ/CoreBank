import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type SolicitacaoConta = {
    solicitacaoId: number;
    tipo: string;
    status: string;
    dataSolicitacao: string;

    contaId: number;
    agencia: string;
    numeroConta: string;

    clienteId: number | null;
    nomeCliente: string | null;
    cpfCliente: string | null;
};

type SolicitacaoSenha = {
    solicitacaoId: number;
    clienteId?: number;
    nomeCliente?: string;
    email?: string;
    status: string;
    dataSolicitacao?: string;
};

function AdminDashboard() {
    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState<Usuario | null>(null);

    const [
        solicitacoesConta,
        setSolicitacoesConta,
    ] = useState<SolicitacaoConta[]>([]);

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

    const [
        processandoSolicitacao,
        setProcessandoSolicitacao,
    ] = useState<string | null>(null);

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

    async function carregarSolicitacoesConta() {
        const response = await fetch(
            "https://localhost:7122/api/Admin/account-requests/pending",
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
                "Não foi possível carregar as solicitações de conta."
            );
        }

        const data =
            (await response.json()) as
            SolicitacaoConta[];

        setSolicitacoesConta(data);
    }

    async function carregarSolicitacoesSenha() {
        /*
            Esse endpoint deve retornar as solicitações
            pendentes de recuperação de senha.

            Caso o seu backend esteja usando outro nome
            para a rota, ajustaremos depois do primeiro teste.
        */
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

        /*
            Enquanto o endpoint não existir ou estiver
            com outro endereço, não quebramos o painel.
        */
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

        /*
            Proteção adicional no front.
            A segurança principal continua sendo
            feita pelo backend através do JWT.
        */
        const perfil =
            usuarioAtual.perfil?.toLowerCase();

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
                carregarSolicitacoesConta(),
                carregarSolicitacoesSenha(),
            ]);
        } catch {
            setErro(
                "Não foi possível carregar todos os dados administrativos."
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarDashboard();
    }, []);

    async function analisarSolicitacaoConta(
        solicitacaoId: number,
        acao: "approve" | "reject"
    ) {
        const chave =
            `conta-${solicitacaoId}-${acao}`;

        try {
            setProcessandoSolicitacao(chave);
            setErro("");

            const response = await fetch(
                `https://localhost:7122/api/Admin/account-requests/${solicitacaoId}/${acao}`,
                {
                    method: "POST",
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
                const mensagem =
                    await response.text();

                setErro(
                    mensagem ||
                    "Não foi possível analisar a solicitação."
                );

                return;
            }

            await carregarSolicitacoesConta();
        } catch {
            setErro(
                "Não foi possível conectar ao CoreBank."
            );
        } finally {
            setProcessandoSolicitacao(null);
        }
    }

    async function analisarSolicitacaoSenha(
        solicitacaoId: number,
        acao: "approve" | "reject"
    ) {
        const chave =
            `senha-${solicitacaoId}-${acao}`;

        try {
            setProcessandoSolicitacao(chave);
            setErro("");

            const response = await fetch(
                `https://localhost:7122/api/Admin/password-reset-requests/${solicitacaoId}/${acao}`,
                {
                    method: "POST",
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
                const mensagem =
                    await response.text();

                setErro(
                    mensagem ||
                    "Não foi possível analisar a recuperação de senha."
                );

                return;
            }

            await carregarSolicitacoesSenha();
        } catch {
            setErro(
                "Não foi possível conectar ao CoreBank."
            );
        } finally {
            setProcessandoSolicitacao(null);
        }
    }

    const totalSolicitacoesConta =
        solicitacoesConta.length;

    const totalSolicitacoesSenha =
        solicitacoesSenha.length;

    const totalPendentes =
        totalSolicitacoesConta +
        totalSolicitacoesSenha;

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
    <aside className="admin-sidebar" >
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

    < div className = "admin-profile-label" >
        <span className="admin-nav-text" >
            ADMINISTRAÇÃO
            </span>
            </div>

            < nav className = "admin-nav" >
                <button
                        type="button"
className = "admin-nav-item active"
title = "Visão geral"
    >
    <span className="admin-nav-icon" >
                            ◆
</span>

    < span className = "admin-nav-text" >
        Visão geral
            </span>
            </button>

            < button
type = "button"
className = "admin-nav-item"
title = "Solicitações"
    >
    <span className="admin-nav-icon" >
                            ◇
</span>

    < span className = "admin-nav-text" >
        Solicitações
        </span>

{
    totalPendentes > 0 && (
        <span className="admin-nav-badge" >
        { totalPendentes }
            </span>
                        )
}
</button>

    < button
type = "button"
className = "admin-nav-item"
title = "Contas"
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
title = "Clientes"
    >
    <span className="admin-nav-icon" >
                            ♙
</span>

    < span className = "admin-nav-text" >
        Clientes
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
title = "Sair"
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

        < section className = "admin-content" >
            <header className="admin-header" >
                <div>
                <span className="admin-section-label" >
                    PAINEL ADMINISTRATIVO
                        </span>

                        <h1>
                            Visão geral
    </h1>

    <p>
                            Acompanhe e analise as
    solicitações do CoreBank.
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
                                .toUpperCase() ?? "A"
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

<section className="admin-summary" >
    <article className="admin-summary-card featured" >
        <div className="admin-summary-top" >
            <span className="admin-section-label" >
                TOTAL PENDENTE
                    </span>

                    < div className = "admin-summary-icon" >
                                ◇
</div>
    </div>

    < strong className = "admin-summary-value" >
    { totalPendentes }
        </strong>

        <p>
                            solicitações aguardando
análise
    </p>
    </article>

    < article className = "admin-summary-card" >
        <div className="admin-summary-top" >
            <span className="admin-section-label" >
                CONTAS
                </span>

                < div className = "admin-summary-icon" >
                                ▣
</div>
    </div>

    < strong className = "admin-summary-value" >
    { totalSolicitacoesConta }
        </strong>

        <p>
                            bloqueios ou desbloqueios
    </p>
    </article>

    < article className = "admin-summary-card" >
        <div className="admin-summary-top" >
            <span className="admin-section-label" >
                SENHAS
                </span>

                < div className = "admin-summary-icon" >
                                ◈
</div>
    </div>

    < strong className = "admin-summary-value" >
    { totalSolicitacoesSenha }
        </strong>

        <p>
                            recuperações aguardando
análise
    </p>
    </article>
    </section>

    < section className = "admin-grid" >
        <article className="admin-panel" >
            <div className="admin-panel-header" >
                <div>
                <h2>
                Solicitações de conta
                    </h2>

                    <p>
                                    Bloqueios e
                                    desbloqueios pendentes.
                                </p>
    </div>

    < span className = "admin-counter" >
    { totalSolicitacoesConta }
        </span>
        </div>

        < div className = "admin-request-list" >
        {
            solicitacoesConta.length ===
                0 ? (
                    <div className= "admin-empty" >
            <span>
                                        ✓
                                    </span>

            <strong>
                                        Tudo em dia
    </strong>

    <p>
                                        Não existem
                                        solicitações de
                                        conta pendentes.
                                    </p>
    </div>
                            ) : (
    solicitacoesConta.map(
        (solicitacao) => (
            <div
                                            className= "admin-request"
                                            key = {
            solicitacao.solicitacaoId
        }
        >
        <div className="admin-request-icon" >
        {
            solicitacao.tipo ===
                "Bloqueio"
                ? "×"
                : "✓"
        }
        </div>

    < div className = "admin-request-info" >
    <strong>
    {
        solicitacao.nomeCliente ??
            "Cliente"
    }
    </strong>

    <span>
                                                    {
            solicitacao.tipo
        }{ " "}
                                                    • Ag.{ " "}
                                                    {
            solicitacao.agencia
        }{ " "}
                                                    • Conta{ " "}
                                                    {
            solicitacao.numeroConta
        }
        </span>

        <small>
                                                    {
            solicitacao.dataSolicitacao
        }
        </small>
        </div>

        < div className = "admin-request-actions" >
        <button
                                                    type="button"
                                                    className = "admin-approve"
                                                    disabled = {
            processandoSolicitacao !==
        null
                                                    }
        onClick = {() =>
        analisarSolicitacaoConta(
            solicitacao.solicitacaoId,
            "approve"
        )
                                                    }
                                                >
        { processandoSolicitacao ===
            `conta-${solicitacao.solicitacaoId}-approve`
            ? "..."
            : "Aprovar"}
        </button>

        < button
                                                    type = "button"
                                                    className = "admin-reject"
                                                    disabled = {
            processandoSolicitacao !==
        null
                                                    }
        onClick = {() =>
        analisarSolicitacaoConta(
            solicitacao.solicitacaoId,
            "reject"
        )
                                                    }
                                                >
        { processandoSolicitacao ===
            `conta-${solicitacao.solicitacaoId}-reject`
            ? "..."
            : "Recusar"}
        </button>
        </div>
        </div>
    )
)
                            )}
</div>
    </article>

    < article className = "admin-panel" >
        <div className="admin-panel-header" >
            <div>
            <h2>
            Recuperação de senha
                </h2>

                <p>
                                    Solicitações enviadas
                                    pelos clientes.
                                </p>
    </div>

    < span className = "admin-counter" >
    { totalSolicitacoesSenha }
        </span>
        </div>

        < div className = "admin-request-list" >
        {
            solicitacoesSenha.length ===
                0 ? (
                    <div className= "admin-empty" >
            <span>
                                        ✓
                                    </span>

            <strong>
                                        Nenhuma pendência
    </strong>

    <p>
                                        Não existem
                                        recuperações de
                                        senha aguardando
análise.
                                    </p>
    </div>
                            ) : (
    solicitacoesSenha.map(
        (solicitacao) => (
            <div
                                            className= "admin-request"
                                            key = {
            solicitacao.solicitacaoId
        }
        >
        <div className="admin-request-icon" >
                                                ◈
        </div>

        < div className = "admin-request-info" >
        <strong>
        {
            solicitacao.nomeCliente ??
                "Cliente"
        }
        </strong>

        <span>
                                                    {
            solicitacao.email ??
                "E-mail não informado"
        }
        </span>

        <small>
                                                    {
            solicitacao.dataSolicitacao ??
                solicitacao.status
        }
        </small>
        </div>

        < div className = "admin-request-actions" >
        <button
                                                    type="button"
                                                    className = "admin-approve"
                                                    disabled = {
            processandoSolicitacao !==
        null
                                                    }
        onClick = {() =>
        analisarSolicitacaoSenha(
            solicitacao.solicitacaoId,
            "approve"
        )
                                                    }
                                                >
        { processandoSolicitacao ===
            `senha-${solicitacao.solicitacaoId}-approve`
            ? "..."
            : "Aprovar"}
        </button>

        < button
                                                    type = "button"
                                                    className = "admin-reject"
                                                    disabled = {
            processandoSolicitacao !==
        null
                                                    }
        onClick = {() =>
        analisarSolicitacaoSenha(
            solicitacao.solicitacaoId,
            "reject"
        )
                                                    }
                                                >
        { processandoSolicitacao ===
            `senha-${solicitacao.solicitacaoId}-reject`
            ? "..."
            : "Recusar"}
        </button>
        </div>
        </div>
    )
)
                            )}
</div>
    </article>
    </section>
    </section>
    </main>
    );
}

export default AdminDashboard;