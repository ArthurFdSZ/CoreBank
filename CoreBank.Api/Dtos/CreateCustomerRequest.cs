namespace CoreBank.Api.Dtos;

// Dados necessários para cadastrar um novo cliente.
public class CreateCustomerRequest
{
    public string Name { get; set; } = string.Empty;

    public string Cpf { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}