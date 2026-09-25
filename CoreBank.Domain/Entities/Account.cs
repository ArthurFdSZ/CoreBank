using CoreBank.Domain.Enums;
using CoreBank.Domain.Exceptions;

namespace CoreBank.Domain.Entities;

// Representa uma conta bancária pertencente a um cliente.
public class Account
{
    public int Id { get; set; }

    // Identifica o cliente proprietário da conta.
    public int CustomerId { get; set; }

    // Dados bancários.
    public string Agency { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;

    // Saldo disponível da conta.
    public decimal Balance { get; set; } = 0;

    // Toda nova conta começa ativa.
    public AccountStatus Status { get; set; } = AccountStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Realiza um depósito após validar as regras da conta.
    public void Deposit(decimal amount)
    {
        ValidateActiveAccount();

        if (amount <= 0)
        {
            throw new DomainException("O valor do depósito deve ser maior que zero.");
        }

        Balance += amount;
    }

    // Realiza um saque após validar saldo e regras da conta.
    public void Withdraw(decimal amount)
    {
        ValidateActiveAccount();

        if (amount <= 0)
        {
            throw new DomainException("O valor do saque deve ser maior que zero.");
        }

        if (amount > Balance)
        {
            throw new DomainException("Saldo insuficiente.");
        }

        Balance -= amount;
    }

    // Transfere dinheiro desta conta para outra conta.
    public void TransferTo(Account destinationAccount, decimal amount)
    {
        ValidateActiveAccount();
        destinationAccount.ValidateActiveAccount();

        if (Id == destinationAccount.Id)
        {
            throw new DomainException("Não é possível transferir para a própria conta.");
        }

        if (amount <= 0)
        {
            throw new DomainException("O valor da transferência deve ser maior que zero.");
        }

        if (amount > Balance)
        {
            throw new DomainException("Saldo insuficiente.");
        }

        Balance -= amount;
        destinationAccount.Balance += amount;
    }

    // Centraliza a validação utilizada pelas operações bancárias.
    private void ValidateActiveAccount()
    {
        if (Status != AccountStatus.Active)
        {
            throw new DomainException("A conta está bloqueada.");
        }
    }
}