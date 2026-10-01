import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type PasswordResetRequest = {
    solicitacaoId: number;
    status: string;
    dataSolicitacao: string;
    clienteId: number;
    nomeCliente: string;
    emailCliente: string;
    cpfCliente: string;
};

function AdminTest() {
    const navigate = useNavigate();

    const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const token = sessionStorage.getItem("corebank_token");

    async function loadRequests() {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const response = await fetch(
                "https://localhost:7122/api/Admin/password-reset-requests/pending",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem("corebank_token");
                sessionStorage.removeItem("corebank_usuario");

                navigate("/login", {
                    replace: true,
                });

                return;
            }

            if (!response.ok) {
                setErrorMessage(
                    "Não foi possível carregar as solicitações."
                );

                return;
            }

            const data =
                (await response.json()) as PasswordResetRequest[];

            setRequests(data);
        } catch {
            setErrorMessage(
                "Não foi possível conectar à API do CoreBank."
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function analyzeRequest(
        requestId: number,
        action: "approve" | "reject"
    ) {
        setMessage("");
        setErrorMessage("");

        try {
            const response = await fetch(
                `https://localhost:7122/api/Admin/password-reset-requests/${requestId}/${action}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setErrorMessage(
                    data.mensagem ??
                    "Não foi possível analisar a solicitação."
                );

                return;
            }

            if (action === "approve") {
                setMessage(
                    "Solicitação aprovada com sucesso."
                );
            } else {
                setMessage(
                    "Solicitação recusada com sucesso."
                );
            }

            await loadRequests();
        } catch {
            setErrorMessage(
                "Não foi possível conectar à API do CoreBank."
            );
        }
    }

    function handleLogout() {
        sessionStorage.removeItem("corebank_token");
        sessionStorage.removeItem("corebank_usuario");

        navigate("/login", {
            replace: true,
        });
    }

    useEffect(() => {
        loadRequests();
    }, []);

    return (
        <main
            style= {{
        minHeight: "100vh",
            background: "#071827",
                color: "#ffffff",
                    padding: "40px",
                        fontFamily: "Arial, sans-serif",
            }
}
        >
    <div
                style={
    {
        maxWidth: "1000px",
            margin: "0 auto",
                }
}
            >
    <div
                    style={
    {
        display: "flex",
            justifyContent: "space-between",
                alignItems: "center",
                    marginBottom: "35px",
                    }
}
                >
    <div>
    <h1>CoreBank </h1>

    <p>
                            Painel administrativo temporário
    </p>
    </div>

    < button
type = "button"
onClick = { handleLogout }
style = {{
    padding: "10px 20px",
        cursor: "pointer",
                        }}
                    >
    Sair
    </button>
    </div>

    <h2>
                    Solicitações de recuperação de senha
    </h2>

{
    message && (
        <p
                        style={
        {
            color: "#8de3b8",
                        }
    }
                    >
    { message }
        </p>
                )
}

{
    errorMessage && (
        <p
                        style={
        {
            color: "#ffaaaa",
                        }
    }
                    >
    { errorMessage }
        </p>
                )
}

{
    isLoading && (
        <p>
        Carregando solicitações...
    </p>
                )
}

{
    !isLoading &&
    requests.length === 0 && (
        <p>
        Nenhuma solicitação pendente.
                        </p>
                    )
}

{
    requests.map((request) => (
        <div
                        key= { request.solicitacaoId }
                        style = {{
        marginTop: "20px",
        padding: "24px",
        border:
            "1px solid rgba(255,255,255,0.15)",
        borderRadius: "12px",
        background:
            "rgba(255,255,255,0.05)",
    }}
                    >
    <h3>
    { request.nomeCliente }
    </h3>

    < p >
    <strong>E - mail: </strong>{" "}
{ request.emailCliente }
</p>

    < p >
    <strong>CPF: </strong>{" "}
{ request.cpfCliente }
</p>

    < p >
    <strong>Status: </strong>{" "}
{ request.status }
</p>

    < p >
    <strong>Solicitação: </strong>{" "}
{ request.dataSolicitacao }
</p>

    < div
style = {{
    display: "flex",
        gap: "12px",
            marginTop: "20px",
                            }}
                        >
    <button
                                type="button"
onClick = {() =>
analyzeRequest(
    request.solicitacaoId,
    "approve"
)
                                }
style = {{
    padding: "10px 20px",
        cursor: "pointer",
                                }}
                            >
    Aprovar
    </button>

    < button
type = "button"
onClick = {() =>
analyzeRequest(
    request.solicitacaoId,
    "reject"
)
                                }
style = {{
    padding: "10px 20px",
        cursor: "pointer",
                                }}
                            >
    Recusar
    </button>
    </div>
    </div>
                ))}
</div>
    </main>
    );
}

export default AdminTest;