using CoreBank.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Adiciona suporte aos Controllers.
builder.Services.AddControllers();

// Configura o Entity Framework para utilizar o SQL Server.
builder.Services.AddDbContext<CoreBankDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// Configura o OpenAPI.
builder.Services.AddOpenApi();

var app = builder.Build();

// Habilita o OpenAPI durante o desenvolvimento.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapControllers();

app.Run();