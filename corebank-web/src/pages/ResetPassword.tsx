import { useState } from "react";
import type { FormEvent } from "react";
import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import "./ForgotPassword.css";

type ApiResponse = {
    mensagem?: string;
    erros?: string[];
};

function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();

    const params =
        new URLSearchParams(location.search);

    const [email, setEmail] = useState(
        params.get("email") ?? ""
    );

    const [newPassword, setNewPassword] =
        useState("");

    const [
        confirmPassword,
        setConfirmPassword,
    ] = useState("");

    const [isLoading, setIsLoading] =
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
            setErrorMessage(
                "Informe seu e-mail."
            );

            return;
        }

        if (!newPassword) {
            setErrorMessage(
                "Informe a nova senha."
            );

            return;
        }

        if (newPassword.length < 8) {
            setErrorMessage(
                "A nova senha deve possuir pelo menos 8 caracteres."
            );

            return;
        }

        if (
            newPassword !==
            confirmPassword
        ) {
            setErrorMessage(
                "As senhas informadas não são iguais."
            );

            return;
        }

        try {
            setIsLoading(true);

            const response = await fetch(
                "https://localhost:7122/api/Auth/reset-password",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        email: email.trim(),
                        newPassword,
                    }),
                }
            );

            const data =
                (await response.json()) as ApiResponse;

            if (!response.ok) {
                setErrorMessage(
                    data.mensagem ??
                    data.erros?.[0] ??
                    "Não foi possível redefinir a senha."
                );

                return;
            }

            setSuccessMessage(
                data.mensagem ??
                "Senha redefinida com sucesso."
            );

            setNewPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                navigate("/login", {
                    replace: true,
                });
            }, 2000);
        } catch {
            setErrorMessage(
                "Não foi possível conectar ao CoreBank. Verifique se a API está em execução."
            );
        } finally {
            setIsLoading(false);
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

                        NOVA SENHA

        < span > </span>
        </div>

        <h1>
                        Redefinir senha
        </h1>

        <p>
                        Sua solicitação precisa estar
                        aprovada pelo administrador
                        para concluir esta etapa.
                    </p>
        </header>

        < form
    className = "forgot-form"
    onSubmit = { handleSubmit }
        >
        <div className="forgot-field" >
            <label htmlFor="reset-email" >
                E - mail
                </label>

                < div className = "forgot-input-box" >
                    <span className="forgot-email-icon" >
                                ✉
    </span>

        < input
    id = "reset-email"
    type = "email"
    placeholder = "seuemail@exemplo.com"
    autoComplete = "email"
    value = { email }
    onChange = {(event) =>
    setEmail(
        event.target.value
    )
}
disabled = { isLoading }
    />
    </div>
    </div>

    < div className = "forgot-field" >
        <label htmlFor="new-password" >
            Nova senha
                </label>

                < div className = "forgot-input-box" >
                    <span className="forgot-email-icon" >
                                ◇
</span>

    < input
id = "new-password"
type = "password"
placeholder = "Digite a nova senha"
autoComplete = "new-password"
value = { newPassword }
onChange = {(event) =>
setNewPassword(
    event.target.value
)
                                }
disabled = { isLoading }
    />
    </div>
    </div>

    < div className = "forgot-field" >
        <label htmlFor="confirm-password" >
            Confirmar nova senha
                </label>

                < div className = "forgot-input-box" >
                    <span className="forgot-email-icon" >
                                ◇
</span>

    < input
id = "confirm-password"
type = "password"
placeholder = "Digite novamente"
autoComplete = "new-password"
value = {
    confirmPassword
}
onChange = {(event) =>
setConfirmPassword(
    event.target.value
)
                                }
disabled = { isLoading }
    />
    </div>
    </div>

    < p className = "password-requirements" >
        A senha deve possuir pelo
                        menos 8 caracteres, incluindo
                        letra maiúscula, minúscula,
    número e caractere especial.
                    </p>

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
    !!successMessage
                        }
                    >
    <span>
    {
        isLoading
        ? "Salvando..."
            : "Definir nova senha"
    }
    </span>

{
    !isLoading &&
        !successMessage && (
            <span>→</span>
                            )
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

export default ResetPassword;