namespace CoreBank.Domain.Enums;

// Define o estado atual de uma solicitação.
public enum AccountRequestStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3
}