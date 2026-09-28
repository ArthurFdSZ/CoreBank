using CoreBank.Api.Dtos;
using CoreBank.Domain.Entities;
using CoreBank.Domain.Enums;
using CoreBank.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CoreBank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly CoreBankDbContext _context;
    private readonly PasswordHasher<Customer> _passwordHasher;
    private readonly IConfiguration _configuration;

    public AuthController(
        CoreBankDbContext context,
        IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
        _passwordHasher = new PasswordHasher<Customer>();
    }

    // Traduz o perfil interno para o texto exibido ao usuário.
    private static string FormatUserRole(UserRole role)
    {
        return role switch
        {
            UserRole.Customer => "Cliente",
            UserRole.Admin => "Administrador",
            _ => "Desconhecido"
        };
    }

    // Realiza o login e gera um token JWT.
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(customer =>
                customer.Email == request.Email);

        if (customer is null)
        {
            return Unauthorized(new
            {
                mensagem = "E-mail ou senha inválidos."
            });
        }

        var passwordResult = _passwordHasher.VerifyHashedPassword(
            customer,
            customer.PasswordHash,
            request.Password);

        if (passwordResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new
            {
                mensagem = "E-mail ou senha inválidos."
            });
        }

        string token = GenerateToken(customer);

        return Ok(new
        {
            customer.Id,
            customer.Name,
            customer.Email,
            Perfil = FormatUserRole(customer.Role),
            Token = token
        });
    }

    // Gera o JWT do usuário autenticado.
    private string GenerateToken(Customer customer)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "A chave JWT não foi configurada.");

        var jwtIssuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "O emissor do JWT não foi configurado.");

        var jwtAudience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException(
                "A audiência do JWT não foi configurada.");

        var claims = new[]
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                customer.Id.ToString()),

            new Claim(
                ClaimTypes.Name,
                customer.Name),

            new Claim(
                ClaimTypes.Email,
                customer.Email),

            // Mantido internamente em inglês.
            // É este valor que o ASP.NET usa para autorização.
            new Claim(
                ClaimTypes.Role,
                customer.Role.ToString())
        };

        var securityKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey));

        var credentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}