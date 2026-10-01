namespace CoreBank.Domain.Enums;

// Define os possíveis estados de uma solicitação
// de redefinição de senha.
public enum PasswordResetRequestStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Completed = 4
}