using CoreBank.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CoreBank.Infrastructure.Persistence.Configurations;

// Configura o armazenamento das solicitações
// de redefinição de senha.
public class PasswordResetRequestConfiguration
    : IEntityTypeConfiguration<PasswordResetRequest>
{
    public void Configure(
        EntityTypeBuilder<PasswordResetRequest> builder)
    {
        builder.ToTable("PasswordResetRequests");

        builder.HasKey(request => request.Id);

        builder.Property(request => request.Status)
            .IsRequired();

        builder.Property(request => request.CreatedAt)
            .IsRequired();

        builder.Property(request => request.ReviewedAt)
            .IsRequired(false);

        builder.Property(request => request.CompletedAt)
            .IsRequired(false);

        builder.HasOne<Customer>()
            .WithMany()
            .HasForeignKey(request => request.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(request => request.CustomerId);

        builder.HasIndex(request => request.Status);
    }
}