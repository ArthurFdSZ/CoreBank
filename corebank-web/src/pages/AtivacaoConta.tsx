import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AtivacaoConta.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type Solicitacao = {
    id?: number;
    tipo?: string;
    status?: string;
    motivo?: string;
};

function AtivacaoConta() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [pendente, setPendente] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [erro, setErro] = useState("");

    const token = sessionStorage.getItem("corebank_token");

    useEffect(() => {
        const usuarioSalvo = sessionStorage.getItem(
            "corebank_usuario"
        );

        if (!token || !usuarioSalvo) {
            navigate("/login", {
                replace: true,
            });

            return;
        }

        setUsuario(
            JSON.parse(usuarioSalvo) as Usuario
        );

        void verificarSituacao();
    }, []);

    async function verificarSituacao() {
        if (!token) {
            return;
        }

        try {
            setCarregando(true);
            setErro("");

            // =====================================================
            // VERIFICA SE O CLIENTE JÁ POSSUI CONTA
            // =====================================================

            const contaResponse = await fetch(
                "https://localhost:7122/api/Accounts/me",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            // Se a conta já existir, libera o Dashboard.
            if (contaResponse.ok) {
                navigate("/dashboard", {
                    replace: true,
                });

                return;
            }

            // =====================================================
            // CONSULTA AS SOLICITAÇÕES DO CLIENTE
            // =====================================================

            const historicoResponse = await fetch(
                "https://localhost:7122/api/AccountRequests/me",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            if (historicoResponse.ok) {
                const historico = (await historicoResponse.json()) as Solicitacao[];

                // Verifica se já existe uma solicitação
                // de abertura aguardando análise.
                const aberturaPendente =
                    historico.some(
                        (item) =>
                            item.tipo ===
                            "Abertura de conta" &&
                            item.status ===
                            "Pendente"
                    );

                setPendente(
                    aberturaPendente
                );
            }
        } catch {
            setErro(
                "Não foi possível verificar sua solicitação no momento."
            );
        } finally {
            setCarregando(false);
        }
    }

    async function solicitarAbertura() {
        if (!token) {
            navigate("/login", {
                replace: true,
            });

            return;
        }

        try {
            setEnviando(true);
            setErro("");
            setMensagem("");

            // =====================================================
            // SOLICITA ABERTURA DA CONTA
            // =====================================================

            const response = await fetch(
                "https://localhost:7122/api/AccountRequests/me/open",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },

                    // IMPORTANTE:
                    // O backend espera a propriedade "Motivo".
                    // JSON é enviado como "motivo".
                    body: JSON.stringify({
                        motivo:
                            "Solicitação de abertura de conta CoreBank.",
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                setErro(
                    data?.mensagem ??
                    data?.message ??
                    (
                        typeof data === "string"
                            ? data
                            : "Não foi possível enviar a solicitação."
                    )
                );

                return;
            }

            setPendente(true);

            setMensagem(
                "Solicitação enviada com sucesso. Agora ela será analisada pela administração."
            );
        } catch {
            setErro(
                "Não foi possível conectar ao CoreBank. Verifique se a API está em execução."
            );
        } finally {
            setEnviando(false);
        }
    }

    function sair() {
        sessionStorage.removeItem(
            "corebank_token"
        );

        sessionStorage.removeItem(
            "corebank_usuario"
        );

        navigate("/login", {
            replace: true,
        });
    }

    // =========================================================
    // CARREGAMENTO
    // =========================================================

    if (carregando) {
        return (
            <main className= "ativacao-page" >
            <section className="ativacao-card ativacao-loading" >

                <div className="ativacao-brand" >
                    <strong>
                    Core
                    </strong>

                    <span>
        Bank
            </span>
            </div>

            <p>
                        Verificando sua conta...
        </p>

            </section>
            </main>
        );
    }

    // =========================================================
    // PÁGINA
    // =========================================================

    return (
        <main className= "ativacao-page" >

        <div
                className="ativacao-light ativacao-light-one"
        >
        </div>

        < div
    className = "ativacao-light ativacao-light-two"
        >
        </div>

    {/* =================================================
                TOPO
               ================================================= */}

    <header className="ativacao-topbar" >

        <div className="ativacao-brand" >
            <strong>
            Core
            </strong>

            <span>
    Bank
        </span>
        </div>

        < button
    type = "button"
    onClick = { sair }
        >
        Sair
        </button>

        </header>

    {/* =================================================
                CONTEÚDO
               ================================================= */}

    <section className="ativacao-card" >

        <div className="ativacao-status-icon" >
        { pendente? "⌛": "✓" }
            </div>

            < span className = "ativacao-eyebrow" >
            {
                pendente
                ? "SOLICITAÇÃO EM ANÁLISE"
                    : "CADASTRO CONCLUÍDO"
            }
                </span>

                <h1>
    {
        pendente
            ? "Sua solicitação foi recebida"
            : `Olá, ${usuario
                ?.nome
                ?.split(" ")[0] ??
            "cliente"
            }`
    }
    </h1>

        < p className = "ativacao-description" >
        {
            pendente
            ? "Sua abertura de conta está sendo analisada pela equipe administrativa do CoreBank. Assim que for aprovada, seu acesso ao ambiente bancário será liberado."
                : "Seu perfil CoreBank foi criado com sucesso. Para utilizar saldo, transferências, extrato e os demais serviços, solicite agora a abertura da sua conta bancária."
        }
            </p>

    {/* =================================================
                    ETAPAS
                   ================================================= */}

    <div className="ativacao-flow" >

        <div className="ativacao-step concluido" >

            <span>
            1
            </span>

            < div >
            <strong>
            Cadastro
            </strong>

            <small>
    Concluído
        </small>
        </div>

        </div>

        < div
    className = {
                            `ativacao-line ${pendente
            ? "active"
            : ""
        }`
}
                    >
    </div>

    < div
className = {
                            `ativacao-step ${pendente
        ? "atual"
        : ""
    }`
                        }
                    >

    <span>
    2
    </span>

    < div >
    <strong>
    Análise
    </strong>

    <small>
{
    pendente
        ? "Em andamento"
        : "Próxima etapa"
}
</small>
    </div>

    </div>

    < div className = "ativacao-line" >
        </div>

        < div className = "ativacao-step" >

            <span>
            3
            </span>

            < div >
            <strong>
            Conta ativa
                </strong>

                <small>
                                Acesso completo
    </small>
    </div>

    </div>

    </div>

{/* =================================================
                    MENSAGENS
                   ================================================= */}

{
    mensagem && (
        <div className="ativacao-message success" >
        { mensagem }
            </div>
                    )
}

{
    erro && (
        <div className="ativacao-message error" >
        { erro }
            </div>
                    )
}

{/* =================================================
                    AÇÕES
                   ================================================= */}

{
    !pendente ? (

        <button
                            type= "button"
                            className = "ativacao-primary"
    onClick = { solicitarAbertura }
    disabled = { enviando }
        >
    {
        enviando
        ? "Enviando solicitação..."
            : "Solicitar abertura da conta"
    }

    {
        !enviando && (
            <span>
                                        →
        </span>
                                )
    }
    </button>

                    ) : (

        <button
                            type= "button"
    className = "ativacao-secondary"
    onClick = {
                                () =>
    void verificarSituacao()
}
                        >
    Verificar situação
        </button>

                    )
                }

{/* =================================================
                    SEGURANÇA
                   ================================================= */}

<footer>
    <span>
                        ✓
</span>

                    Seus dados permanecem protegidos durante todo o processo.
                </footer>

    </section>

    </main>
    );
}

export default AtivacaoConta;