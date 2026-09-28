using System.ComponentModel.DataAnnotations;

namespace CoreBank.Api.Dtos;

// Dados necessários para realizar um saque.
public class WithdrawRequest
{
    [Range(
        0.01,
        9999999999999999.99,
        ErrorMessage = "O valor do saque deve ser maior que zero.")]
    public decimal Amount { get; set; }
}