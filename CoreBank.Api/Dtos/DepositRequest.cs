using System.ComponentModel.DataAnnotations;

namespace CoreBank.Api.Dtos;

// Dados necessários para realizar um depósito.
public class DepositRequest
{
    [Range(
        0.01,
        9999999999999999.99,
        ErrorMessage = "O valor do depósito deve ser maior que zero.")]
    public decimal Amount { get; set; }
}