using CoreBank.Api.Helpers;
using CoreBank.Domain.Entities;
using CoreBank.Domain.Enums;
using CoreBank.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoreBank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly CoreBankDbContext _context;

    public AdminController(CoreBankDbContext context)
    {
        _context = context;
    }

    // =========================================================
    // FORMATAÇÕES
    // =========================================================

    // Traduz o tipo interno da solicitação de conta.
    private static string FormatRequestType(AccountRequestType type)
    {
        return type switch
        {
            AccountRequestType.Block => "Bloqueio",
            AccountRequestType.Unblock => "Desbloqueio",
            AccountRequestType.OpenAccount => "Abertura de conta",
            _ => "Desconhecido"
        };
    }

    // Traduz o status interno da solicitação de conta.
    private static string FormatRequestStatus(AccountRequestStatus status)
    {
        return status switch
        {
            AccountRequestStatus.Pending => "Pendente",
            AccountRequestStatus.Approved => "Aprovada",
            AccountRequestStatus.Rejected => "Rejeitada",
            _ => "Desconhecido"
        };
    }

    // Traduz o status interno da conta.
    private static string FormatAccountStatus(AccountStatus status)
    {
        return status switch
        {
            AccountStatus.Active => "Ativa",
            AccountStatus.Blocked => "Bloqueada",
            _ => "Desconhecido"
        };
    }

    // Traduz o tipo interno da movimentação bancária.
    private static string FormatTransactionType(TransactionType type)
    {
        return type switch
        {
            TransactionType.Deposit => "Depósito",
            TransactionType.Withdrawal => "Saque",
            TransactionType.TransferSent => "Transferência enviada",
            TransactionType.TransferReceived => "Transferência recebida",
            _ => "Desconhecida"
        };
    }

    // Traduz o status interno da recuperação de senha.
    private static string FormatPasswordResetStatus(
        PasswordResetRequestStatus status)
    {
        return status switch
        {
            PasswordResetRequestStatus.Pending => "Pendente",
            PasswordResetRequestStatus.Approved => "Aprovada",
            PasswordResetRequestStatus.Rejected => "Recusada",
            PasswordResetRequestStatus.Completed => "Concluída",
            _ => "Desconhecido"
        };
    }

    // Gera automaticamente o próximo número de conta disponível.
    private async Task<string> GenerateNextAccountNumber()
    {
        var numbers = await _context.Accounts
            .AsNoTracking()
            .Select(account => account.Number)
            .ToListAsync();

        int nextNumber = 10001;

        var usedNumbers = numbers
            .Where(number => int.TryParse(number, out _))
            .Select(int.Parse)
            .ToHashSet();

        while (usedNumbers.Contains(nextNumber))
        {
            nextNumber++;
        }

        return nextNumber.ToString();
    }

    // =========================================================
    // TESTE DE ACESSO ADMINISTRATIVO
    // =========================================================

    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new
        {
            Message = "Acesso de administrador autorizado."
        });
    }

    // =========================================================
    // DASHBOARD ADMINISTRATIVO
    // =========================================================

    // Retorna todas as informações necessárias
    // para o Dashboard administrativo do CoreBank.
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        // =====================================================
        // MÉTRICAS PRINCIPAIS
        // =====================================================

        var totalClientes = await _context.Customers
            .AsNoTracking()
            .CountAsync();

        var totalContas = await _context.Accounts
            .AsNoTracking()
            .CountAsync();

        var saldoTotal = await _context.Accounts
            .AsNoTracking()
            .SumAsync(account => account.Balance);

        var solicitacoesPendentes =
            await _context.AccountRequests
                .AsNoTracking()
                .CountAsync(request =>
                    request.Status ==
                    AccountRequestStatus.Pending);

        // =====================================================
        // TIPOS DE SOLICITAÇÕES PENDENTES
        // =====================================================

        var bloqueiosPendentes =
            await _context.AccountRequests
                .AsNoTracking()
                .CountAsync(request =>
                    request.Status ==
                        AccountRequestStatus.Pending &&
                    request.Type ==
                        AccountRequestType.Block);

        var desbloqueiosPendentes =
            await _context.AccountRequests
                .AsNoTracking()
                .CountAsync(request =>
                    request.Status ==
                        AccountRequestStatus.Pending &&
                    request.Type ==
                        AccountRequestType.Unblock);

        var aberturasPendentes =
            await _context.AccountRequests
                .AsNoTracking()
                .CountAsync(request =>
                    request.Status ==
                        AccountRequestStatus.Pending &&
                    request.Type ==
                        AccountRequestType.OpenAccount);

        // =====================================================
        // MOVIMENTAÇÕES DOS ÚLTIMOS 7 DIAS
        // =====================================================

        var hoje = DateTime.UtcNow.Date;

        var inicioPeriodo =
            hoje.AddDays(-6);

        var transacoesPeriodo =
            await _context.Transactions
                .AsNoTracking()
                .Where(transaction =>
                    transaction.CreatedAt >=
                    inicioPeriodo)
                .ToListAsync();

        var movimentacoesUltimos7Dias =
            Enumerable
                .Range(0, 7)
                .Select(indice =>
                {
                    var dia =
                        inicioPeriodo.AddDays(indice);

                    var proximoDia =
                        dia.AddDays(1);

                    var transacoesDia =
                        transacoesPeriodo
                            .Where(transaction =>
                                transaction.CreatedAt >= dia &&
                                transaction.CreatedAt <
                                    proximoDia)
                            .ToList();

                    var depositos =
                        transacoesDia
                            .Where(transaction =>
                                transaction.Type ==
                                TransactionType.Deposit)
                            .Sum(transaction =>
                                transaction.Amount);

                    var saques =
                        transacoesDia
                            .Where(transaction =>
                                transaction.Type ==
                                TransactionType.Withdrawal)
                            .Sum(transaction =>
                                transaction.Amount);

                    /*
                     * Uma transferência gera dois registros:
                     *
                     * TransferSent
                     * TransferReceived
                     *
                     * Para não contar o mesmo valor duas
                     * vezes, o Dashboard considera somente
                     * TransferSent.
                     */
                    var transferencias =
                        transacoesDia
                            .Where(transaction =>
                                transaction.Type ==
                                TransactionType.TransferSent)
                            .Sum(transaction =>
                                transaction.Amount);

                    return new
                    {
                        Data =
                            dia.ToString("dd/MM"),

                        Depositos =
                            depositos,

                        Saques =
                            saques,

                        Transferencias =
                            transferencias
                    };
                })
                .ToList();

        // =====================================================
        // ÚLTIMAS SOLICITAÇÕES
        // =====================================================

        var ultimasRequests =
            await _context.AccountRequests
                .AsNoTracking()
                .OrderByDescending(request =>
                    request.CreatedAt)
                .Take(5)
                .ToListAsync();

        var ultimasSolicitacoes =
            new List<object>();

        foreach (var request in ultimasRequests)
        {
            var account = request.AccountId.HasValue
                ? await _context.Accounts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(account =>
                        account.Id == request.AccountId.Value)
                : null;

            int? customerId =
                request.CustomerId ??
                account?.CustomerId;

            var customer = customerId.HasValue
                ? await _context.Customers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(customer =>
                        customer.Id == customerId.Value)
                : null;

            ultimasSolicitacoes.Add(new
            {
                SolicitacaoId =
                    request.Id,

                Tipo =
                    FormatRequestType(
                        request.Type),

                Status =
                    FormatRequestStatus(
                        request.Status),

                ClienteId =
                    customer?.Id,

                NomeCliente =
                    customer?.Name,

                ContaId =
                    account?.Id,

                Agencia =
                    account?.Agency,

                NumeroConta =
                    account?.Number,

                DataSolicitacao =
                    DateTimeHelper
                        .ToBrazilianDateTime(
                            request.CreatedAt)
            });
        }

        // =====================================================
        // ÚLTIMOS CLIENTES CADASTRADOS
        // =====================================================

        var ultimosClientesBanco =
            await _context.Customers
                .AsNoTracking()
                .OrderByDescending(customer =>
                    customer.CreatedAt)
                .Take(5)
                .ToListAsync();

        var ultimosClientes =
            ultimosClientesBanco
                .Select(customer => new
                {
                    customer.Id,

                    Nome =
                        customer.Name,

                    Email =
                        customer.Email,

                    Cpf =
                        customer.Cpf,

                    DataCadastro =
                        DateTimeHelper
                            .ToBrazilianDateTime(
                                customer.CreatedAt)
                })
                .ToList();

        // =====================================================
        // RESPOSTA DO DASHBOARD
        // =====================================================

        return Ok(new
        {
            TotalClientes =
                totalClientes,

            TotalContas =
                totalContas,

            SaldoTotal =
                saldoTotal,

            SolicitacoesPendentes =
                solicitacoesPendentes,

            TiposSolicitacoesPendentes =
                new
                {
                    Bloqueios =
                        bloqueiosPendentes,

                    Desbloqueios =
                        desbloqueiosPendentes,

                    Aberturas =
                        aberturasPendentes,

                    Outros =
                        0
                },

            MovimentacoesUltimos7Dias =
                movimentacoesUltimos7Dias,

            UltimasSolicitacoes =
                ultimasSolicitacoes,

            UltimosClientes =
                ultimosClientes
        });
    }

    // =========================================================
    // CLIENTES
    // =========================================================

    // Retorna todos os clientes cadastrados no CoreBank
    // com um resumo das contas vinculadas a cada cliente.
    [HttpGet("clientes")]
    public async Task<IActionResult> GetClientes()
    {
        var clientes = await _context.Customers
            .AsNoTracking()
            .OrderByDescending(customer => customer.CreatedAt)
            .Select(customer => new
            {
                customer.Id,

                Nome = customer.Name,

                Email = customer.Email,

                Cpf = customer.Cpf,

                DataCadastro = customer.CreatedAt,

                QuantidadeContas = _context.Accounts
                    .Count(account =>
                        account.CustomerId == customer.Id),

                ContasAtivas = _context.Accounts
                    .Count(account =>
                        account.CustomerId == customer.Id &&
                        account.Status == AccountStatus.Active),

                ContasBloqueadas = _context.Accounts
                    .Count(account =>
                        account.CustomerId == customer.Id &&
                        account.Status == AccountStatus.Blocked)
            })
            .ToListAsync();

        var resultado = clientes
            .Select(cliente => new
            {
                cliente.Id,
                cliente.Nome,
                cliente.Email,
                cliente.Cpf,

                DataCadastro =
                    DateTimeHelper.ToBrazilianDateTime(
                        cliente.DataCadastro),

                cliente.QuantidadeContas,
                cliente.ContasAtivas,
                cliente.ContasBloqueadas
            })
            .ToList();

        return Ok(resultado);
    }

    // Retorna os dados completos de um cliente e todas as contas
    // vinculadas a ele.
    [HttpGet("clientes/{id:int}")]
    public async Task<IActionResult> GetClientePorId(int id)
    {
        var cliente = await _context.Customers
            .AsNoTracking()
            .Where(customer => customer.Id == id)
            .Select(customer => new
            {
                customer.Id,
                Nome = customer.Name,
                customer.Email,
                customer.Cpf,
                DataCadastro = customer.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (cliente is null)
        {
            return NotFound(new
            {
                mensagem = "Cliente não encontrado."
            });
        }

        var contas = await _context.Accounts
            .AsNoTracking()
            .Where(account => account.CustomerId == id)
            .OrderBy(account => account.Id)
            .Select(account => new
            {
                account.Id,
                Agencia = account.Agency,
                Numero = account.Number,
                Saldo = account.Balance,
                account.Status,
                DataCriacao = account.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            cliente.Id,
            cliente.Nome,
            cliente.Email,
            cliente.Cpf,
            DataCadastro = DateTimeHelper.ToBrazilianDateTime(
                cliente.DataCadastro),
            QuantidadeContas = contas.Count,
            Contas = contas.Select(account => new
            {
                account.Id,
                account.Agencia,
                account.Numero,
                account.Saldo,
                Status = FormatAccountStatus(account.Status),
                DataCriacao = DateTimeHelper.ToBrazilianDateTime(
                    account.DataCriacao)
            }).ToList()
        });
    }

    // =========================================================
    // CONTAS
    // =========================================================

    // Retorna todas as contas cadastradas no CoreBank
    // com os dados do cliente vinculado.
    [HttpGet("contas")]
    public async Task<IActionResult> GetContas()
    {
        var contas = await _context.Accounts
            .AsNoTracking()
            .OrderByDescending(account => account.CreatedAt)
            .Select(account => new
            {
                account.Id,
                ClienteId = account.CustomerId,
                NomeCliente = _context.Customers
                    .Where(customer => customer.Id == account.CustomerId)
                    .Select(customer => customer.Name)
                    .FirstOrDefault(),
                CpfCliente = _context.Customers
                    .Where(customer => customer.Id == account.CustomerId)
                    .Select(customer => customer.Cpf)
                    .FirstOrDefault(),
                Agencia = account.Agency,
                Numero = account.Number,
                Saldo = account.Balance,
                account.Status,
                DataCriacao = account.CreatedAt
            })
            .ToListAsync();

        var resultado = contas
            .Select(account => new
            {
                account.Id,
                account.ClienteId,
                account.NomeCliente,
                account.CpfCliente,
                account.Agencia,
                account.Numero,
                account.Saldo,
                Status = FormatAccountStatus(account.Status),
                DataCriacao = DateTimeHelper.ToBrazilianDateTime(account.DataCriacao)
            })
            .ToList();

        return Ok(resultado);
    }

    // Retorna os detalhes operacionais de uma conta:
    // resumo, movimentações recentes e histórico de solicitações.
    [HttpGet("contas/{id:int}/detalhes")]
    public async Task<IActionResult> GetDetalhesConta(int id)
    {
        var conta = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account => account.Id == id);

        if (conta is null)
        {
            return NotFound(new
            {
                mensagem = "Conta não encontrada."
            });
        }

        var transacoes = await _context.Transactions
            .AsNoTracking()
            .Where(transaction => transaction.AccountId == id)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .ToListAsync();

        var solicitacoes = await _context.AccountRequests
            .AsNoTracking()
            .Where(request => request.AccountId == id)
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync();

        var quantidadeDepositos = transacoes.Count(transaction =>
            transaction.Type == TransactionType.Deposit);

        var quantidadeSaques = transacoes.Count(transaction =>
            transaction.Type == TransactionType.Withdrawal);

        // Uma transferência possui registro de envio e recebimento.
        // No resumo, cada registro pertencente à conta é apresentado
        // como uma movimentação da própria conta.
        var quantidadeTransferencias = transacoes.Count(transaction =>
            transaction.Type == TransactionType.TransferSent ||
            transaction.Type == TransactionType.TransferReceived);

        var totalMovimentado = transacoes
            .Sum(transaction => transaction.Amount);

        var bloqueios = solicitacoes.Count(request =>
            request.Type == AccountRequestType.Block);

        var desbloqueios = solicitacoes.Count(request =>
            request.Type == AccountRequestType.Unblock);

        return Ok(new
        {
            Conta = new
            {
                conta.Id,
                Agencia = conta.Agency,
                Numero = conta.Number,
                Saldo = conta.Balance,
                Status = FormatAccountStatus(conta.Status),
                DataCriacao = DateTimeHelper.ToBrazilianDateTime(
                    conta.CreatedAt)
            },

            ResumoMovimentacoes = new
            {
                Depositos = quantidadeDepositos,
                Saques = quantidadeSaques,
                Transferencias = quantidadeTransferencias,
                TotalMovimentado = totalMovimentado
            },

            UltimasMovimentacoes = transacoes
                .Take(10)
                .Select(transaction => new
                {
                    transaction.Id,
                    Tipo = FormatTransactionType(transaction.Type),
                    Valor = transaction.Amount,
                    Data = DateTimeHelper.ToBrazilianDateTime(
                        transaction.CreatedAt)
                })
                .ToList(),

            ResumoSolicitacoes = new
            {
                Total = solicitacoes.Count,
                Bloqueios = bloqueios,
                Desbloqueios = desbloqueios,
                Pendentes = solicitacoes.Count(request =>
                    request.Status == AccountRequestStatus.Pending)
            },

            Solicitacoes = solicitacoes
                .Select(request => new
                {
                    request.Id,
                    Tipo = FormatRequestType(request.Type),
                    Status = FormatRequestStatus(request.Status),
                    DataSolicitacao = DateTimeHelper.ToBrazilianDateTime(
                        request.CreatedAt),
                    DataAnalise = DateTimeHelper.ToBrazilianDateTime(
                        request.ReviewedAt)
                })
                .ToList()
        });
    }

    // =========================================================
    // SOLICITAÇÕES DE BLOQUEIO / DESBLOQUEIO
    // =========================================================

    // Retorna todas as solicitações de conta pendentes.
    [HttpGet("account-requests/pending")]
    public async Task<IActionResult> GetPendingAccountRequests()
    {
        var requests = await _context.AccountRequests
            .AsNoTracking()
            .Where(request =>
                request.Status == AccountRequestStatus.Pending)
            .OrderBy(request => request.CreatedAt)
            .ToListAsync();

        var result = new List<object>();

        foreach (var request in requests)
        {
            var account = request.AccountId.HasValue
                ? await _context.Accounts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(account =>
                        account.Id == request.AccountId.Value)
                : null;

            int? customerId =
                request.CustomerId ??
                account?.CustomerId;

            var customer = customerId.HasValue
                ? await _context.Customers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(customer =>
                        customer.Id == customerId.Value)
                : null;

            result.Add(new
            {
                SolicitacaoId = request.Id,
                Tipo = FormatRequestType(request.Type),
                Motivo = request.Reason,
                Status = FormatRequestStatus(request.Status),

                DataSolicitacao =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.CreatedAt),

                ContaId = account?.Id,
                Agencia = account?.Agency,
                NumeroConta = account?.Number,

                ClienteId = customer?.Id,
                NomeCliente = customer?.Name,
                CpfCliente = customer?.Cpf
            });
        }

        return Ok(result);
    }

    // Retorna o histórico completo das solicitações de conta.
    [HttpGet("account-requests")]
    public async Task<IActionResult> GetAccountRequestsHistory()
    {
        var requests = await _context.AccountRequests
            .AsNoTracking()
            .OrderByDescending(request =>
                request.CreatedAt)
            .ToListAsync();

        var result = new List<object>();

        foreach (var request in requests)
        {
            var account = request.AccountId.HasValue
                ? await _context.Accounts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(account =>
                        account.Id == request.AccountId.Value)
                : null;

            int? customerId =
                request.CustomerId ??
                account?.CustomerId;

            var customer = customerId.HasValue
                ? await _context.Customers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(customer =>
                        customer.Id == customerId.Value)
                : null;

            result.Add(new
            {
                SolicitacaoId = request.Id,
                Tipo = FormatRequestType(request.Type),
                Motivo = request.Reason,
                Status = FormatRequestStatus(request.Status),

                DataSolicitacao =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.CreatedAt),

                DataAnalise =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.ReviewedAt),

                ContaId = account?.Id,
                Agencia = account?.Agency,
                NumeroConta = account?.Number,

                StatusConta =
                    account is null
                        ? null
                        : FormatAccountStatus(account.Status),

                ClienteId = customer?.Id,
                NomeCliente = customer?.Name,
                CpfCliente = customer?.Cpf
            });
        }

        return Ok(result);
    }

    // Aprova uma solicitação de conta.
    // Em abertura de conta, cria automaticamente a conta do cliente.
    [HttpPost("account-requests/{id}/approve")]
    public async Task<IActionResult> ApproveAccountRequest(int id)
    {
        var request = await _context.AccountRequests
            .FirstOrDefaultAsync(request =>
                request.Id == id);

        if (request is null)
        {
            return NotFound(
                "Solicitação não encontrada.");
        }

        if (request.Status != AccountRequestStatus.Pending)
        {
            return BadRequest(
                "A solicitação já foi analisada.");
        }

        // =====================================================
        // ABERTURA DE CONTA
        // =====================================================
        if (request.Type == AccountRequestType.OpenAccount)
        {
            if (!request.CustomerId.HasValue)
            {
                return BadRequest(
                    "Cliente da solicitação não identificado.");
            }

            var customer = await _context.Customers
                .FirstOrDefaultAsync(customer =>
                    customer.Id == request.CustomerId.Value);

            if (customer is null)
            {
                return NotFound(
                    "Cliente relacionado à solicitação não encontrado.");
            }

            bool customerAlreadyHasAccount =
                await _context.Accounts
                    .AnyAsync(account =>
                        account.CustomerId == customer.Id);

            if (customerAlreadyHasAccount)
            {
                return BadRequest(
                    "O cliente já possui uma conta.");
            }

            string accountNumber =
                await GenerateNextAccountNumber();

            var newAccount = new Account
            {
                CustomerId = customer.Id,
                Agency = "0001",
                Number = accountNumber
            };

            _context.Accounts.Add(newAccount);

            // Salva primeiro para obter o Id da nova conta.
            await _context.SaveChangesAsync();

            request.AccountId = newAccount.Id;
            request.Approve();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Mensagem =
                    "Solicitação aprovada e conta criada com sucesso.",

                SolicitacaoId = request.Id,

                Tipo =
                    FormatRequestType(request.Type),

                StatusSolicitacao =
                    FormatRequestStatus(request.Status),

                ContaId = newAccount.Id,
                Agencia = newAccount.Agency,
                NumeroConta = newAccount.Number,

                StatusConta =
                    FormatAccountStatus(newAccount.Status),

                DataAnalise =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.ReviewedAt)
            });
        }

        // =====================================================
        // BLOQUEIO / DESBLOQUEIO
        // =====================================================
        if (!request.AccountId.HasValue)
        {
            return NotFound(
                "Conta relacionada à solicitação não encontrada.");
        }

        var account = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.Id == request.AccountId.Value);

        if (account is null)
        {
            return NotFound(
                "Conta relacionada à solicitação não encontrada.");
        }

        switch (request.Type)
        {
            case AccountRequestType.Block:
                account.Block();
                break;

            case AccountRequestType.Unblock:
                account.Unblock();
                break;

            default:
                return BadRequest(
                    "Tipo de solicitação inválido.");
        }

        request.Approve();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            Mensagem =
                "Solicitação aprovada com sucesso.",

            SolicitacaoId = request.Id,

            Tipo =
                FormatRequestType(request.Type),

            StatusSolicitacao =
                FormatRequestStatus(request.Status),

            StatusConta =
                FormatAccountStatus(account.Status),

            DataAnalise =
                DateTimeHelper.ToBrazilianDateTime(
                    request.ReviewedAt)
        });
    }

    // Rejeita uma solicitação de conta.
    [HttpPost("account-requests/{id}/reject")]
    public async Task<IActionResult> RejectAccountRequest(int id)
    {
        var request = await _context.AccountRequests
            .FirstOrDefaultAsync(request =>
                request.Id == id);

        if (request is null)
        {
            return NotFound(
                "Solicitação não encontrada.");
        }

        if (request.Status != AccountRequestStatus.Pending)
        {
            return BadRequest(
                "A solicitação já foi analisada.");
        }

        // Abertura de conta pode ser rejeitada sem existir AccountId.
        if (request.Type == AccountRequestType.OpenAccount)
        {
            request.Reject();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Mensagem =
                    "Solicitação de abertura de conta rejeitada.",

                SolicitacaoId = request.Id,

                Tipo =
                    FormatRequestType(request.Type),

                StatusSolicitacao =
                    FormatRequestStatus(request.Status),

                StatusConta =
                    (string?)null,

                DataAnalise =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.ReviewedAt)
            });
        }

        if (!request.AccountId.HasValue)
        {
            return NotFound(
                "Conta relacionada à solicitação não encontrada.");
        }

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account =>
                account.Id == request.AccountId.Value);

        if (account is null)
        {
            return NotFound(
                "Conta relacionada à solicitação não encontrada.");
        }

        request.Reject();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            Mensagem =
                "Solicitação rejeitada com sucesso.",

            SolicitacaoId = request.Id,

            Tipo =
                FormatRequestType(request.Type),

            StatusSolicitacao =
                FormatRequestStatus(request.Status),

            StatusConta =
                FormatAccountStatus(account.Status),

            DataAnalise =
                DateTimeHelper.ToBrazilianDateTime(
                    request.ReviewedAt)
        });
    }


    // =========================================================
    // RECUPERAÇÃO DE SENHA
    // =========================================================

    // Retorna somente as solicitações de recuperação
    // de senha que aguardam análise do administrador.
    [HttpGet("password-reset-requests/pending")]
    public async Task<IActionResult>
        GetPendingPasswordResetRequests()
    {
        var requests = await _context.PasswordResetRequests
            .AsNoTracking()
            .Where(request =>
                request.Status ==
                PasswordResetRequestStatus.Pending)
            .OrderBy(request => request.CreatedAt)
            .ToListAsync();

        var result = new List<object>();

        foreach (var request in requests)
        {
            var customer = await _context.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(customer =>
                    customer.Id == request.CustomerId);

            if (customer is null)
            {
                continue;
            }

            result.Add(new
            {
                SolicitacaoId = request.Id,

                Status =
                    FormatPasswordResetStatus(
                        request.Status),

                DataSolicitacao =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.CreatedAt),

                ClienteId = customer.Id,
                NomeCliente = customer.Name,
                EmailCliente = customer.Email,
                CpfCliente = customer.Cpf
            });
        }

        return Ok(result);
    }

    // Retorna o histórico completo de solicitações
    // de recuperação de senha.
    [HttpGet("password-reset-requests")]
    public async Task<IActionResult>
        GetPasswordResetRequestsHistory()
    {
        var requests = await _context.PasswordResetRequests
            .AsNoTracking()
            .OrderByDescending(request =>
                request.CreatedAt)
            .ToListAsync();

        var result = new List<object>();

        foreach (var request in requests)
        {
            var customer = await _context.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(customer =>
                    customer.Id == request.CustomerId);

            if (customer is null)
            {
                continue;
            }

            result.Add(new
            {
                SolicitacaoId = request.Id,

                Status =
                    FormatPasswordResetStatus(
                        request.Status),

                DataSolicitacao =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.CreatedAt),

                DataAnalise =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.ReviewedAt),

                DataConclusao =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.CompletedAt),

                ClienteId = customer.Id,
                NomeCliente = customer.Name,
                EmailCliente = customer.Email,
                CpfCliente = customer.Cpf
            });
        }

        return Ok(result);
    }

    // Aprova uma solicitação de recuperação de senha.
    [HttpPost("password-reset-requests/{id}/approve")]
    public async Task<IActionResult>
        ApprovePasswordResetRequest(int id)
    {
        var request = await _context.PasswordResetRequests
            .FirstOrDefaultAsync(request =>
                request.Id == id);

        if (request is null)
        {
            return NotFound(new
            {
                mensagem =
                    "Solicitação de recuperação de senha não encontrada."
            });
        }

        if (request.Status !=
            PasswordResetRequestStatus.Pending)
        {
            return BadRequest(new
            {
                mensagem =
                    "A solicitação já foi analisada."
            });
        }

        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(customer =>
                customer.Id == request.CustomerId);

        if (customer is null)
        {
            return NotFound(new
            {
                mensagem =
                    "Cliente relacionado à solicitação não encontrado."
            });
        }

        request.Approve();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensagem =
                "Recuperação de senha aprovada com sucesso.",

            solicitacaoId = request.Id,

            status =
                FormatPasswordResetStatus(
                    request.Status),

            clienteId = customer.Id,
            nomeCliente = customer.Name,
            emailCliente = customer.Email,

            dataAnalise =
                DateTimeHelper.ToBrazilianDateTime(
                    request.ReviewedAt)
        });
    }

    // Recusa uma solicitação de recuperação de senha.
    [HttpPost("password-reset-requests/{id}/reject")]
    public async Task<IActionResult>
        RejectPasswordResetRequest(int id)
    {
        var request = await _context.PasswordResetRequests
            .FirstOrDefaultAsync(request =>
                request.Id == id);

        if (request is null)
        {
            return NotFound(new
            {
                mensagem =
                    "Solicitação de recuperação de senha não encontrada."
            });
        }

        if (request.Status !=
            PasswordResetRequestStatus.Pending)
        {
            return BadRequest(new
            {
                mensagem =
                    "A solicitação já foi analisada."
            });
        }

        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(customer =>
                customer.Id == request.CustomerId);

        if (customer is null)
        {
            return NotFound(new
            {
                mensagem =
                    "Cliente relacionado à solicitação não encontrado."
            });
        }

        request.Reject();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensagem =
                "Recuperação de senha recusada com sucesso.",

            solicitacaoId = request.Id,

            status =
                FormatPasswordResetStatus(
                    request.Status),

            clienteId = customer.Id,
            nomeCliente = customer.Name,
            emailCliente = customer.Email,

            dataAnalise =
                DateTimeHelper.ToBrazilianDateTime(
                    request.ReviewedAt)
        });
    }
}