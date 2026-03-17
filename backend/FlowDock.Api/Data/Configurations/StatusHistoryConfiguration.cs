using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class StatusHistoryConfiguration : IEntityTypeConfiguration<StatusHistory>
{
    public void Configure(EntityTypeBuilder<StatusHistory> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.OldStatus).HasMaxLength(30);
        builder.Property(s => s.NewStatus).HasMaxLength(30);
        builder.Property(s => s.Note).HasMaxLength(500);

        builder.HasIndex(s => s.ChangedAt);

        builder.HasOne(s => s.ShipmentRequest).WithMany(r => r.StatusHistories).HasForeignKey(s => s.ShipmentRequestId);
    }
}
