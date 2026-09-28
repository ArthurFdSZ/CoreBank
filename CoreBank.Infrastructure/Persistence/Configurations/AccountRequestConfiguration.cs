using CoreBank.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CoreBank.Infrastructure.Persistence.Configurations;

// Configura o mapeamento da entidade AccountRequest no banco de dados.
public class AccountRequestConfiguration
    : IEntityTypeConfiguration<AccountRequest>
{
    public void Configure(
        EntityTypeBuilder<AccountRequest> builder)
    {
        builder.ToTable("AccountRequests");

        builder.HasKey(request => request.Id);

        builder.Property(request => request.Type)
            .IsRequired();

        builder.Property(request => request.Status)
            .IsRequired();

        builder.Property(request => request.CreatedAt)
            .IsRequired();

        builder.Property(request => request.ReviewedAt)
            .IsRequired(false);

        // Toda solicitação deve estar vinculada a uma conta existente.
        builder.HasOne<Account>()
            .WithMany()
            .HasForeignKey(request => request.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        // Ajuda nas consultas de solicitações por conta.
        builder.HasIndex(request => request.AccountId);
    }
}