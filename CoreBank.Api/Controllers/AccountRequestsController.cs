using CoreBank.Api.Helpers;
using CoreBank.Domain.Entities;
using CoreBank.Domain.Enums;
using CoreBank.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CoreBank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Customer")]
public class AccountRequestsController : ControllerBase
{
    private readonly CoreBankDbContext _context;

    public AccountRequestsController(CoreBankDbContext context)
    {
        _context = context;
    }

    // Obtém o ID do cliente autenticado através do JWT.
    private int GetAuthenticatedCustomerId()
    {
        var customerIdClaim = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(customerIdClaim, out int customerId))
        {
            throw new UnauthorizedAccessException(
                "Usuário não autenticado.");
        }

        return customerId;
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

    // Gera uma descrição amigável para a solicitação.
    private static string FormatRequestDescription(AccountRequestType type)
    {
        return type switch
        {
            AccountRequestType.Block =>
                "Solicitação de bloqueio da conta.",

            AccountRequestType.Unblock =>
                "Solicitação de desbloqueio da conta.",

            _ =>
                "Solicitação registrada no CoreBank."
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

    // ============================================================
    // HISTÓRICO DE SOLICITAÇÕES DO CLIENTE
    // ============================================================

    [HttpGet("me")]
    public async Task<IActionResult> GetMyRequests()
    {
        int customerId = GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account =>
                account.CustomerId == customerId);

        if (account is null)
        {
            return NotFound(
                "Conta não encontrada.");
        }

        var requests = await _context.AccountRequests
            .AsNoTracking()
            .Where(request =>
                request.AccountId == account.Id)
            .OrderByDescending(request =>
                request.CreatedAt)
            .ToListAsync();

        var result = requests
            .Select(request => new
            {
                Id = request.Id,

                Tipo =
                    FormatRequestType(
                        request.Type),

                Descricao =
                    FormatRequestDescription(
                        request.Type),

                Status =
                    FormatRequestStatus(
                        request.Status),

                CreatedAt =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.CreatedAt),

                ReviewedAt =
                    DateTimeHelper.ToBrazilianDateTime(
                        request.ReviewedAt)
            })
            .ToList();

        return Ok(result);
    }

    // ============================================================
    // SOLICITAÇÃO DE BLOQUEIO
    // ============================================================

    [HttpPost("me/block")]
    public async Task<IActionResult> RequestBlock()
    {
        int customerId = GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.CustomerId == customerId);

        if (account is null)
        {
            return NotFound(
                "Conta não encontrada.");
        }

        // Não permite solicitar bloqueio
        // caso a conta já esteja bloqueada.
        if (account.Status == AccountStatus.Blocked)
        {
            return BadRequest(
                "A conta já está bloqueada.");
        }

        // Evita várias solicitações pendentes
        // para a mesma conta.
        bool pendingRequestExists =
            await _context.AccountRequests
                .AnyAsync(request =>
                    request.AccountId == account.Id &&
                    request.Status ==
                        AccountRequestStatus.Pending);

        if (pendingRequestExists)
        {
            return BadRequest(
                "Já existe uma solicitação pendente para esta conta.");
        }

        var accountRequest = new AccountRequest
        {
            AccountId = account.Id,
            Type = AccountRequestType.Block
        };

        _context.AccountRequests.Add(
            accountRequest);

        await _context.SaveChangesAsync();

        return Created(
            $"/api/accountrequests/{accountRequest.Id}",
            new
            {
                Id = accountRequest.Id,

                Tipo =
                    FormatRequestType(
                        accountRequest.Type),

                Descricao =
                    FormatRequestDescription(
                        accountRequest.Type),

                Status =
                    FormatRequestStatus(
                        accountRequest.Status),

                CreatedAt =
                    DateTimeHelper.ToBrazilianDateTime(
                        accountRequest.CreatedAt),

                ReviewedAt =
                    DateTimeHelper.ToBrazilianDateTime(
                        accountRequest.ReviewedAt),

                Message =
                    "Solicitação de bloqueio realizada com sucesso."
            });
    }

    // ============================================================
    // SOLICITAÇÃO DE DESBLOQUEIO
    // ============================================================

    [HttpPost("me/unblock")]
    public async Task<IActionResult> RequestUnblock()
    {
        int customerId = GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.CustomerId == customerId);

        if (account is null)
        {
            return NotFound(
                "Conta não encontrada.");
        }

        // Só é possível solicitar desbloqueio
        // quando a conta estiver bloqueada.
        if (account.Status == AccountStatus.Active)
        {
            return BadRequest(
                "A conta já está ativa.");
        }

        // Evita várias solicitações pendentes
        // para a mesma conta.
        bool pendingRequestExists =
            await _context.AccountRequests
                .AnyAsync(request =>
                    request.AccountId == account.Id &&
                    request.Status ==
                        AccountRequestStatus.Pending);

        if (pendingRequestExists)
        {
            return BadRequest(
                "Já existe uma solicitação pendente para esta conta.");
        }

        var accountRequest = new AccountRequest
        {
            AccountId = account.Id,
            Type = AccountRequestType.Unblock
        };

        _context.AccountRequests.Add(
            accountRequest);

        await _context.SaveChangesAsync();

        return Created(
            $"/api/accountrequests/{accountRequest.Id}",
            new
            {
                Id = accountRequest.Id,

                Tipo =
                    FormatRequestType(
                        accountRequest.Type),

                Descricao =
                    FormatRequestDescription(
                        accountRequest.Type),

                Status =
                    FormatRequestStatus(
                        accountRequest.Status),

                CreatedAt =
                    DateTimeHelper.ToBrazilianDateTime(
                        accountRequest.CreatedAt),

                ReviewedAt =
                    DateTimeHelper.ToBrazilianDateTime(
                        accountRequest.ReviewedAt),

                Message =
                    "Solicitação de desbloqueio realizada com sucesso."
            });
    }
}