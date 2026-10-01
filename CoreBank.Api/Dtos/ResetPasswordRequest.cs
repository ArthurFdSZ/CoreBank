using System.ComponentModel.DataAnnotations;

namespace CoreBank.Api.Dtos;

// Dados utilizados pelo cliente para cadastrar
// a nova senha depois da aprovação do administrador.
public class ResetPasswordRequest
{
    [Required(
        ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(
        ErrorMessage = "Informe um endereço de e-mail válido.")]
    public string Email { get; set; } = string.Empty;

    [Required(
        ErrorMessage = "A nova senha é obrigatória.")]
    [StringLength(
        100,
        MinimumLength = 8,
        ErrorMessage = "A senha deve possuir entre 8 e 100 caracteres.")]
    [RegularExpression(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$",
        ErrorMessage =
            "A senha deve possuir letra maiúscula, letra minúscula, número e caractere especial.")]
    public string NewPassword { get; set; } = string.Empty;
}