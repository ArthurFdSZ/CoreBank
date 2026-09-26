namespace CoreBank.Api.Dtos;

// Dados necessários para realizar o login.
public class LoginRequest
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}