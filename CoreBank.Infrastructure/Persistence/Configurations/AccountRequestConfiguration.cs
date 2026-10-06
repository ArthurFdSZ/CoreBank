using CoreBank.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CoreBank.Infrastructure.Persistence.Configurations;

public class AccountRequestConfiguration
    : IEntityTypeConfiguration<AccountRequest>
{
    public void Configure(
        EntityTypeBuilder<AccountRequest> builder)
    {
        // Define a chave primária.
        builder.HasKey(request => request.Id);

        // Cliente responsável pela solicitação.
        //
        // Temporariamente opcional para permitir uma migração segura
        // dos registros antigos já existentes no banco.
        builder.Property(request => request.CustomerId)
            .IsRequired(false);

        // Conta relacionada à solicitação.
        //
        // Precisa ser opcional porque, em uma solicitação de abertura,
        // a conta ainda não existe.
        builder.Property(request => request.AccountId)
            .IsRequired(false);

        // Tipo da solicitação.
        builder.Property(request => request.Type)
            .IsRequired();

        // Motivo informado pelo cliente.
        builder.Property(request => request.Reason)
            .IsRequired()
            .HasMaxLength(500);

        // Status da solicitação.
        builder.Property(request => request.Status)
            .IsRequired();

        // Data de criação.
        builder.Property(request => request.CreatedAt)
            .IsRequired();

        // Data de análise pode ser nula enquanto
        // a solicitação estiver pendente.
        builder.Property(request => request.ReviewedAt)
            .IsRequired(false);

        // Relacionamento entre solicitação e cliente.
        //
        // Restrict evita que a exclusão de um cliente apague
        // automaticamente o histórico das solicitações.
        builder.HasOne<Customer>()
            .WithMany()
            .HasForeignKey(request => request.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Relacionamento entre solicitação e conta.
        //
        // AccountId é opcional para suportar abertura de conta.
        builder.HasOne<Account>()
            .WithMany()
            .HasForeignKey(request => request.AccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
