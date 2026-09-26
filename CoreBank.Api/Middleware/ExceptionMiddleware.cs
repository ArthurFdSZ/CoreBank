using CoreBank.Domain.Exceptions;
using System.Net;
using System.Text.Json;

namespace CoreBank.Api.Middleware;

// Trata exceções da aplicação e transforma em respostas HTTP adequadas.
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DomainException ex)
        {
            await HandleDomainExceptionAsync(context, ex);
        }
    }

    private static async Task HandleDomainExceptionAsync(
        HttpContext context,
        DomainException exception)
    {
        context.Response.StatusCode =
            (int)HttpStatusCode.BadRequest;

        context.Response.ContentType = "application/json";

        var response = new
        {
            message = exception.Message
        };

        var json = JsonSerializer.Serialize(response);

        await context.Response.WriteAsync(json);
    }
}