using CoreBank.Api.Dtos;
using CoreBank.Domain.Entities;
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

    // Realiza o login e gera um token JWT.
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(customer =>
                customer.Email == request.Email);

        if (customer is null)
        {
            return Unauthorized("E-mail ou senha inválidos.");
        }

        var passwordResult = _passwordHasher.VerifyHashedPassword(
            customer,
            customer.PasswordHash,
            request.Password);

        if (passwordResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized("E-mail ou senha inválidos.");
        }

        string token = GenerateToken(customer);

        return Ok(new
        {
            customer.Id,
            customer.Name,
            customer.Email,
            Token = token
        });
    }

    // Gera o JWT do cliente autenticado.
    private string GenerateToken(Customer customer)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "A chave JWT não foi configurada.");

        var jwtIssuer = _configuration["Jwt:Issuer"];
        var jwtAudience = _configuration["Jwt:Audience"];

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
                customer.Email)
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