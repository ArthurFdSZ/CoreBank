import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

type ProtectedRouteProps = {
    children: ReactNode;
};

function ProtectedRoute({ children }: ProtectedRouteProps) {
    const token = sessionStorage.getItem("corebank_token");

    // Sem token, o usuário não pode acessar páginas internas.
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <>{ children } </>;
}

export default ProtectedRoute;