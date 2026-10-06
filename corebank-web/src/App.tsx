import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AtivacaoConta from "./pages/AtivacaoConta";

// =====================================================
// ÁREA DO CLIENTE
// =====================================================

import Dashboard from "./pages/Dashboard";
import Transacoes from "./pages/Transacoes";
import Extrato from "./pages/Extrato";
import Solicitacoes from "./pages/Solicitacoes";
import Perfil from "./pages/Perfil";

// =====================================================
// ÁREA ADMINISTRATIVA
// =====================================================

import AdminDashboard from "./pages/AdminDashboard";
import AdminClientes from "./pages/AdminClientes";
import AdminContas from "./pages/AdminContas";
import AdminSolicitacoes from "./pages/AdminSolicitacoes";
import AdminRelatorios from "./pages/AdminRelatorios";
import AdminPerfil from "./pages/AdminPerfil";

import "./pages/ClienteLayout.css";

function App() {
    return (
        <BrowserRouter>
        <Routes>
        {/* LOGIN E ACESSO */ }
        < Route path = "/login" element = {< Login />} />
            < Route path = "/abrir-conta" element = {< Register />} />
                < Route path = "/esqueci-senha" element = {< ForgotPassword />} />
                    < Route path = "/redefinir-senha" element = {< ResetPassword />} />

{/* CLIENTE SEM CONTA */ }
<Route path="/ativacao-conta" element = {< AtivacaoConta />} />

{/* ÁREA DO CLIENTE */ }
<Route path="/dashboard" element = {< Dashboard />} />
    < Route path = "/transacoes" element = {< Transacoes />} />
        < Route path = "/extrato" element = {< Extrato />} />
            < Route path = "/solicitacoes" element = {< Solicitacoes />} />
                < Route path = "/perfil" element = {< Perfil />} />

{/* ÁREA ADMINISTRATIVA */ }
<Route path="/admin" element = {< AdminDashboard />} />
    < Route path = "/admin/clientes" element = {< AdminClientes />} />
        < Route path = "/admin/contas" element = {< AdminContas />} />
            < Route path = "/admin/solicitacoes" element = {< AdminSolicitacoes />} />
                < Route path = "/admin/relatorios" element = {< AdminRelatorios />} />
                    < Route path = "/admin/perfil" element = {< AdminPerfil />} />

{/* ROTA INICIAL */ }
<Route path="/" element = {< Navigate to = "/login" replace />} />

{/* ROTA INEXISTENTE */ }
<Route path="*" element = {< Navigate to = "/login" replace />} />
    </Routes>
    </BrowserRouter>
    );
}

export default App;
