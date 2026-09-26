using CoreBank.Domain.Exceptions;

namespace CoreBank.Domain.Entities;

// Representa um cliente cadastrado no CoreBank.
public class Customer
{
    public int Id { get; set; }

    public string Name { get; private set; } = string.Empty;
    public string Cpf { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;

    // Armazena somente o hash da senha.
    public string PasswordHash { get; private set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Cria um cliente validando seus dados obrigatórios.
    public Customer(string name, string cpf, string email, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("O nome é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(cpf))
        {
            throw new DomainException("O CPF é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new DomainException("O e-mail é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new DomainException("A senha é obrigatória.");
        }

        Name = name;
        Cpf = cpf;
        Email = email;
        PasswordHash = passwordHash;
    }
}