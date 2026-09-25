namespace CoreBank.Domain.Enums;

/// <summary>
/// Representa os possíveis estados de uma conta bancária.
/// Utilizamos um enum para impedir que valores de status
/// inválidos sejam utilizados no sistema.
/// </summary>
public enum AccountStatus
{
    // A conta está funcionando normalmente e pode realizar operações.
    Active = 1,

    // A conta está bloqueada e não pode realizar operações financeiras.
    Blocked = 2
}