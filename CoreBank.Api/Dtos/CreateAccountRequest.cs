namespace CoreBank.Api.Dtos;

// Dados necessários para criar uma nova conta bancária.
public class CreateAccountRequest
{
    // Cliente que será proprietário da conta.
    public int CustomerId { get; set; }

    // Dados de identificação da conta.
    public string Agency { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
}