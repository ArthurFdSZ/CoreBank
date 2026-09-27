using CoreBank.Api.Middleware;
using CoreBank.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Adiciona suporte aos Controllers.
builder.Services.AddControllers();

// Configura o Entity Framework para utilizar o SQL Server.
builder.Services.AddDbContext<CoreBankDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// Obtém as configurações do JWT.
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "A chave JWT não foi configurada.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

// Configura a autenticação JWT.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Configura autorização.
builder.Services.AddAuthorization();

// Configura o OpenAPI.
builder.Services.AddOpenApi();

var app = builder.Build();

// Habilita o OpenAPI durante o desenvolvimento.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Trata exceções de domínio.
app.UseMiddleware<ExceptionMiddleware>();

app.UseHttpsRedirection();

// Identifica o usuário através do JWT.
app.UseAuthentication();

// Verifica se o usuário possui autorização.
app.UseAuthorization();

app.MapControllers();

app.Run();