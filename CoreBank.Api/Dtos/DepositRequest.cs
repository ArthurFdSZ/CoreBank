namespace CoreBank.Api.Dtos;

// Dados necessários para realizar um depósito.
public class DepositRequest
{
    public decimal Amount { get; set; }
}