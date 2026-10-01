import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Transacoes from "./pages/Transacoes";
import Extrato from "./pages/Extrato";
import Solicitacoes from "./pages/Solicitacoes";
import Perfil from "./pages/Perfil";

import "./pages/ClienteLayout.css";

function App() {
    return (
        <BrowserRouter>
        <Routes>
        {/* LOGIN */ }
        < Route
                    path = "/login"
    element = {< Login />}
                />

{/* ÁREA DO CLIENTE */ }
<Route
                    path="/dashboard"
element = {< Dashboard />}
                />

    < Route
path = "/transacoes"
element = {< Transacoes />}
                />

    < Route
path = "/extrato"
element = {< Extrato />}
                />

    < Route
path = "/solicitacoes"
element = {< Solicitacoes />}
                />

    < Route
path = "/perfil"
element = {< Perfil />}
                />

{/* ÁREA ADMINISTRATIVA */ }
<Route
                    path="/admin"
element = {< AdminDashboard />}
                />

{/* ROTA INICIAL */ }
<Route
                    path="/"
element = {
                        < Navigate
to = "/login"
replace
    />
                    }
                />

{/* ROTA INEXISTENTE */ }
<Route
                    path="*"
element = {
                        < Navigate
to = "/login"
replace
    />
                    }
                />
    </Routes>
    </BrowserRouter>
    );
}

export default App;