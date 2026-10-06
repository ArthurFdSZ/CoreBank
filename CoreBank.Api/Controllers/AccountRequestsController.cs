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

    // ============================================================
    // DTO
    // ============================================================

    // Dados enviados pelo cliente ao criar uma solicitação.
    public class CreateAccountRequestDto
    {
        public string Motivo { get; set; } = string.Empty;
    }

    // ============================================================
    // MÉTODOS AUXILIARES
    // ============================================================

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
            AccountRequestType.OpenAccount => "Abertura de conta",
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

            AccountRequestType.OpenAccount =>
                "Solicitação de abertura de conta.",

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

    // Valida e normaliza o motivo informado pelo cliente.
    private static string? ValidateReason(
        CreateAccountRequestDto? request)
    {
        if (request is null ||
            string.IsNullOrWhiteSpace(request.Motivo))
        {
            return null;
        }

        return request.Motivo.Trim();
    }

    // ============================================================
    // HISTÓRICO DE SOLICITAÇÕES DO CLIENTE
    // ============================================================

    [HttpGet("me")]
    public async Task<IActionResult> GetMyRequests()
    {
        int customerId = GetAuthenticatedCustomerId();

        var requests = await _context.AccountRequests
            .AsNoTracking()
            .Where(request =>
                request.CustomerId == customerId)
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

                Motivo =
                    request.Reason,

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
    public async Task<IActionResult> RequestBlock(
        [FromBody] CreateAccountRequestDto request)
    {
        int customerId = GetAuthenticatedCustomerId();

        // Valida o motivo informado pelo cliente.
        string? reason = ValidateReason(request);

        if (reason is null)
        {
            return BadRequest(
                "O motivo da solicitação é obrigatório.");
        }

        if (reason.Length > 500)
        {
            return BadRequest(
                "O motivo da solicitação deve ter no máximo 500 caracteres.");
        }

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
            CustomerId = customerId,
            AccountId = account.Id,

            Type =
                AccountRequestType.Block,

            Reason =
                reason
        };

        _context.AccountRequests.Add(
            accountRequest);

        await _context.SaveChangesAsync();

        return Created(
            $"/api/accountrequests/{accountRequest.Id}",
            new
            {
                Id =
                    accountRequest.Id,

                Tipo =
                    FormatRequestType(
                        accountRequest.Type),

                Descricao =
                    FormatRequestDescription(
                        accountRequest.Type),

                Motivo =
                    accountRequest.Reason,

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
    public async Task<IActionResult> RequestUnblock(
        [FromBody] CreateAccountRequestDto request)
    {
        int customerId = GetAuthenticatedCustomerId();

        // Valida o motivo informado pelo cliente.
        string? reason = ValidateReason(request);

        if (reason is null)
        {
            return BadRequest(
                "O motivo da solicitação é obrigatório.");
        }

        if (reason.Length > 500)
        {
            return BadRequest(
                "O motivo da solicitação deve ter no máximo 500 caracteres.");
        }

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
            CustomerId = customerId,
            AccountId = account.Id,

            Type =
                AccountRequestType.Unblock,

            Reason =
                reason
        };

        _context.AccountRequests.Add(
            accountRequest);

        await _context.SaveChangesAsync();

        return Created(
            $"/api/accountrequests/{accountRequest.Id}",
            new
            {
                Id =
                    accountRequest.Id,

                Tipo =
                    FormatRequestType(
                        accountRequest.Type),

                Descricao =
                    FormatRequestDescription(
                        accountRequest.Type),

                Motivo =
                    accountRequest.Reason,

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

    // ============================================================
    // SOLICITAÇÃO DE ABERTURA DE CONTA
    // ============================================================

    [HttpPost("me/open")]
    public async Task<IActionResult> RequestOpenAccount(
        [FromBody] CreateAccountRequestDto request)
    {
        int customerId = GetAuthenticatedCustomerId();

        string? reason = ValidateReason(request);

        if (reason is null)
        {
            return BadRequest(
                "O motivo da solicitação é obrigatório.");
        }

        if (reason.Length > 500)
        {
            return BadRequest(
                "O motivo da solicitação deve ter no máximo 500 caracteres.");
        }

        // A abertura só pode ser solicitada por um cliente
        // que ainda não possui conta bancária.
        bool accountExists =
            await _context.Accounts
                .AnyAsync(account =>
                    account.CustomerId == customerId);

        if (accountExists)
        {
            return BadRequest(
                "Você já possui uma conta no CoreBank.");
        }

        // Evita mais de uma solicitação de abertura pendente.
        bool pendingOpenRequestExists =
            await _context.AccountRequests
                .AnyAsync(accountRequest =>
                    accountRequest.CustomerId == customerId &&
                    accountRequest.Type ==
                        AccountRequestType.OpenAccount &&
                    accountRequest.Status ==
                        AccountRequestStatus.Pending);

        if (pendingOpenRequestExists)
        {
            return BadRequest(
                "Já existe uma solicitação de abertura de conta pendente.");
        }

        var accountRequest = new AccountRequest
        {
            CustomerId = customerId,

            // A conta ainda não existe.
            AccountId = null,

            Type =
                AccountRequestType.OpenAccount,

            Reason =
                reason
        };

        _context.AccountRequests.Add(
            accountRequest);

        await _context.SaveChangesAsync();

        return Created(
            $"/api/accountrequests/{accountRequest.Id}",
            new
            {
                Id =
                    accountRequest.Id,

                Tipo =
                    FormatRequestType(
                        accountRequest.Type),

                Descricao =
                    FormatRequestDescription(
                        accountRequest.Type),

                Motivo =
                    accountRequest.Reason,

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
                    "Solicitação de abertura de conta realizada com sucesso."
            });
    }

}