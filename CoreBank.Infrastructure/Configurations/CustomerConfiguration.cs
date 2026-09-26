using CoreBank.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CoreBank.Infrastructure.Configurations;

// Define como Customer será armazenado no banco de dados.
public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        // Define a chave primária.
        builder.HasKey(customer => customer.Id);

        builder.Property(customer => customer.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(customer => customer.Cpf)
            .IsRequired()
            .HasMaxLength(11);

        builder.Property(customer => customer.Email)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(customer => customer.PasswordHash)
            .IsRequired()
            .HasMaxLength(255);

        // CPF e e-mail não podem se repetir.
        builder.HasIndex(customer => customer.Cpf)
            .IsUnique();

        builder.HasIndex(customer => customer.Email)
            .IsUnique();
    }
}