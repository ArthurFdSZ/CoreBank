using System.ComponentModel.DataAnnotations;

namespace CoreBank.Api.Dtos;

// Dados necessários para realizar uma transferência
// utilizando agência e número da conta de destino.
public class TransferByAccountRequest
{
    [Required(ErrorMessage = "A agência é obrigatória.")]
    [RegularExpression(
        @"^\d{4}$",
        ErrorMessage = "A agência deve possuir exatamente 4 números.")]
    public string Agency { get; set; } = string.Empty;

    [Required(ErrorMessage = "O número da conta é obrigatório.")]
    [RegularExpression(
        @"^\d{5}$",
        ErrorMessage = "O número da conta deve possuir exatamente 5 números.")]
    public string AccountNumber { get; set; } = string.Empty;

    [Range(
        0.01,
        9999999999999999.99,
        ErrorMessage = "O valor da transferência deve ser maior que zero.")]
    public decimal Amount { get; set; }
}