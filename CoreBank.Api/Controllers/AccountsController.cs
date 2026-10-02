using CoreBank.Api.Dtos;
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
public class AccountsController : ControllerBase
{
    private readonly CoreBankDbContext _context;

    public AccountsController(CoreBankDbContext context)
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

    // Traduz o tipo interno da movimentação para português.
    private static string FormatTransactionType(TransactionType type)
    {
        return type switch
        {
            TransactionType.Deposit => "Depósito",
            TransactionType.Withdrawal => "Saque",
            TransactionType.TransferSent => "Transferência enviada",
            TransactionType.TransferReceived => "Transferência recebida",
            _ => "Desconhecido"
        };
    }

    // Cria uma nova conta para o próprio cliente autenticado.
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateAccountRequest request)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        bool customerExists = await _context.Customers
            .AnyAsync(customer =>
                customer.Id == authenticatedCustomerId);

        if (!customerExists)
        {
            return NotFound(
                "Cliente não encontrado.");
        }

        bool customerHasAccount = await _context.Accounts
            .AnyAsync(account =>
                account.CustomerId == authenticatedCustomerId);

        if (customerHasAccount)
        {
            return BadRequest(
                "O cliente já possui uma conta.");
        }

        bool accountExists = await _context.Accounts
            .AnyAsync(account =>
                account.Agency == request.Agency &&
                account.Number == request.Number);

        if (accountExists)
        {
            return BadRequest(
                "Agência e número de conta já cadastrados.");
        }

        var account = new Account
        {
            CustomerId = authenticatedCustomerId,
            Agency = request.Agency,
            Number = request.Number
        };

        _context.Accounts.Add(account);

        await _context.SaveChangesAsync();

        return Created(
            $"/api/accounts/{account.Id}",
            new
            {
                account.Id,
                account.CustomerId,
                account.Agency,
                account.Number,
                account.Balance,
                Status = FormatAccountStatus(
                    account.Status),
                CreatedAt =
                    DateTimeHelper.ToBrazilianDateTime(
                        account.CreatedAt)
            });
    }

    // Retorna a conta do cliente autenticado.
    [HttpGet("me")]
    public async Task<IActionResult> GetMyAccount()
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account =>
                account.CustomerId ==
                authenticatedCustomerId);

        if (account is null)
        {
            return NotFound(
                "Conta não encontrada.");
        }

        return Ok(new
        {
            account.Id,
            account.CustomerId,
            account.Agency,
            account.Number,
            account.Balance,
            Status = FormatAccountStatus(
                account.Status),
            CreatedAt =
                DateTimeHelper.ToBrazilianDateTime(
                    account.CreatedAt)
        });
    }

    // Retorna o extrato da conta do cliente autenticado.
    [HttpGet("me/statement")]
    public async Task<IActionResult> GetMyStatement()
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account =>
                account.CustomerId ==
                authenticatedCustomerId);

        if (account is null)
        {
            return NotFound(
                "Conta não encontrada.");
        }

        var transactions = await _context.Transactions
            .AsNoTracking()
            .Where(transaction =>
                transaction.AccountId == account.Id)
            .OrderByDescending(transaction =>
                transaction.CreatedAt)
            .ToListAsync();

        var formattedTransactions = transactions
            .Select(transaction => new
            {
                transaction.Id,
                Type = FormatTransactionType(
                    transaction.Type),
                transaction.Amount,
                transaction.Description,
                transaction.RelatedAccountId,
                CreatedAt =
                    DateTimeHelper.ToBrazilianDateTime(
                        transaction.CreatedAt)
            })
            .ToList();

        return Ok(new
        {
            AccountId = account.Id,
            account.Agency,
            account.Number,
            account.Balance,
            Status = FormatAccountStatus(
                account.Status),
            Transactions = formattedTransactions
        });
    }

    // Realiza um depósito na conta do cliente autenticado.
    [HttpPost("me/deposit")]
    public async Task<IActionResult> DepositMyAccount(
        DepositRequest request)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.CustomerId ==
                authenticatedCustomerId);

        if (account is null)
        {
            return NotFound(
                "Conta não encontrada.");
        }

        account.Deposit(request.Amount);

        var transaction = new Transaction
        {
            AccountId = account.Id,
            Type = TransactionType.Deposit,
            Amount = request.Amount,
            Description = "Depósito"
        };

        _context.Transactions.Add(transaction);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            account.Id,
            DepositedAmount = request.Amount,
            account.Balance
        });
    }

    // Realiza um saque na conta do cliente autenticado.
    [HttpPost("me/withdraw")]
    public async Task<IActionResult> WithdrawMyAccount(
        WithdrawRequest request)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.CustomerId ==
                authenticatedCustomerId);

        if (account is null)
        {
            return NotFound(
                "Conta não encontrada.");
        }

        account.Withdraw(request.Amount);

        var transaction = new Transaction
        {
            AccountId = account.Id,
            Type = TransactionType.Withdrawal,
            Amount = request.Amount,
            Description = "Saque"
        };

        _context.Transactions.Add(transaction);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            account.Id,
            WithdrawnAmount = request.Amount,
            account.Balance
        });
    }

    // Transfere dinheiro da conta autenticada utilizando
    // agência e número da conta de destino.
    [HttpPost("me/transfer")]
    public async Task<IActionResult> TransferMyAccount(
        TransferByAccountRequest request)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        // Busca a conta de origem do cliente autenticado.
        var sourceAccount = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.CustomerId ==
                authenticatedCustomerId);

        if (sourceAccount is null)
        {
            return NotFound(
                "Conta de origem não encontrada.");
        }

        // Busca a conta de destino pela agência e número.
        var destinationAccount = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.Agency == request.Agency &&
                account.Number == request.AccountNumber);

        if (destinationAccount is null)
        {
            return NotFound(
                "Conta de destino não encontrada.");
        }

        // Impede transferência para a própria conta.
        if (destinationAccount.Id == sourceAccount.Id)
        {
            return BadRequest(
                "Não é possível transferir para a própria conta.");
        }

        // Busca o cliente que está enviando o dinheiro.
        var sourceCustomer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(customer =>
                customer.Id == sourceAccount.CustomerId);

        if (sourceCustomer is null)
        {
            return NotFound(
                "Cliente da conta de origem não encontrado.");
        }

        // Busca o cliente que receberá o dinheiro.
        var destinationCustomer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(customer =>
                customer.Id == destinationAccount.CustomerId);

        if (destinationCustomer is null)
        {
            return NotFound(
                "Cliente da conta de destino não encontrado.");
        }

        // Executa a movimentação dos saldos.
        sourceAccount.TransferTo(
            destinationAccount,
            request.Amount);

        // Movimentação registrada no extrato de quem enviou.
        var outgoingTransaction = new Transaction
        {
            AccountId = sourceAccount.Id,
            Type = TransactionType.TransferSent,
            Amount = request.Amount,

            Description =
                $"Para: {destinationCustomer.Name} • " +
                $"Agência {destinationAccount.Agency} • " +
                $"Conta {destinationAccount.Number}",

            RelatedAccountId = destinationAccount.Id
        };

        // Movimentação registrada no extrato de quem recebeu.
        var incomingTransaction = new Transaction
        {
            AccountId = destinationAccount.Id,
            Type = TransactionType.TransferReceived,
            Amount = request.Amount,

            Description =
                $"De: {sourceCustomer.Name} • " +
                $"Agência {sourceAccount.Agency} • " +
                $"Conta {sourceAccount.Number}",

            RelatedAccountId = sourceAccount.Id
        };

        _context.Transactions.Add(
            outgoingTransaction);

        _context.Transactions.Add(
            incomingTransaction);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            SourceAccountId = sourceAccount.Id,

            DestinationCustomer =
                destinationCustomer.Name,

            DestinationAgency =
                destinationAccount.Agency,

            DestinationAccountNumber =
                destinationAccount.Number,

            TransferredAmount =
                request.Amount,

            SourceBalance =
                sourceAccount.Balance
        });
    }

    // Consulta uma conta pelo ID.
    // Utilizado também para validar autorização entre clientes.
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account =>
                account.Id == id);

        if (account is null)
        {
            return NotFound(
                "Conta não encontrada.");
        }

        if (account.CustomerId !=
            authenticatedCustomerId)
        {
            return Forbid();
        }

        return Ok(new
        {
            account.Id,
            account.CustomerId,
            account.Agency,
            account.Number,
            account.Balance,
            Status = FormatAccountStatus(
                account.Status),
            CreatedAt =
                DateTimeHelper.ToBrazilianDateTime(
                    account.CreatedAt)
        });
    }
}