using System.ComponentModel.DataAnnotations;

namespace CoreBank.Api.Validation;

// Valida matematicamente os dígitos verificadores de um CPF.
public class ValidCpfAttribute : ValidationAttribute
{
    public ValidCpfAttribute()
    {
        ErrorMessage = "Informe um CPF válido.";
    }

    public override bool IsValid(object? value)
    {
        // O campo obrigatório é tratado pelo atributo [Required].
        if (value is null)
        {
            return true;
        }

        string cpf = value.ToString() ?? string.Empty;

        // Mantemos a API esperando somente os 11 números.
        if (cpf.Length != 11 || !cpf.All(char.IsDigit))
        {
            return false;
        }

        // CPFs formados pelo mesmo número repetido são inválidos.
        if (cpf.Distinct().Count() == 1)
        {
            return false;
        }

        // Calcula o primeiro dígito verificador.
        int sum = 0;

        for (int i = 0; i < 9; i++)
        {
            sum += (cpf[i] - '0') * (10 - i);
        }

        int remainder = sum % 11;

        int firstDigit =
            remainder < 2
                ? 0
                : 11 - remainder;

        if ((cpf[9] - '0') != firstDigit)
        {
            return false;
        }

        // Calcula o segundo dígito verificador.
        sum = 0;

        for (int i = 0; i < 10; i++)
        {
            sum += (cpf[i] - '0') * (11 - i);
        }

        remainder = sum % 11;

        int secondDigit =
            remainder < 2
                ? 0
                : 11 - remainder;

        return (cpf[10] - '0') == secondDigit;
    }
}