using CoreBank.Domain.Enums;
using CoreBank.Domain.Exceptions;

namespace CoreBank.Domain.Entities;

// Representa uma solicitação de bloqueio ou desbloqueio de conta.
public class AccountRequest
{
    public int Id { get; set; }

    // Conta relacionada à solicitação.
    public int AccountId { get; set; }

    // Tipo da solicitação: bloqueio ou desbloqueio.
    public AccountRequestType Type { get; set; }

    // Toda nova solicitação começa como pendente.
    public AccountRequestStatus Status { get; set; }
        = AccountRequestStatus.Pending;

    // Data de criação da solicitação.
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Data em que o administrador analisou a solicitação.
    public DateTime? ReviewedAt { get; set; }

    // Aprova a solicitação.
    public void Approve()
    {
        ValidatePending();

        Status = AccountRequestStatus.Approved;
        ReviewedAt = DateTime.UtcNow;
    }

    // Rejeita a solicitação.
    public void Reject()
    {
        ValidatePending();

        Status = AccountRequestStatus.Rejected;
        ReviewedAt = DateTime.UtcNow;
    }

    // Impede que uma solicitação já analisada seja processada novamente.
    private void ValidatePending()
    {
        if (Status != AccountRequestStatus.Pending)
        {
            throw new DomainException(
                "A solicitação já foi analisada.");
        }
    }
}