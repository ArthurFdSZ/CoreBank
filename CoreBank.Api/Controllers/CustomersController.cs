using CoreBank.Api.Dtos;
using CoreBank.Api.Helpers;
using CoreBank.Domain.Entities;
using CoreBank.Domain.Enums;
using CoreBank.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CoreBank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly CoreBankDbContext _context;
    private readonly PasswordHasher<Customer> _passwordHasher;

    public CustomersController(CoreBankDbContext context)
    {
        _context = context;
        _passwordHasher = new PasswordHasher<Customer>();
    }

    // Traduz o perfil interno do usuário para português.
    private static string FormatUserRole(UserRole role)
    {
        return role switch
        {
            UserRole.Customer => "Cliente",
            UserRole.Admin => "Administrador",
            _ => "Desconhecido"
        };
    }

    // Cadastra um novo cliente.
    [HttpPost]
    public async Task<IActionResult> Create(CreateCustomerRequest request)
    {
        // Impede CPF ou e-mail duplicados.
        bool customerExists = await _context.Customers
            .AnyAsync(customer =>
                customer.Cpf == request.Cpf ||
                customer.Email == request.Email);

        if (customerExists)
        {
            return BadRequest("CPF ou e-mail já cadastrado.");
        }

        // Cria uma instância temporária apenas para gerar o hash da senha.
        var temporaryCustomer = new Customer(
            request.Name,
            request.Cpf,
            request.Email,
            "temporary");

        string passwordHash = _passwordHasher.HashPassword(
            temporaryCustomer,
            request.Password);

        // Cria o cliente definitivo já com a senha protegida.
        var customer = new Customer(
            request.Name,
            request.Cpf,
            request.Email,
            passwordHash);

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return Created(
            $"/api/customers/{customer.Id}",
            new
            {
                customer.Id,
                customer.Name,
                customer.Cpf,
                customer.Email,
                Role = FormatUserRole(customer.Role),
                CreatedAt = DateTimeHelper.ToBrazilianDateTime(
                    customer.CreatedAt)
            });
    }

    // Retorna os dados do cliente autenticado.
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var customerIdClaim = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(customerIdClaim, out int customerId))
        {
            return Unauthorized();
        }

        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(customer =>
                customer.Id == customerId);

        if (customer is null)
        {
            return NotFound("Cliente não encontrado.");
        }

        return Ok(new
        {
            customer.Id,
            customer.Name,
            customer.Cpf,
            customer.Email,
            Role = FormatUserRole(customer.Role),
            CreatedAt = DateTimeHelper.ToBrazilianDateTime(
                customer.CreatedAt)
        });
    }
}