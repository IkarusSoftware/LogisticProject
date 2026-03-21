using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.EntityType).HasMaxLength(50).IsRequired();
        builder.Property(a => a.EntityId).HasMaxLength(100).IsRequired();
        builder.Property(a => a.ActionType).HasMaxLength(50).IsRequired();
        builder.Property(a => a.OldValue).HasMaxLength(2000);
        builder.Property(a => a.NewValue).HasMaxLength(2000);
        builder.Property(a => a.Description).HasMaxLength(1000);

        builder.HasIndex(a => a.PerformedAt);
        builder.HasIndex(a => a.EntityType);
        builder.HasIndex(a => a.ActionType);

        builder.HasOne(a => a.PerformedBy).WithMany().HasForeignKey(a => a.PerformedByUserId).OnDelete(DeleteBehavior.Restrict);
    }
}
