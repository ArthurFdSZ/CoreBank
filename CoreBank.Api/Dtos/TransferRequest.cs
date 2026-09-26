namespace CoreBank.Api.Dtos;

// Dados necessários para realizar uma transferência.
public class TransferRequest
{
    // Conta que receberá o dinheiro.
    public int DestinationAccountId { get; set; }

    // Valor da transferência.
    public decimal Amount { get; set; }
}