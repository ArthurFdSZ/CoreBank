using CoreBank.Domain.Enums;

namespace CoreBank.Domain.Entities;

// Representa uma movimentação financeira no extrato.
public class Transaction
{
    // Identificador único da movimentação.
    public int Id { get; set; }

    // Conta à qual esta movimentação pertence.
    public int AccountId { get; set; }

    // Tipo: depósito, saque ou transferência.
    public TransactionType Type { get; set; }

    // Valor movimentado.
    public decimal Amount { get; set; }

    // Descrição apresentada no extrato.
    public string Description { get; set; } = string.Empty;

    // Conta relacionada, utilizada principalmente em transferências.
    public int? RelatedAccountId { get; set; }

    // Data e hora da movimentação armazenada em UTC.
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}