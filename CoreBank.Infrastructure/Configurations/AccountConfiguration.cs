using CoreBank.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CoreBank.Infrastructure.Configurations;

// Define como Account será armazenada no banco de dados.
public class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        // Define a chave primária.
        builder.HasKey(account => account.Id);

        builder.Property(account => account.Agency)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(account => account.Number)
            .IsRequired()
            .HasMaxLength(20);

        // Define a precisão do saldo.
        builder.Property(account => account.Balance)
            .HasPrecision(18, 2);

        builder.Property(account => account.Status)
            .IsRequired();

        // Agência + número formam uma identificação única da conta.
        builder.HasIndex(account => new
        {
            account.Agency,
            account.Number
        }).IsUnique();

        // Um cliente pode possuir apenas uma conta no MVP.
        builder.HasIndex(account => account.CustomerId)
            .IsUnique();

        // Relacionamento: uma conta pertence a um cliente.
        builder.HasOne<Customer>()
            .WithOne()
            .HasForeignKey<Account>(account => account.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}