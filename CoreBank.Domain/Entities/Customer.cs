namespace CoreBank.Domain.Entities;

// Representa um cliente cadastrado no CoreBank.
public class Customer
{
    // Identificador único do cliente.
    public int Id { get; set; }

    // Dados pessoais do cliente.
    public string Name { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    // Armazena a senha protegida em formato de hash.
    public string PasswordHash { get; set; } = string.Empty;

    // Data e hora em que o cliente foi cadastrado.
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}