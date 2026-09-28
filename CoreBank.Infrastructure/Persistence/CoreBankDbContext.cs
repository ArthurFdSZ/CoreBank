using CoreBank.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CoreBank.Infrastructure.Persistence;

// Representa o banco de dados do CoreBank dentro da aplicação.
public class CoreBankDbContext : DbContext
{
    public CoreBankDbContext(DbContextOptions<CoreBankDbContext> options)
        : base(options)
    {
    }

    // Representam as tabelas do banco.
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Account> Accounts { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<AccountRequest> AccountRequests { get; set; }

    // Aplica automaticamente as configurações das entidades.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(CoreBankDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
}