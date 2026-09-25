namespace CoreBank.Domain.Enums;

/// <summary>
/// Define os tipos de movimentações financeiras
/// que podem aparecer no extrato de uma conta.
/// </summary>
public enum TransactionType
{
    // Entrada de dinheiro por depósito.
    Deposit = 1,

    // Saída de dinheiro por saque.
    Withdrawal = 2,

    // Dinheiro enviado para outra conta.
    TransferSent = 3,

    // Dinheiro recebido de outra conta.
    TransferReceived = 4
}