using CoreBank.Api.Data;
using CoreBank.Api.Middleware;
using CoreBank.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendPolicy";

// Adiciona suporte aos Controllers.
builder.Services.AddControllers();

// Personaliza as respostas automáticas de validação dos DTOs.
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(item => item.Value?.Errors.Count > 0)
            .SelectMany(item => item.Value!.Errors)
            .Select(error =>
                string.IsNullOrWhiteSpace(error.ErrorMessage)
                    ? "Valor informado inválido."
                    : error.ErrorMessage)
            .Distinct()
            .ToList();

        return new BadRequestObjectResult(new
        {
            mensagem = "Os dados informados são inválidos.",
            erros = errors
        });
    };
});

// Configura o Entity Framework para utilizar o SQL Server.
builder.Services.AddDbContext<CoreBankDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString(
            "DefaultConnection")));

// Configura as origens permitidas para o frontend.
var allowedOrigins =
    builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        FrontendCorsPolicy,
        policy =>
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

// Obtém as configurações do JWT.
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "A chave JWT não foi configurada.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException(
        "O emissor do JWT não foi configurado.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException(
        "A audiência do JWT não foi configurada.");

// Configura a autenticação JWT.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey))
            };

        // Padroniza respostas de autenticação e autorização.
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();

                context.Response.StatusCode =
                    StatusCodes.Status401Unauthorized;

                context.Response.ContentType =
                    "application/json; charset=utf-8";

                var response = new
                {
                    mensagem =
                        "Você precisa estar autenticado para acessar este recurso."
                };

                await context.Response.WriteAsync(
                    JsonSerializer.Serialize(response));
            },

            OnForbidden = async context =>
            {
                context.Response.StatusCode =
                    StatusCodes.Status403Forbidden;

                context.Response.ContentType =
                    "application/json; charset=utf-8";

                var response = new
                {
                    mensagem =
                        "Você não possui permissão para acessar este recurso."
                };

                await context.Response.WriteAsync(
                    JsonSerializer.Serialize(response));
            }
        };
    });

// Configura autorização.
builder.Services.AddAuthorization();

// Configura o OpenAPI.
builder.Services.AddOpenApi();

var app = builder.Build();

// Configura recursos exclusivos do ambiente de desenvolvimento.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // Garante a existência do administrador inicial
    // somente no ambiente de desenvolvimento.
    await DevelopmentAdminSeeder.SeedAsync(
        app.Services,
        app.Configuration);
}

// Trata exceções da aplicação.
app.UseMiddleware<ExceptionMiddleware>();

app.UseHttpsRedirection();

// Permite requisições do frontend configurado.
app.UseCors(FrontendCorsPolicy);

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();