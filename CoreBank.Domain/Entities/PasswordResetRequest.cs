using CoreBank.Domain.Enums;
using CoreBank.Domain.Exceptions;

namespace CoreBank.Domain.Entities;

// Representa uma solicitação de recuperação de senha.
public class PasswordResetRequest
{
    public int Id { get; private set; }

    public int CustomerId { get; private set; }

    public PasswordResetRequestStatus Status { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? ReviewedAt { get; private set; }

    public DateTime? CompletedAt { get; private set; }

    private PasswordResetRequest()
    {
    }

    public PasswordResetRequest(int customerId)
    {
        if (customerId <= 0)
        {
            throw new DomainException(
                "O cliente informado é inválido.");
        }

        CustomerId = customerId;

        Status = PasswordResetRequestStatus.Pending;

        CreatedAt = DateTime.UtcNow;
    }

    // Aprova a solicitação.
    public void Approve()
    {
        if (Status != PasswordResetRequestStatus.Pending)
        {
            throw new DomainException(
                "Somente solicitações pendentes podem ser aprovadas.");
        }

        Status = PasswordResetRequestStatus.Approved;

        ReviewedAt = DateTime.UtcNow;
    }

    // Recusa a solicitação.
    public void Reject()
    {
        if (Status != PasswordResetRequestStatus.Pending)
        {
            throw new DomainException(
                "Somente solicitações pendentes podem ser recusadas.");
        }

        Status = PasswordResetRequestStatus.Rejected;

        ReviewedAt = DateTime.UtcNow;
    }

    // Finaliza a solicitação após a troca da senha.
    public void Complete()
    {
        if (Status != PasswordResetRequestStatus.Approved)
        {
            throw new DomainException(
                "A solicitação precisa estar aprovada para redefinir a senha.");
        }

        Status = PasswordResetRequestStatus.Completed;

        CompletedAt = DateTime.UtcNow;
    }
}