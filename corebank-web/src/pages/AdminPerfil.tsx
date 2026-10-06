import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./AdminDashboard.css";
import "./AdminPerfil.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type DashboardAdmin = {
    solicitacoesPendentes: number;
};

type SolicitacaoSenha = {
    solicitacaoId: number;
    status: string;
};

function AdminPerfil() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [dashboard, setDashboard] = useState<DashboardAdmin | null>(null);
    const [solicitacoesSenha, setSolicitacoesSenha] = useState<SolicitacaoSenha[]>([]);
    const [sidebarRecolhida, setSidebarRecolhida] = useState(false);

    function limparSessao() {
        sessionStorage.removeItem("corebank_token");
        sessionStorage.removeItem("corebank_usuario");
    }

    function handleLogout() {
        limparSessao();
        navigate("/login", { replace: true });
    }

    useEffect(() => {
        async function carregarNotificacoes() {
            const token = sessionStorage.getItem("corebank_token");
            const usuarioSalvo = sessionStorage.getItem("corebank_usuario");

            if (!token) {
                handleLogout();
                return;
            }

            if (usuarioSalvo) {
                try {
                    setUsuario(JSON.parse(usuarioSalvo));
                } catch {
                    setUsuario(null);
                }
            }

            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            try {
                const [respostaDashboard, respostaSenhas] = await Promise.all([
                    fetch("https://localhost:7122/api/Admin/dashboard", { headers }),
                    fetch(
                        "https://localhost:7122/api/Admin/password-reset-requests/pending",
                        { headers }
                    ),
                ]);

                if (
                    respostaDashboard.status === 401 ||
                    respostaDashboard.status === 403 ||
                    respostaSenhas.status === 401 ||
                    respostaSenhas.status === 403
                ) {
                    handleLogout();
                    return;
                }

                if (respostaDashboard.ok) {
                    const dados = (await respostaDashboard.json()) as DashboardAdmin;
                    setDashboard(dados);
                }

                if (respostaSenhas.ok) {
                    const senhas = (await respostaSenhas.json()) as SolicitacaoSenha[];
                    setSolicitacoesSenha(senhas);
                }
            } catch {
                // Mantém a página de perfil funcionando mesmo se o badge não carregar.
            }
        }

        carregarNotificacoes();
    }, []);

    const totalPendencias =
        (dashboard?.solicitacoesPendentes ?? 0) + solicitacoesSenha.length;

    const nome = usuario?.nome ?? "Administrador CoreBank";
    const email = usuario?.email ?? "E-mail não informado";
    const inicial = nome.charAt(0).toUpperCase();

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
className = "admin-nav-item"
onClick = {() => navigate("/admin/relatorios")}
                    >
    <span className="admin-nav-icon" >▤</span>
        < span className = "admin-nav-text" > Relatórios </span>
            </button>

            < button
type = "button"
className = "admin-nav-item active"
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
                                < small > Acesso protegido </small>
                                    </div>
                                    </div>

                                    < button
type = "button"
className = "admin-logout"
onClick = { handleLogout }
    >
    <span className="admin-nav-icon" >↪</span>
        < span className = "admin-nav-text" > Sair </span>
            </button>
            </div>
            </aside>

            < section className = "admin-content" >
                <header className="admin-header" >
                    <div>
                    <span className="admin-section-label" >
                        MINHA CONTA
                            </span>

                            < h1 > Perfil </h1>

                            <p>
                            Consulte seus dados e informações administrativas.
                        </p>
    </div>

    < div className = "admin-user" >
        <div className="admin-user-info" >
            <strong>{ nome } </strong>
            < span > { email } </span>
            </div>

            < div className = "admin-avatar" > { inicial } </div>
                </div>
                </header>

                < article className = "admin-perfil-hero" >
                    <div className="admin-perfil-avatar" >
                    { inicial }
                        </div>

                        < div className = "admin-perfil-identidade" >
                            <span className="admin-section-label" >
                                ADMINISTRADOR COREBANK
                                    </span>

                                    < h2 > { nome } </h2>
                                    < p > { email } </p>
                                    </div>

                                    < span className = "admin-perfil-badge" >
                                        <span />
Administrador
    </span>
    </article>

    < section className = "admin-perfil-grid" >
        <article className="admin-perfil-card" >
            <div className="admin-perfil-card-header" >
                <div>
                <span className="admin-section-label" >
                    INFORMAÇÕES
                    </span>

                    < h2 > Dados pessoais </h2>

                        <p>
                                    Informações vinculadas ao seu acesso
administrativo.
                                </p>
    </div>

    < div className = "admin-perfil-card-icon" >
                                ♙
</div>
    </div>

    < div className = "admin-perfil-dados" >
        <div className="admin-perfil-linha" >
            <span>Nome completo </span>
                < strong > { nome } </strong>
                </div>

                < div className = "admin-perfil-linha" >
                    <span>E - mail </span>
                    < strong > { email } </strong>
                    </div>

                    < div className = "admin-perfil-linha" >
                        <span>Tipo de acesso </span>
                            < strong > Administrador </strong>
                            </div>
                            </div>
                            </article>

                            < article className = "admin-perfil-card" >
                                <div className="admin-perfil-card-header" >
                                    <div>
                                    <span className="admin-section-label" >
                                        ACESSO
                                        </span>

                                        < h2 > Dados administrativos </h2>

                                            <p>
                                    Informações relacionadas ao seu perfil
                                    no sistema.
                                </p>
    </div>

    < div className = "admin-perfil-card-icon" >
                                ▣
</div>
    </div>

    < div className = "admin-perfil-dados" >
        <div className="admin-perfil-linha" >
            <span>Perfil </span>
            < strong > Administrador </strong>
            </div>

            < div className = "admin-perfil-linha" >
                <span>Nível de acesso </span>
                    < strong > Administrativo </strong>
                    </div>

                    < div className = "admin-perfil-linha" >
                        <span>Status </span>
                        < strong className = "admin-perfil-status" >
                            Ativo
                            </strong>
                            </div>
                            </div>
                            </article>
                            </section>

                            < article className = "admin-perfil-seguranca" >
                                <div className="admin-perfil-card-header" >
                                    <div>
                                    <span className="admin-section-label" >
                                        SEGURANÇA
                                        </span>

                                        < h2 > Acesso e segurança </h2>

                                            <p>
                                Gerencie a segurança da sua sessão
administrativa.
                            </p>
    </div>

    < div className = "admin-perfil-card-icon" >
                            ✓
</div>
    </div>

    < div className = "admin-perfil-seguranca-linha" >
        <div>
        <strong>Sessão administrativa </strong>
            <span>
                                Finalize seu acesso neste dispositivo.
                            </span>
    </div>

    < button
type = "button"
onClick = { handleLogout }
    >
    Sair da conta
        </button>
        </div>
        </article>
        </section>
        </main>
    );
}

export default AdminPerfil;