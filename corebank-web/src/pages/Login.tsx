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

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
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

            const data = (await response.json()) as LoginResponse | ErrorResponse;

            if (!response.ok) {
                const errorData = data as ErrorResponse;

                setErrorMessage(
                    errorData.mensagem ??
                    errorData.erros?.[0] ??
                    "Não foi possível realizar o login."
                );
                return;
            }

            const loginData = data as LoginResponse;

            sessionStorage.setItem("corebank_token", loginData.token);

            sessionStorage.setItem(
                "corebank_usuario",
                JSON.stringify({
                    id: loginData.id,
                    nome: loginData.name,
                    email: loginData.email,
                    perfil: loginData.perfil,
                })
            );

            if (loginData.perfil === "Administrador") {
                navigate("/admin", { replace: true });
                return;
            }

            // Antes de liberar o dashboard, verifica se o cliente
            // realmente possui uma conta bancária.
            const accountResponse = await fetch(
                "https://localhost:7122/api/Accounts/me",
                {
                    headers: {
                        Authorization: `Bearer ${loginData.token}`,
                    },
                }
            );

            if (accountResponse.ok) {
                navigate("/dashboard", { replace: true });
                return;
            }

            // Cliente válido, porém ainda sem conta.
            if (accountResponse.status === 404) {
                navigate("/ativacao-conta", { replace: true });
                return;
            }

            setErrorMessage(
                "Não foi possível verificar sua conta. Tente novamente."
            );
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

                                        < h1 > Bem - vindo de volta </h1>

                                            <p>
                        Entre com seus dados para acessar
                        sua conta.
                    </p>
        </header>

        < form className = "login-form" onSubmit = { handleLogin } >
            <div className="form-field" >
                <label htmlFor="email" > E - mail </label>

                    < div className = "field-box" >
                        <span className="field-icon" >✉</span>

                            < input
    id = "email"
    type = "email"
    placeholder = "seuemail@exemplo.com"
    autoComplete = "email"
    value = { email }
    onChange = {(event) => setEmail(event.target.value)
}
disabled = { isLoading }
    />
    </div>
    </div>

    < div className = "form-field" >
        <div className="password-row" >
            <label htmlFor="password" > Senha </label>

                < button
type = "button"
className = "text-button"
onClick = {() => navigate("/esqueci-senha")}
                            >
    Esqueci minha senha
        </button>
        </div>

        < div className = "field-box password-field-box" >
            <span className="field-icon lock-icon" >◇</span>

                < input
id = "password"
type = { showPassword? "text": "password" }
placeholder = "Digite sua senha"
autoComplete = "current-password"
value = { password }
onChange = {(event) => setPassword(event.target.value)}
disabled = { isLoading }
    />

    <button
                                type="button"
className = "password-toggle"
title = { showPassword? "Ocultar senha": "Mostrar senha" }
onClick = {() => setShowPassword(!showPassword)}
                            >
{ showPassword? "◉": "○" }
    </button>
    </div>
    </div>

{
    errorMessage && (
        <div className="login-error" role = "alert" >
            <span>!</span>
            < p > { errorMessage } </p>
            </div>
                    )
}

<button
                        type="submit"
className = "enter-button"
disabled = { isLoading }
    >
    <span>{ isLoading? "Entrando...": "Entrar" } </span>
{ !isLoading && <span className="button-arrow" >→</span> }
</button>
    </form>

    < div className = "register-section" >
        <span>Ainda não é cliente ? </span>

            < button
                        type = "button"
className = "text-button"
onClick = {() => navigate("/abrir-conta")}
                    >
    Abra sua conta
        </button>
        </div>

        < footer className = "login-security" >
            <span className="security-check" >✓</span>
                < span > Ambiente protegido e seguro </span>
                    </footer>
                    </section>
                    </main>
    );
}

export default Login;
