using CoreBank.Domain.Enums;
using CoreBank.Domain.Exceptions;

namespace CoreBank.Domain.Entities;

// Representa uma solicitação relacionada a uma conta do CoreBank.
//
// Bloqueio e desbloqueio:
// - CustomerId identifica o cliente.
// - AccountId identifica a conta existente.
//
// Abertura de conta:
// - CustomerId identifica o cliente que está solicitando a conta.
// - AccountId permanece nulo até a conta ser criada após a aprovação.
public class AccountRequest
{
    public int Id { get; set; }

    // Cliente responsável pela solicitação.
    //
    // Nesta primeira etapa a propriedade é anulável para preservar
    // as solicitações antigas que já existem no banco.
    // Na migration vamos preencher esse campo usando o CustomerId
    // da conta relacionada às solicitações existentes.
    public int? CustomerId { get; set; }

    // Conta relacionada à solicitação.
    //
    // É anulável porque uma solicitação de abertura acontece antes
    // de a conta bancária existir.
    public int? AccountId { get; set; }

    // Tipo da solicitação:
    // bloqueio, desbloqueio ou abertura de conta.
    public AccountRequestType Type { get; set; }

    // Motivo informado pelo cliente ao criar a solicitação.
    public string Reason { get; set; } = string.Empty;

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
