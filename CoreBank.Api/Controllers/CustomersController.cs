using CoreBank.Api.Dtos;
using CoreBank.Domain.Entities;
using CoreBank.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
                customer.CreatedAt
            });
    }
}