using CoreBank.Api.Dtos;
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
[Authorize]
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

    // Cria uma nova conta para o próprio cliente autenticado.
    [HttpPost]
    public async Task<IActionResult> Create(CreateAccountRequest request)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        // Impede que um cliente crie uma conta para outro cliente.
        if (request.CustomerId != authenticatedCustomerId)
        {
            return Forbid();
        }

        bool customerExists = await _context.Customers
            .AnyAsync(customer =>
                customer.Id == authenticatedCustomerId);

        if (!customerExists)
        {
            return NotFound("Cliente não encontrado.");
        }

        // Cada cliente pode possuir apenas uma conta no MVP.
        bool customerHasAccount = await _context.Accounts
            .AnyAsync(account =>
                account.CustomerId == authenticatedCustomerId);

        if (customerHasAccount)
        {
            return BadRequest(
                "O cliente já possui uma conta.");
        }

        // Impede agência + número duplicados.
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
                account.Status,
                CreatedAt = account.CreatedAt.ToString(
                    "dd/MM/yyyy HH:mm:ss")
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
                account.CustomerId == authenticatedCustomerId);

        if (account is null)
        {
            return NotFound("Conta não encontrada.");
        }

        return Ok(new
        {
            account.Id,
            account.CustomerId,
            account.Agency,
            account.Number,
            account.Balance,
            account.Status,
            CreatedAt = account.CreatedAt.ToString(
                "dd/MM/yyyy HH:mm:ss")
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
                account.CustomerId == authenticatedCustomerId);

        if (account is null)
        {
            return NotFound("Conta não encontrada.");
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
                transaction.Type,
                transaction.Amount,
                transaction.Description,
                transaction.RelatedAccountId,
                CreatedAt = transaction.CreatedAt.ToString(
                    "dd/MM/yyyy HH:mm:ss")
            })
            .ToList();

        return Ok(new
        {
            AccountId = account.Id,
            account.Agency,
            account.Number,
            account.Balance,
            Transactions = formattedTransactions
        });
    }

    // Consulta uma conta pelo ID.
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
            return NotFound("Conta não encontrada.");
        }

        if (account.CustomerId != authenticatedCustomerId)
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
            account.Status,
            CreatedAt = account.CreatedAt.ToString(
                "dd/MM/yyyy HH:mm:ss")
        });
    }

    // Realiza um depósito e registra a movimentação.
    [HttpPost("{id}/deposit")]
    public async Task<IActionResult> Deposit(
        int id,
        DepositRequest request)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.Id == id);

        if (account is null)
        {
            return NotFound("Conta não encontrada.");
        }

        if (account.CustomerId != authenticatedCustomerId)
        {
            return Forbid();
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

    // Realiza um saque e registra a movimentação.
    [HttpPost("{id}/withdraw")]
    public async Task<IActionResult> Withdraw(
        int id,
        WithdrawRequest request)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.Id == id);

        if (account is null)
        {
            return NotFound("Conta não encontrada.");
        }

        if (account.CustomerId != authenticatedCustomerId)
        {
            return Forbid();
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

    // Transfere dinheiro da conta autenticada para outra conta.
    [HttpPost("{id}/transfer")]
    public async Task<IActionResult> Transfer(
        int id,
        TransferRequest request)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        var sourceAccount = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.Id == id);

        if (sourceAccount is null)
        {
            return NotFound(
                "Conta de origem não encontrada.");
        }

        if (sourceAccount.CustomerId != authenticatedCustomerId)
        {
            return Forbid();
        }

        var destinationAccount = await _context.Accounts
            .FirstOrDefaultAsync(account =>
                account.Id == request.DestinationAccountId);

        if (destinationAccount is null)
        {
            return NotFound(
                "Conta de destino não encontrada.");
        }

        sourceAccount.TransferTo(
            destinationAccount,
            request.Amount);

        var outgoingTransaction = new Transaction
        {
            AccountId = sourceAccount.Id,
            Type = TransactionType.TransferSent,
            Amount = request.Amount,
            Description = "Transferência enviada",
            RelatedAccountId = destinationAccount.Id
        };

        var incomingTransaction = new Transaction
        {
            AccountId = destinationAccount.Id,
            Type = TransactionType.TransferReceived,
            Amount = request.Amount,
            Description = "Transferência recebida",
            RelatedAccountId = sourceAccount.Id
        };

        _context.Transactions.Add(outgoingTransaction);
        _context.Transactions.Add(incomingTransaction);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            SourceAccountId = sourceAccount.Id,
            DestinationAccountId = destinationAccount.Id,
            TransferredAmount = request.Amount,
            SourceBalance = sourceAccount.Balance,
            DestinationBalance = destinationAccount.Balance
        });
    }

    // Retorna o extrato de uma conta pelo ID.
    [HttpGet("{id}/statement")]
    public async Task<IActionResult> GetStatement(int id)
    {
        int authenticatedCustomerId =
            GetAuthenticatedCustomerId();

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account =>
                account.Id == id);

        if (account is null)
        {
            return NotFound("Conta não encontrada.");
        }

        if (account.CustomerId != authenticatedCustomerId)
        {
            return Forbid();
        }

        var transactions = await _context.Transactions
            .AsNoTracking()
            .Where(transaction =>
                transaction.AccountId == id)
            .OrderByDescending(transaction =>
                transaction.CreatedAt)
            .ToListAsync();

        var formattedTransactions = transactions
            .Select(transaction => new
            {
                transaction.Id,
                transaction.Type,
                transaction.Amount,
                transaction.Description,
                transaction.RelatedAccountId,
                CreatedAt = transaction.CreatedAt.ToString(
                    "dd/MM/yyyy HH:mm:ss")
            })
            .ToList();

        return Ok(new
        {
            AccountId = account.Id,
            account.Agency,
            account.Number,
            account.Balance,
            Transactions = formattedTransactions
        });
    }
}