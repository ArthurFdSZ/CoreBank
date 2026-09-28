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

    // Traduz o tipo interno da solicitação para português.
    private static string FormatRequestType(AccountRequestType type)
    {
        return type switch
        {
            AccountRequestType.Block => "Bloqueio",
            AccountRequestType.Unblock => "Desbloqueio",
            _ => "Desconhecido"
        };
    }

    // Traduz o status interno da solicitação para português.
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

    // Traduz o status interno da conta para português.
    private static string FormatAccountStatus(AccountStatus status)
    {
        return status switch
        {
            AccountStatus.Active => "Ativa",
            AccountStatus.Blocked => "Bloqueada",
            _ => "Desconhecido"
        };
    }

    // Endpoint simples para validar o acesso administrativo.
    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new
        {
            Message = "Acesso de administrador autorizado."
        });
    }

    // Retorna todas as solicitações que aguardam análise.
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

    // Retorna o histórico completo de solicitações.
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
            return NotFound("Solicitação não encontrada.");
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

        // Executa a ação solicitada pelo cliente.
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
            Mensagem = "Solicitação aprovada com sucesso.",
            SolicitacaoId = request.Id,
            Tipo = FormatRequestType(request.Type),
            StatusSolicitacao =
                FormatRequestStatus(request.Status),
            StatusConta =
                FormatAccountStatus(account.Status),
            DataAnalise =
                DateTimeHelper.ToBrazilianDateTime(
                    request.ReviewedAt)
        });
    }

    // Rejeita uma solicitação sem alterar o status da conta.
    [HttpPost("account-requests/{id}/reject")]
    public async Task<IActionResult> RejectAccountRequest(int id)
    {
        var request = await _context.AccountRequests
            .FirstOrDefaultAsync(request =>
                request.Id == id);

        if (request is null)
        {
            return NotFound("Solicitação não encontrada.");
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
            Mensagem = "Solicitação rejeitada com sucesso.",
            SolicitacaoId = request.Id,
            Tipo = FormatRequestType(request.Type),
            StatusSolicitacao =
                FormatRequestStatus(request.Status),
            StatusConta =
                FormatAccountStatus(account.Status),
            DataAnalise =
                DateTimeHelper.ToBrazilianDateTime(
                    request.ReviewedAt)
        });
    }
}