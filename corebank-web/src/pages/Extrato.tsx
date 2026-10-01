import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";
import "./Extrato.css";

type Usuario = {
    id: number;
    nome: string;
    email: string;
    perfil: string;
};

type Movimentacao = {
    id: number;
    type: string;
    amount: number;
    description: string;
    relatedAccountId: number | null;
    createdAt: string;
};

type ExtratoResponse = {
    accountId: number;
    agency: string;
    number: string;
    balance: number;
    status: string;
    transactions: Movimentacao[];
};

type FiltroTipo =
    | "Todas"
    | "Entradas"
    | "Saídas"
    | "Depósitos"
    | "Saques"
    | "Transferências";

function Extrato() {
    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState<Usuario | null>(null);

    const [extrato, setExtrato] =
        useState<ExtratoResponse | null>(
            null
        );

    const [carregando, setCarregando] =
        useState(true);

    const [erro, setErro] =
        useState("");

    const [
        sidebarRecolhida,
        setSidebarRecolhida,
    ] = useState(false);

    const [
        saldoVisivel,
        setSaldoVisivel,
    ] = useState(true);

    const [busca, setBusca] =
        useState("");

    const [filtroTipo, setFiltroTipo] =
        useState<FiltroTipo>("Todas");

    const [
        dataInicial,
        setDataInicial,
    ] = useState("");

    const [
        dataFinal,
        setDataFinal,
    ] = useState("");

    function obterUsuarioSalvo() {
        const usuarioSalvo =
            sessionStorage.getItem(
                "corebank_usuario"
            );

        if (!usuarioSalvo) {
            return null;
        }

        try {
            return JSON.parse(
                usuarioSalvo
            ) as Usuario;
        } catch {
            return null;
        }
    }

    function limparSessao() {
        sessionStorage.removeItem(
            "corebank_token"
        );

        sessionStorage.removeItem(
            "corebank_usuario"
        );
    }

    function handleLogout() {
        limparSessao();

        navigate("/login", {
            replace: true,
        });
    }

    function formatarMoeda(
        valor: number
    ) {
        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
            }
        ).format(valor);
    }

    function movimentacaoEhEntrada(
        tipo: string
    ) {
        const tipoNormalizado =
            tipo.toLowerCase();

        return (
            tipoNormalizado.includes(
                "depósito"
            ) ||
            tipoNormalizado.includes(
                "deposito"
            ) ||
            tipoNormalizado.includes(
                "recebida"
            ) ||
            tipoNormalizado.includes(
                "received"
            )
        );
    }

    function movimentacaoEhSaque(
        tipo: string
    ) {
        const tipoNormalizado =
            tipo.toLowerCase();

        return (
            tipoNormalizado.includes(
                "saque"
            ) ||
            tipoNormalizado.includes(
                "withdraw"
            )
        );
    }

    function movimentacaoEhTransferencia(
        tipo: string
    ) {
        return tipo
            .toLowerCase()
            .includes("transfer");
    }

    function formatarData(
        data: string
    ) {
        if (!data) {
            return "-";
        }

        if (
            data.includes("/") &&
            data.includes(":")
        ) {
            return data;
        }

        const dataConvertida =
            new Date(data);

        if (
            Number.isNaN(
                dataConvertida.getTime()
            )
        ) {
            return data;
        }

        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }
        ).format(dataConvertida);
    }

    function obterDataParaFiltro(
        data: string
    ) {
        if (!data) {
            return null;
        }

        if (data.includes("/")) {
            const parteData =
                data.split(" ")[0];

            const partes =
                parteData.split("/");

            if (partes.length === 3) {
                const dia =
                    Number(partes[0]);

                const mes =
                    Number(partes[1]) - 1;

                const ano =
                    Number(partes[2]);

                return new Date(
                    ano,
                    mes,
                    dia
                );
            }
        }

        const dataConvertida =
            new Date(data);

        if (
            Number.isNaN(
                dataConvertida.getTime()
            )
        ) {
            return null;
        }

        return dataConvertida;
    }

    async function carregarExtrato() {
        const token =
            sessionStorage.getItem(
                "corebank_token"
            );

        const usuarioAtual =
            obterUsuarioSalvo();

        if (
            !token ||
            !usuarioAtual
        ) {
            limparSessao();

            navigate("/login", {
                replace: true,
            });

            return;
        }

        setUsuario(usuarioAtual);
        setCarregando(true);
        setErro("");

        try {
            const resposta =
                await fetch(
                    "https://localhost:7122/api/Accounts/me/statement",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            if (
                resposta.status === 401 ||
                resposta.status === 403
            ) {
                limparSessao();

                navigate("/login", {
                    replace: true,
                });

                return;
            }

            if (!resposta.ok) {
                throw new Error();
            }

            const dados =
                (await resposta.json()) as ExtratoResponse;

            setExtrato({
                ...dados,

                transactions:
                    dados.transactions ??
                    [],
            });
        } catch {
            setErro(
                "Não foi possível carregar o extrato da sua conta."
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarExtrato();
    }, []);

    const movimentacoesFiltradas =
        useMemo(() => {
            const movimentacoes =
                extrato?.transactions ??
                [];

            return movimentacoes.filter(
                (movimentacao) => {
                    const entrada =
                        movimentacaoEhEntrada(
                            movimentacao.type
                        );

                    const textoBusca =
                        busca
                            .trim()
                            .toLowerCase();

                    const correspondeBusca =
                        !textoBusca ||
                        movimentacao.type
                            .toLowerCase()
                            .includes(
                                textoBusca
                            ) ||
                        movimentacao.description
                            ?.toLowerCase()
                            .includes(
                                textoBusca
                            );

                    let correspondeTipo =
                        true;

                    if (
                        filtroTipo ===
                        "Entradas"
                    ) {
                        correspondeTipo =
                            entrada;
                    }

                    if (
                        filtroTipo ===
                        "Saídas"
                    ) {
                        correspondeTipo =
                            !entrada;
                    }

                    if (
                        filtroTipo ===
                        "Depósitos"
                    ) {
                        correspondeTipo =
                            movimentacao.type
                                .toLowerCase()
                                .includes(
                                    "dep"
                                );
                    }

                    if (
                        filtroTipo ===
                        "Saques"
                    ) {
                        correspondeTipo =
                            movimentacaoEhSaque(
                                movimentacao.type
                            );
                    }

                    if (
                        filtroTipo ===
                        "Transferências"
                    ) {
                        correspondeTipo =
                            movimentacaoEhTransferencia(
                                movimentacao.type
                            );
                    }

                    const dataMovimentacao =
                        obterDataParaFiltro(
                            movimentacao.createdAt
                        );

                    let correspondeData =
                        true;

                    if (
                        dataInicial &&
                        dataMovimentacao
                    ) {
                        const inicio =
                            new Date(
                                `${dataInicial}T00:00:00`
                            );

                        correspondeData =
                            correspondeData &&
                            dataMovimentacao >=
                            inicio;
                    }

                    if (
                        dataFinal &&
                        dataMovimentacao
                    ) {
                        const fim =
                            new Date(
                                `${dataFinal}T23:59:59`
                            );

                        correspondeData =
                            correspondeData &&
                            dataMovimentacao <=
                            fim;
                    }

                    return (
                        correspondeBusca &&
                        correspondeTipo &&
                        correspondeData
                    );
                }
            );
        }, [
            extrato,
            busca,
            filtroTipo,
            dataInicial,
            dataFinal,
        ]);

    const totalEntradas =
        useMemo(() => {
            return (
                extrato?.transactions ??
                []
            )
                .filter(
                    (movimentacao) =>
                        movimentacaoEhEntrada(
                            movimentacao.type
                        )
                )
                .reduce(
                    (
                        total,
                        movimentacao
                    ) =>
                        total +
                        movimentacao.amount,
                    0
                );
        }, [extrato]);

    const totalSaidas =
        useMemo(() => {
            return (
                extrato?.transactions ??
                []
            )
                .filter(
                    (movimentacao) =>
                        !movimentacaoEhEntrada(
                            movimentacao.type
                        )
                )
                .reduce(
                    (
                        total,
                        movimentacao
                    ) =>
                        total +
                        movimentacao.amount,
                    0
                );
        }, [extrato]);

    function limparFiltros() {
        setBusca("");
        setFiltroTipo("Todas");
        setDataInicial("");
        setDataFinal("");
    }

    if (carregando) {
        return (
            <main className="extrato-loading">
                <strong>
                    CoreBank
                </strong>

                <p>
                    Carregando seu
                    extrato...
                </p>
            </main>
        );
    }

    return (
        <main
            className={`extrato-page ${sidebarRecolhida
                    ? "sidebar-collapsed"
                    : ""
                }`}
        >
            <aside className="extrato-sidebar">
                <div className="sidebar-header">
                    <strong className="corebank-logo">
                        <span className="corebank-core">
                            Core
                        </span>

                        <span className="corebank-bank">
                            Bank
                        </span>
                    </strong>

                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={() =>
                            setSidebarRecolhida(
                                !sidebarRecolhida
                            )
                        }
                        title={
                            sidebarRecolhida
                                ? "Expandir menu"
                                : "Recolher menu"
                        }
                    >
                        {sidebarRecolhida
                            ? "›"
                            : "‹"}
                    </button>
                </div>

                <nav className="extrato-nav">
                    <button
                        type="button"
                        className="nav-item"
                        onClick={() =>
                            navigate(
                                "/dashboard"
                            )
                        }
                    >
                        <span className="nav-icon">
                            ◆
                        </span>

                        <span className="nav-text">
                            Início
                        </span>
                    </button>

                    <button
                        type="button"
                        className="nav-item"
                        onClick={() =>
                            navigate(
                                "/transacoes"
                            )
                        }
                    >
                        <span className="nav-icon">
                            ➤
                        </span>

                        <span className="nav-text">
                            Transações
                        </span>
                    </button>

                    <button
                        type="button"
                        className="nav-item active"
                    >
                        <span className="nav-icon">
                            ▤
                        </span>

                        <span className="nav-text">
                            Extrato
                        </span>
                    </button>

                    <button
                        type="button"
                        className="nav-item"
                        onClick={() =>
                            navigate(
                                "/solicitacoes"
                            )
                        }
                    >
                        <span className="nav-icon">
                            ◇
                        </span>

                        <span className="nav-text">
                            Solicitações
                        </span>
                    </button>

                    <button
                        type="button"
                        className="nav-item"
                        onClick={() =>
                            navigate(
                                "/perfil"
                            )
                        }
                    >
                        <span className="nav-icon">
                            ♙
                        </span>

                        <span className="nav-text">
                            Perfil
                        </span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="security-box">
                        <span className="security-icon">
                            ✓
                        </span>

                        <div className="security-text">
                            <strong>
                                Ambiente seguro
                            </strong>

                            <small>
                                Sessão protegida
                            </small>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={
                            handleLogout
                        }
                    >
                        <span className="logout-icon">
                            ↪
                        </span>

                        <span className="nav-text">
                            Sair
                        </span>
                    </button>
                </div>
            </aside>

            <section className="extrato-content">
                <header className="extrato-header">
                    <div>
                        <span className="section-label">
                            HISTÓRICO
                            FINANCEIRO
                        </span>

                        <h1>
                            Extrato
                        </h1>

                        <p>
                            Acompanhe todas as
                            movimentações da sua
                            conta.
                        </p>
                    </div>

                    <div className="header-user">
                        <div className="header-user-info">
                            <strong>
                                {usuario?.nome ??
                                    "Cliente CoreBank"}
                            </strong>

                            <span>
                                {usuario?.email}
                            </span>
                        </div>

                        <div className="user-avatar">
                            {usuario?.nome
                                ?.charAt(0)
                                .toUpperCase() ??
                                "C"}
                        </div>
                    </div>
                </header>

                {erro ? (
                    <section className="extrato-error">
                        <span>
                            !
                        </span>

                        <div>
                            <strong>
                                Não foi possível
                                carregar o extrato
                            </strong>

                            <p>
                                {erro}
                            </p>
                        </div>
                    </section>
                ) : (
                    <>
                        <section className="extrato-summary">
                            <article className="extrato-balance">
                                <div>
                                    <span className="section-label">
                                        SALDO ATUAL
                                    </span>

                                    <div className="balance-value">
                                        <strong>
                                            {saldoVisivel
                                                ? formatarMoeda(
                                                    extrato?.balance ??
                                                    0
                                                )
                                                : "R$ ••••••"}
                                        </strong>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSaldoVisivel(
                                                    !saldoVisivel
                                                )
                                            }
                                        >
                                            {saldoVisivel
                                                ? "◉"
                                                : "○"}
                                        </button>
                                    </div>
                                </div>

                                <div className="account-information">
                                    <div>
                                        <span>
                                            Agência
                                        </span>

                                        <strong>
                                            {
                                                extrato?.agency
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Conta
                                        </span>

                                        <strong>
                                            {
                                                extrato?.number
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Status
                                        </span>

                                        <strong className="status-active">
                                            ●{" "}
                                            {
                                                extrato?.status
                                            }
                                        </strong>
                                    </div>
                                </div>

                                <div className="balance-line line-one"></div>

                                <div className="balance-line line-two"></div>
                            </article>

                            <article className="extrato-stat-card">
                                <span className="stat-icon income">
                                    ↓
                                </span>

                                <div>
                                    <span>
                                        ENTRADAS
                                    </span>

                                    <strong className="income-text">
                                        {formatarMoeda(
                                            totalEntradas
                                        )}
                                    </strong>

                                    <small>
                                        Total recebido
                                    </small>
                                </div>
                            </article>

                            <article className="extrato-stat-card">
                                <span className="stat-icon expense">
                                    ↑
                                </span>

                                <div>
                                    <span>
                                        SAÍDAS
                                    </span>

                                    <strong className="expense-text">
                                        {formatarMoeda(
                                            totalSaidas
                                        )}
                                    </strong>

                                    <small>
                                        Total movimentado
                                    </small>
                                </div>
                            </article>
                        </section>

                        <section className="extrato-panel">
                            <div className="extrato-panel-header">
                                <div>
                                    <span className="section-label">
                                        MOVIMENTAÇÕES
                                    </span>

                                    <h2>
                                        Histórico da conta
                                    </h2>

                                    <p>
                                        Consulte e filtre
                                        suas transações.
                                    </p>
                                </div>

                                <div className="result-count">
                                    {
                                        movimentacoesFiltradas.length
                                    }

                                    <span>
                                        {" "}
                                        registro
                                        {movimentacoesFiltradas.length !==
                                            1
                                            ? "s"
                                            : ""}
                                    </span>
                                </div>
                            </div>

                            <div className="extrato-filters">
                                <div className="filter-field search-field">
                                    <label htmlFor="busca">
                                        Buscar
                                    </label>

                                    <div className="filter-input">
                                        <span>
                                            ⌕
                                        </span>

                                        <input
                                            id="busca"
                                            type="text"
                                            placeholder="Descrição ou tipo"
                                            value={
                                                busca
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setBusca(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="filter-field">
                                    <label htmlFor="tipo">
                                        Tipo
                                    </label>

                                    <select
                                        id="tipo"
                                        value={
                                            filtroTipo
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setFiltroTipo(
                                                event
                                                    .target
                                                    .value as FiltroTipo
                                            )
                                        }
                                    >
                                        <option value="Todas">
                                            Todas
                                        </option>

                                        <option value="Entradas">
                                            Entradas
                                        </option>

                                        <option value="Saídas">
                                            Saídas
                                        </option>

                                        <option value="Depósitos">
                                            Depósitos
                                        </option>

                                        <option value="Saques">
                                            Saques
                                        </option>

                                        <option value="Transferências">
                                            Transferências
                                        </option>
                                    </select>
                                </div>

                                <div className="filter-field">
                                    <label htmlFor="dataInicial">
                                        De
                                    </label>

                                    <input
                                        id="dataInicial"
                                        type="date"
                                        value={
                                            dataInicial
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setDataInicial(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>

                                <div className="filter-field">
                                    <label htmlFor="dataFinal">
                                        Até
                                    </label>

                                    <input
                                        id="dataFinal"
                                        type="date"
                                        value={
                                            dataFinal
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setDataFinal(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="clear-filters"
                                    onClick={
                                        limparFiltros
                                    }
                                >
                                    Limpar
                                </button>
                            </div>

                            <div className="statement-table">
                                <div className="statement-table-header">
                                    <span>
                                        Movimentação
                                    </span>

                                    <span>
                                        Data
                                    </span>

                                    <span>
                                        Valor
                                    </span>
                                </div>

                                <div className="statement-list">
                                    {movimentacoesFiltradas.length ===
                                        0 ? (
                                        <div className="statement-empty">
                                            <span>
                                                ⇄
                                            </span>

                                            <strong>
                                                Nenhuma
                                                movimentação
                                                encontrada
                                            </strong>

                                            <p>
                                                Não existem
                                                registros
                                                para os
                                                filtros
                                                selecionados.
                                            </p>
                                        </div>
                                    ) : (
                                        movimentacoesFiltradas.map(
                                            (
                                                movimentacao
                                            ) => {
                                                const entrada =
                                                    movimentacaoEhEntrada(
                                                        movimentacao.type
                                                    );

                                                return (
                                                    <div
                                                        className="statement-item"
                                                        key={
                                                            movimentacao.id
                                                        }
                                                    >
                                                        <div className="statement-transaction">
                                                            <div
                                                                className={`statement-icon ${entrada
                                                                        ? "income"
                                                                        : "expense"
                                                                    }`}
                                                            >
                                                                {entrada
                                                                    ? "↓"
                                                                    : "↑"}
                                                            </div>

                                                            <div>
                                                                <strong>
                                                                    {
                                                                        movimentacao.type
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    {movimentacao.description ||
                                                                        "Movimentação CoreBank"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="statement-date">
                                                            {formatarData(
                                                                movimentacao.createdAt
                                                            )}
                                                        </div>

                                                        <div
                                                            className={`statement-amount ${entrada
                                                                    ? "income"
                                                                    : "expense"
                                                                }`}
                                                        >
                                                            {entrada
                                                                ? "+"
                                                                : "-"}{" "}
                                                            {formatarMoeda(
                                                                movimentacao.amount
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )
                                    )}
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </section>
        </main>
    );
}

export default Extrato;