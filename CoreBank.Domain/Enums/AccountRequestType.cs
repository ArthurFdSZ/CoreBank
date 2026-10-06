namespace CoreBank.Domain.Enums;

// Define o tipo de solicitação feita pelo cliente.
public enum AccountRequestType
{
    // Solicitação para bloquear uma conta já existente.
    Block = 1,

    // Solicitação para desbloquear uma conta já existente.
    Unblock = 2,

    // Solicitação feita por um cliente que ainda não possui conta bancária.
    OpenAccount = 3
}
