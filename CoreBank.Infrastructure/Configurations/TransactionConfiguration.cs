using CoreBank.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CoreBank.Infrastructure.Configurations;

// Define como Transaction será armazenada no banco de dados.
public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        // Define a chave primária.
        builder.HasKey(transaction => transaction.Id);

        builder.Property(transaction => transaction.Type)
            .IsRequired();

        // Define duas casas decimais para valores monetários.
        builder.Property(transaction => transaction.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(transaction => transaction.Description)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(transaction => transaction.CreatedAt)
            .IsRequired();

        // Facilita consultas do extrato por conta e por data.
        builder.HasIndex(transaction => transaction.AccountId);
        builder.HasIndex(transaction => transaction.CreatedAt);

        // Conta proprietária da movimentação.
        builder.HasOne<Account>()
            .WithMany()
            .HasForeignKey(transaction => transaction.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        // Outra conta envolvida, quando houver uma transferência.
        builder.HasOne<Account>()
            .WithMany()
            .HasForeignKey(transaction => transaction.RelatedAccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}