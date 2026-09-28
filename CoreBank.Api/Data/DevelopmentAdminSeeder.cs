using CoreBank.Domain.Entities;
using CoreBank.Domain.Enums;
using CoreBank.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CoreBank.Api.Data;

// Cria o administrador inicial somente no ambiente de desenvolvimento.
public static class DevelopmentAdminSeeder
{
    public static async Task SeedAsync(
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        using var scope = serviceProvider.CreateScope();

        var context = scope.ServiceProvider
            .GetRequiredService<CoreBankDbContext>();

        string? adminEmail =
            configuration["DevelopmentAdmin:Email"];

        string? adminPassword =
            configuration["DevelopmentAdmin:Password"];

        if (string.IsNullOrWhiteSpace(adminEmail) ||
            string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException(
                "As credenciais do administrador de desenvolvimento não foram configuradas.");
        }

        bool adminExists = await context.Customers
            .AnyAsync(customer =>
                customer.Role == UserRole.Admin);

        if (adminExists)
        {
            return;
        }

        bool emailExists = await context.Customers
            .AnyAsync(customer =>
                customer.Email == adminEmail);

        if (emailExists)
        {
            throw new InvalidOperationException(
                "O e-mail configurado para o administrador já está cadastrado.");
        }

        var temporaryAdmin = new Customer(
            "Administrador CoreBank",
            "00000000000",
            adminEmail,
            "temporary");

        var passwordHasher =
            new PasswordHasher<Customer>();

        string passwordHash =
            passwordHasher.HashPassword(
                temporaryAdmin,
                adminPassword);

        var admin = new Customer(
            "Administrador CoreBank",
            "00000000000",
            adminEmail,
            passwordHash);

        admin.Role = UserRole.Admin;

        context.Customers.Add(admin);

        await context.SaveChangesAsync();
    }
}