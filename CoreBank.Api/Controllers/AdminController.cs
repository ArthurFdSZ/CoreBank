using CoreBank.Api.Helpers;
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
            var account = await _context.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(account =>
                    account.Id == request.AccountId);

            if (account is null)
            {
                continue;
            }

            var customer = await _context.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(customer =>
                    customer.Id == account.CustomerId);

            result.Add(new
            {
                SolicitacaoId = request.Id,
                Tipo = FormatRequestType(request.Type),
                Status = FormatRequestStatus(request.Status),

                DataSolicitacao =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.CreatedAt),

                ContaId = account.Id,
                Agencia = account.Agency,
                NumeroConta = account.Number,

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
            var account = await _context.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(account =>
                    account.Id == request.AccountId);

            if (account is null)
            {
                continue;
            }

            var customer = await _context.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(customer =>
                    customer.Id == account.CustomerId);

            result.Add(new
            {
                SolicitacaoId = request.Id,
                Tipo = FormatRequestType(request.Type),
                Status = FormatRequestStatus(request.Status),

                DataSolicitacao =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.CreatedAt),

                DataAnalise =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.ReviewedAt),

                ContaId = account.Id,
                Agencia = account.Agency,
                NumeroConta = account.Number,

                StatusConta =
                    FormatAccountStatus(account.Status),

                ClienteId = customer?.Id,
                NomeCliente = customer?.Name,
                CpfCliente = customer?.Cpf
            });
        }

        return Ok(result);
    }

    // Aprova uma solicitação de bloqueio ou desbloqueio.
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

        var account = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.Id == request.AccountId);

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

    // Rejeita uma solicitação de bloqueio/desbloqueio.
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

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account =>
                account.Id == request.AccountId);

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