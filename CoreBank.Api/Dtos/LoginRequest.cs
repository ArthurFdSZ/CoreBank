using System.ComponentModel.DataAnnotations;

namespace CoreBank.Api.Dtos;

// Dados necessários para autenticar um usuário.
public class LoginRequest
{
    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(
        ErrorMessage = "Informe um endereço de e-mail válido.")]
    [StringLength(
        150,
        ErrorMessage = "O e-mail deve possuir no máximo 150 caracteres.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "A senha é obrigatória.")]
    public string Password { get; set; } = string.Empty;
}