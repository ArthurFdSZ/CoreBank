using CoreBank.Api.Validation;
using System.ComponentModel.DataAnnotations;

namespace CoreBank.Api.Dtos;

// Dados necessários para cadastrar um novo cliente.
public class CreateCustomerRequest
{
    [Required(ErrorMessage = "O nome é obrigatório.")]
    [StringLength(
        150,
        MinimumLength = 3,
        ErrorMessage = "O nome deve possuir entre 3 e 150 caracteres.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "O CPF é obrigatório.")]
    [RegularExpression(
        @"^\d{11}$",
        ErrorMessage = "O CPF deve possuir exatamente 11 números.")]
    [ValidCpf]
    public string Cpf { get; set; } = string.Empty;

    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(
        ErrorMessage = "Informe um endereço de e-mail válido.")]
    [StringLength(
        150,
        ErrorMessage = "O e-mail deve possuir no máximo 150 caracteres.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "A senha é obrigatória.")]
    [StringLength(
        100,
        MinimumLength = 8,
        ErrorMessage = "A senha deve possuir entre 8 e 100 caracteres.")]
    [RegularExpression(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$",
        ErrorMessage =
            "A senha deve possuir letra maiúscula, letra minúscula, número e caractere especial.")]
    public string Password { get; set; } = string.Empty;
}