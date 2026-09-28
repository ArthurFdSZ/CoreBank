using CoreBank.Domain.Exceptions;
using System.Net;
using System.Text.Json;

namespace CoreBank.Api.Middleware;

// Trata exceções da aplicação e transforma em respostas HTTP adequadas.
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(
        RequestDelegate next,
        ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DomainException ex)
        {
            // Erros previstos pelas regras de negócio.
            await HandleDomainExceptionAsync(context, ex);
        }
        catch (Exception ex)
        {
            // Registra os detalhes somente no servidor.
            _logger.LogError(
                ex,
                "Ocorreu um erro inesperado ao processar a requisição.");

            await HandleUnexpectedExceptionAsync(context);
        }
    }

    // Trata erros previstos pelas regras de negócio.
    private static async Task HandleDomainExceptionAsync(
        HttpContext context,
        DomainException exception)
    {
        context.Response.StatusCode =
            (int)HttpStatusCode.BadRequest;

        context.Response.ContentType =
            "application/json; charset=utf-8";

        var response = new
        {
            mensagem = exception.Message
        };

        var json = JsonSerializer.Serialize(response);

        await context.Response.WriteAsync(json);
    }

    // Trata erros internos sem expor informações sensíveis ao cliente.
    private static async Task HandleUnexpectedExceptionAsync(
        HttpContext context)
    {
        context.Response.StatusCode =
            (int)HttpStatusCode.InternalServerError;

        context.Response.ContentType =
            "application/json; charset=utf-8";

        var response = new
        {
            mensagem =
                "Ocorreu um erro interno. Tente novamente mais tarde."
        };

        var json = JsonSerializer.Serialize(response);

        await context.Response.WriteAsync(json);
    }
}