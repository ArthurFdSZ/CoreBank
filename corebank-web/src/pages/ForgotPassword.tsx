import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

type ApiResponse = {
    mensagem?: string;
    erros?: string[];
};

type StatusResponse = {
    solicitacaoId?: number;
    status: string;
};

function ForgotPassword() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");

    const [isLoading, setIsLoading] =
        useState(false);

    const [isChecking, setIsChecking] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [successMessage, setSuccessMessage] =
        useState("");

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setErrorMessage("");
        setSuccessMessage("");

        if (!email.trim()) {
            setErrorMessage("Informe seu e-mail.");
            return;
        }

        try {
            setIsLoading(true);

            const response = await fetch(
                "https://localhost:7122/api/Auth/forgot-password",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        email: email.trim(),
                    }),
                }
            );

            const data =
                (await response.json()) as ApiResponse;

            if (!response.ok) {
                setErrorMessage(
                    data.mensagem ??
                    data.erros?.[0] ??
                    "Não foi possível enviar a solicitação."
                );

                return;
            }

            setSuccessMessage(
                "Solicitação enviada. Aguarde a análise do administrador."
            );
        } catch {
            setErrorMessage(
                "Não foi possível conectar ao CoreBank. Verifique se a API está em execução."
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCheckStatus() {
        setErrorMessage("");
        setSuccessMessage("");

        if (!email.trim()) {
            setErrorMessage(
                "Informe seu e-mail para consultar a solicitação."
            );

            return;
        }

        try {
            setIsChecking(true);

            const response = await fetch(
                `https://localhost:7122/api/Auth/password-reset-status?email=${encodeURIComponent(
                    email.trim()
                )}`
            );

            const data =
                (await response.json()) as StatusResponse;

            if (!response.ok) {
                setErrorMessage(
                    "Não foi possível consultar a solicitação."
                );

                return;
            }

            if (data.status === "Aprovada") {
                navigate(
                    `/redefinir-senha?email=${encodeURIComponent(
                        email.trim()
                    )}`
                );

                return;
            }

            if (data.status === "Pendente") {
                setSuccessMessage(
                    "Sua solicitação ainda está aguardando análise do administrador."
                );

                return;
            }

            if (data.status === "Recusada") {
                setErrorMessage(
                    "Sua solicitação de recuperação foi recusada."
                );

                return;
            }

            if (data.status === "Concluída") {
                setSuccessMessage(
                    "A senha desta solicitação já foi redefinida. Você pode voltar ao login."
                );

                return;
            }

            setErrorMessage(
                "Não foi encontrada uma solicitação de recuperação para este e-mail."
            );
        } catch {
            setErrorMessage(
                "Não foi possível conectar ao CoreBank."
            );
        } finally {
            setIsChecking(false);
        }
    }

    return (
        <main className= "forgot-page" >
        <div className="forgot-background" > </div>

            < div className = "forgot-glow forgot-glow-one" > </div>
                < div className = "forgot-glow forgot-glow-two" > </div>

                    < section className = "forgot-card" >
                        <header className="forgot-header" >
                            <div className="forgot-brand" >
                                <div className="forgot-name" >
                                    <strong>Core </strong>
                                    < span > Bank </span>
                                    </div>
                                    </div>

                                    < div className = "forgot-secure" >
                                        <span></span>

                        RECUPERAÇÃO SEGURA

        < span > </span>
        </div>

        <h1>
                        Recuperar acesso
        </h1>

        <p>
                        Informe o e - mail cadastrado na
                        sua conta.Sua solicitação será
                        encaminhada para análise.
                    </p>
        </header>

        < form
    className = "forgot-form"
    onSubmit = { handleSubmit }
        >
        <div className="forgot-field" >
            <label htmlFor="recovery-email" >
                E - mail
                </label>

                < div className = "forgot-input-box" >
                    <span className="forgot-email-icon" >
                                ✉
    </span>

        < input
    id = "recovery-email"
    type = "email"
    placeholder = "seuemail@exemplo.com"
    autoComplete = "email"
    value = { email }
    onChange = {(event) =>
    setEmail(
        event.target.value
    )
}
disabled = {
    isLoading ||
    isChecking
                                }
                            />
    </div>
    </div>

{
    errorMessage && (
        <div className="forgot-message error" >
        { errorMessage }
            </div>
                    )
}

{
    successMessage && (
        <div className="forgot-message success" >
            <span className="success-check" >
                                ✓
    </span>

        <span>
    { successMessage }
    </span>
        </div>
                    )
}

<button
                        type="submit"
className = "forgot-submit"
disabled = {
    isLoading ||
    isChecking
                        }
                    >
    <span>
    {
        isLoading
        ? "Enviando..."
            : "Solicitar recuperação"
    }
    </span>

{
    !isLoading && (
        <span>→</span>
                        )
}
</button>

    < button
type = "button"
className = "back-login"
onClick = {
    handleCheckStatus
}
disabled = {
    isLoading ||
    isChecking
                        }
                    >
{
    isChecking
    ? "Consultando..."
        : "Já fiz a solicitação"
}
    </button>
    </form>

    < button
type = "button"
className = "back-login"
onClick = {() =>
navigate("/login")
                    }
                >
                    ← Voltar para o login
    </button>

    < footer className = "forgot-footer" >
        <span>✓</span>

            <span>
                        Ambiente protegido e seguro
    </span>
    </footer>
    </section>
    </main>
    );
}

export default ForgotPassword;