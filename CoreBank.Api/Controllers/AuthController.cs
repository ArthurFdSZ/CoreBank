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

        _passwordHasher =
            new PasswordHasher<Customer>();
    }

    // Traduz o perfil interno para português.
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
    public async Task<IActionResult> Login(
        LoginRequest request)
    {
        var normalizedEmail =
            request.Email.Trim().ToLowerInvariant();

        var customer = await _context.Customers
            .FirstOrDefaultAsync(customer =>
                customer.Email.ToLower() ==
                normalizedEmail);

        if (customer is null)
        {
            return Unauthorized(new
            {
                mensagem = "E-mail ou senha inválidos."
            });
        }

        var passwordResult =
            _passwordHasher.VerifyHashedPassword(
                customer,
                customer.PasswordHash,
                request.Password);

        if (passwordResult ==
            PasswordVerificationResult.Failed)
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

    // Cria uma solicitação de recuperação de senha.
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        ForgotPasswordRequest request)
    {
        var normalizedEmail =
            request.Email.Trim().ToLowerInvariant();

        var customer = await _context.Customers
            .FirstOrDefaultAsync(customer =>
                customer.Email.ToLower() ==
                normalizedEmail);

        /*
         * Não informamos se o e-mail existe.
         * Isso evita exposição de usuários cadastrados.
         */
        if (customer is null)
        {
            return Ok(new
            {
                mensagem =
                    "Se os dados informados estiverem cadastrados, a solicitação será encaminhada para análise."
            });
        }

        // Impede mais de uma solicitação pendente
        // para o mesmo cliente.
        var hasPendingRequest =
            await _context.PasswordResetRequests
                .AnyAsync(resetRequest =>
                    resetRequest.CustomerId ==
                    customer.Id &&
                    resetRequest.Status ==
                    PasswordResetRequestStatus.Pending);

        if (!hasPendingRequest)
        {
            var passwordResetRequest =
                new PasswordResetRequest(
                    customer.Id);

            _context.PasswordResetRequests.Add(
                passwordResetRequest);

            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            mensagem =
                "Se os dados informados estiverem cadastrados, a solicitação será encaminhada para análise."
        });
    }

    // Consulta o estado da solicitação mais recente.
    [HttpGet("password-reset-status")]
    public async Task<IActionResult> GetPasswordResetStatus(
        [FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new
            {
                mensagem = "Informe o e-mail."
            });
        }

        var normalizedEmail =
            email.Trim().ToLowerInvariant();

        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(customer =>
                customer.Email.ToLower() ==
                normalizedEmail);

        if (customer is null)
        {
            return Ok(new
            {
                status = "Não encontrada"
            });
        }

        var resetRequest =
            await _context.PasswordResetRequests
                .AsNoTracking()
                .Where(resetRequest =>
                    resetRequest.CustomerId ==
                    customer.Id)
                .OrderByDescending(resetRequest =>
                    resetRequest.CreatedAt)
                .FirstOrDefaultAsync();

        if (resetRequest is null)
        {
            return Ok(new
            {
                status = "Não encontrada"
            });
        }

        var status = resetRequest.Status switch
        {
            PasswordResetRequestStatus.Pending =>
                "Pendente",

            PasswordResetRequestStatus.Approved =>
                "Aprovada",

            PasswordResetRequestStatus.Rejected =>
                "Recusada",

            PasswordResetRequestStatus.Completed =>
                "Concluída",

            _ => "Desconhecida"
        };

        return Ok(new
        {
            solicitacaoId = resetRequest.Id,
            status
        });
    }

    // Permite redefinir a senha somente depois
    // da aprovação administrativa.
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(
        ResetPasswordRequest request)
    {
        var normalizedEmail =
            request.Email.Trim().ToLowerInvariant();

        var customer = await _context.Customers
            .FirstOrDefaultAsync(customer =>
                customer.Email.ToLower() ==
                normalizedEmail);

        if (customer is null)
        {
            return BadRequest(new
            {
                mensagem =
                    "Não foi possível redefinir a senha."
            });
        }

        var resetRequest =
            await _context.PasswordResetRequests
                .Where(resetRequest =>
                    resetRequest.CustomerId ==
                    customer.Id &&
                    resetRequest.Status ==
                    PasswordResetRequestStatus.Approved)
                .OrderByDescending(resetRequest =>
                    resetRequest.CreatedAt)
                .FirstOrDefaultAsync();

        if (resetRequest is null)
        {
            return BadRequest(new
            {
                mensagem =
                    "Não existe uma solicitação aprovada para redefinição de senha."
            });
        }

        var newPasswordHash =
            _passwordHasher.HashPassword(
                customer,
                request.NewPassword);

        customer.ChangePasswordHash(
            newPasswordHash);

        resetRequest.Complete();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensagem =
                "Senha redefinida com sucesso."
        });
    }

    // Gera o JWT do usuário autenticado.
    private string GenerateToken(Customer customer)
    {
        var jwtKey =
            _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "A chave JWT não foi configurada.");

        var jwtIssuer =
            _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "O emissor do JWT não foi configurado.");

        var jwtAudience =
            _configuration["Jwt:Audience"]
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

            new Claim(
                ClaimTypes.Role,
                customer.Role.ToString())
        };

        var securityKey =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey));

        var credentials =
            new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256);

        var token =
            new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: credentials);

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}