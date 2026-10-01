import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

type LoginResponse = {
    id: number;
    name: string;
    email: string;
    perfil: string;
    token: string;
};

type ErrorResponse = {
    mensagem?: string;
    erros?: string[];
};

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleLogin(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setErrorMessage("");

        if (!email.trim()) {
            setErrorMessage("Informe seu e-mail.");
            return;
        }

        if (!password) {
            setErrorMessage("Informe sua senha.");
            return;
        }

        try {
            setIsLoading(true);

            const response = await fetch(
                "https://localhost:7122/api/Auth/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                    }),
                }
            );

            const data = (await response.json()) as
                | LoginResponse
                | ErrorResponse;

            if (!response.ok) {
                const errorData =
                    data as ErrorResponse;

                setErrorMessage(
                    errorData.mensagem ??
                    errorData.erros?.[0] ??
                    "Não foi possível realizar o login."
                );

                return;
            }

            const loginData =
                data as LoginResponse;

            sessionStorage.setItem(
                "corebank_token",
                loginData.token
            );

            sessionStorage.setItem(
                "corebank_usuario",
                JSON.stringify({
                    id: loginData.id,
                    nome: loginData.name,
                    email: loginData.email,
                    perfil: loginData.perfil,
                })
            );

            if (
                loginData.perfil ===
                "Administrador"
            ) {
                navigate("/admin", {
                    replace: true,
                });

                return;
            }

            navigate("/dashboard", {
                replace: true,
            });
        } catch {
            setErrorMessage(
                "Não foi possível conectar ao CoreBank. Verifique se a API está em execução."
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className= "login-page" >
        <div className="login-background" > </div>

            < div className = "login-light login-light-one" > </div>
                < div className = "login-light login-light-two" > </div>

                    < section className = "login-card" >
                        <header className="login-header" >
                            <div className="corebank-brand" >
                                <strong>Core </strong>
                                < span > Bank </span>
                                </div>

                                < div className = "secure-label" >
                                    <div></div>

                                    < span > ACESSO SEGURO </span>

                                        < div > </div>
                                        </div>

                                        <h1>
    Bem - vindo de volta
        </h1>

        <p>
                        Entre com seus dados para acessar
                        sua conta.
                    </p>
        </header>

        < form
    className = "login-form"
    onSubmit = { handleLogin }
        >
        <div className="form-field" >
            <label htmlFor="email" >
                E - mail
                </label>

                < div className = "field-box" >
                    <span className="field-icon" >
                                ✉
    </span>

        < input
    id = "email"
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

    < div className = "form-field" >
        <div className="password-row" >
            <label htmlFor="password" >
                Senha
                </label>

                < button
type = "button"
className = "text-button"
onClick = {() =>
navigate(
    "/esqueci-senha"
)
                                }
                            >
    Esqueci minha senha
        </button>
        </div>

        < div className = "field-box password-field-box" >
            <span className="field-icon lock-icon" >
                                ◇
</span>

    < input
id = "password"
type = {
    showPassword
    ? "text"
        : "password"
}
placeholder = "Digite sua senha"
autoComplete = "current-password"
value = { password }
onChange = {(event) =>
setPassword(
    event.target.value
)
                                }
disabled = { isLoading }
    />

    <button
                                type="button"
className = "password-toggle"
title = {
    showPassword
    ? "Ocultar senha"
        : "Mostrar senha"
}
onClick = {() =>
setShowPassword(
    !showPassword
)
                                }
                            >
    {
        showPassword?(
                                    <svg
                                        width = "22"
                                        height = "22"
                                        viewBox = "0 0 24 24"
                                        fill = "none"
                >
                <path
                                            d="M2 12C4.5 7.5 7.8 5.5 12 5.5C16.2 5.5 19.5 7.5 22 12C19.5 16.5 16.2 18.5 12 18.5C7.8 18.5 4.5 16.5 2 12Z"
            stroke = "currentColor"
                                            strokeWidth = "1.7"
                />

                <circle
                                            cx="12"
            cy = "12"
                                            r = "3"
                                            stroke = "currentColor"
                                            strokeWidth = "1.7"
                />
                </svg>
        ): (
                <svg
                                        width = "22"
                                        height = "22"
                                        viewBox = "0 0 24 24"
                                        fill = "none"
                >
                                        <path
                                            d = "M3 3L21 21"
                                            stroke = "currentColor"
                                            strokeWidth = "1.7"
                                            strokeLinecap = "round"
                                        />

    <path
                                            d="M10.6 5.7C11.05 5.57 11.52 5.5 12 5.5C16.2 5.5 19.5 7.5 22 12C21.2 13.43 20.3 14.61 19.28 15.55"
stroke = "currentColor"
strokeWidth = "1.7"
strokeLinecap = "round"
    />

    <path
                                            d="M16.3 17.35C15 18.1 13.57 18.5 12 18.5C7.8 18.5 4.5 16.5 2 12C3.02 10.16 4.2 8.73 5.54 7.68"
stroke = "currentColor"
strokeWidth = "1.7"
strokeLinecap = "round"
    />
    </svg>
                                )}
</button>
    </div>
    </div>

{
    errorMessage && (
        <div
                            className="login-error"
    role = "alert"
        >
        <span>!</span>

        <p>
    { errorMessage }
    </p>
        </div>
                    )
}

<button
                        type="submit"
className = "enter-button"
disabled = { isLoading }
    >
    <span>
    {
        isLoading
        ? "Entrando..."
            : "Entrar"
    }
    </span>

{
    !isLoading && (
        <span className="button-arrow" >
                                →
    </span>
                        )
}
</button>
    </form>

    < div className = "register-section" >
        <span>
        Ainda não é cliente ?
            </span>

            < button
                        type = "button"
className = "text-button"
onClick = {() =>
navigate("/abrir-conta")
                        }
                    >
    Abra sua conta
        </button>
        </div>

        < footer className = "login-security" >
            <span className="security-check" >
                        ✓
</span>

    <span>
                        Ambiente protegido e seguro
    </span>
    </footer>
    </section>
    </main>
    );
}

export default Login;