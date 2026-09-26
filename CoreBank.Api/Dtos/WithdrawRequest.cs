namespace CoreBank.Api.Dtos;

// Dados necessários para realizar um saque.
public class WithdrawRequest
{
    public decimal Amount { get; set; }
}