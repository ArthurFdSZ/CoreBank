import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

type ApiError = {
    mensagem?: string;
    erros?: string[];
};

function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [cpf, setCpf] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [isLoading, setIsLoading] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [successMessage, setSuccessMessage] =
        useState("");

    function formatCpf(value: string) {
        const numbers = value
            .replace(/\D/g, "")
            .slice(0, 11);

        return numbers
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(
                /(\d{3})(\d{1,2})$/,
                "$1-$2"
            );
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setErrorMessage("");
        setSuccessMessage("");

        const cleanCpf =
            cpf.replace(/\D/g, "");

        if (!name.trim()) {
            setErrorMessage(
                "Informe seu nome."
            );

            return;
        }

        if (cleanCpf.length !== 11) {
            setErrorMessage(
                "Informe um CPF com 11 dígitos."
            );

            return;
        }

        if (!email.trim()) {
            setErrorMessage(
                "Informe seu e-mail."
            );

            return;
        }

        if (password.length < 8) {
            setErrorMessage(
                "A senha deve possuir pelo menos 8 caracteres."
            );

            return;
        }

        if (
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password) ||
            !/[^A-Za-z0-9]/.test(password)
        ) {
            setErrorMessage(
                "A senha deve possuir letra maiúscula, minúscula, número e caractere especial."
            );

            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage(
                "As senhas informadas não são iguais."
            );

            return;
        }

        try {
            setIsLoading(true);

            const response = await fetch(
                "https://localhost:7122/api/Customers",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        name: name.trim(),
                        cpf: cleanCpf,
                        email: email.trim(),
                        password,
                    }),
                }
            );

            if (!response.ok) {
                const contentType =
                    response.headers.get(
                        "content-type"
                    );

                if (
                    contentType?.includes(
                        "application/json"
                    )
                ) {
                    const data =
                        (await response.json()) as
                        | ApiError
                        | string;

                    if (
                        typeof data === "string"
                    ) {
                        setErrorMessage(data);
                    } else {
                        setErrorMessage(
                            data.mensagem ??
                            data.erros?.[0] ??
                            "Não foi possível criar sua conta."
                        );
                    }
                } else {
                    const message =
                        await response.text();

                    setErrorMessage(
                        message ||
                        "Não foi possível criar sua conta."
                    );
                }

                return;
            }

            setSuccessMessage(
                "Cadastro realizado com sucesso. Você já pode acessar o CoreBank."
            );

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

                        NOVA CONTA

        < span > </span>
        </div>

        <h1>
                        Abra sua conta
        </h1>

        <p>
                        Preencha seus dados para
                        começar sua experiência no
    CoreBank.
                    </p>
        </header>

        < form
    className = "forgot-form"
    onSubmit = { handleSubmit }
        >
        <div className="forgot-field" >
            <label htmlFor="name" >
                Nome completo
                    </label>

                    < div className = "forgot-input-box" >
                        <span className="forgot-email-icon" >
                                ◇
    </span>

        < input
    id = "name"
    type = "text"
    placeholder = "Seu nome completo"
    autoComplete = "name"
    value = { name }
    onChange = {(event) =>
    setName(
        event.target.value
    )
}
disabled = { isLoading }
    />
    </div>
    </div>

    < div className = "forgot-field" >
        <label htmlFor="cpf" >
            CPF
            </label>

            < div className = "forgot-input-box" >
                <span className="forgot-email-icon" >
                                ◇
</span>

    < input
id = "cpf"
type = "text"
inputMode = "numeric"
placeholder = "000.000.000-00"
value = { cpf }
onChange = {(event) =>
setCpf(
    formatCpf(
        event.target
            .value
    )
)
                                }
disabled = { isLoading }
    />
    </div>
    </div>

    < div className = "forgot-field" >
        <label htmlFor="register-email" >
            E - mail
            </label>

            < div className = "forgot-input-box" >
                <span className="forgot-email-icon" >
                                ✉
</span>

    < input
id = "register-email"
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
        <label htmlFor="register-password" >
            Senha
            </label>

            < div className = "forgot-input-box" >
                <span className="forgot-email-icon" >
                                ◇
</span>

    < input
id = "register-password"
type = "password"
placeholder = "Crie uma senha"
autoComplete = "new-password"
value = { password }
onChange = {(event) =>
setPassword(
    event.target.value
)
                                }
disabled = { isLoading }
    />
    </div>
    </div>

    < div className = "forgot-field" >
        <label htmlFor="confirm-password" >
            Confirmar senha
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
        ? "Criando conta..."
            : "Criar minha conta"
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
                    ← Já tenho uma conta
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

export default Register;