namespace CoreBank.Api.Helpers;

// Centraliza a conversão e formatação de datas exibidas pela API.
public static class DateTimeHelper
{
    private const string BrazilianDateTimeFormat = "dd/MM/yyyy HH:mm:ss";

    public static string ToBrazilianDateTime(DateTime dateTime)
    {
        var brazilTimeZone = GetBrazilTimeZone();

        var utcDateTime = DateTime.SpecifyKind(
            dateTime,
            DateTimeKind.Utc);

        var brazilianDateTime = TimeZoneInfo.ConvertTimeFromUtc(
            utcDateTime,
            brazilTimeZone);

        return brazilianDateTime.ToString(
            BrazilianDateTimeFormat);
    }

    public static string? ToBrazilianDateTime(DateTime? dateTime)
    {
        if (!dateTime.HasValue)
        {
            return null;
        }

        return ToBrazilianDateTime(dateTime.Value);
    }

    private static TimeZoneInfo GetBrazilTimeZone()
    {
        try
        {
            // Windows
            return TimeZoneInfo.FindSystemTimeZoneById(
                "E. South America Standard Time");
        }
        catch (TimeZoneNotFoundException)
        {
            // Linux/macOS
            return TimeZoneInfo.FindSystemTimeZoneById(
                "America/Sao_Paulo");
        }
    }
}