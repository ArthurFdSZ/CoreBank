namespace CoreBank.Domain.Exceptions;

// Representa erros causados pela violação de uma regra de negócio.
public class DomainException : Exception
{
    public DomainException(string message) : base(message)
    {
    }
}