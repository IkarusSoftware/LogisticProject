using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class GateOperationConfiguration : IEntityTypeConfiguration<GateOperation>
{
    public void Configure(EntityTypeBuilder<GateOperation> builder)
    {
        builder.HasKey(g => g.Id);
        builder.Property(g => g.Notes).HasMaxLength(1000);

        builder.HasOne(g => g.ShipmentRequest).WithOne(s => s.GateOperation).HasForeignKey<GateOperation>(g => g.ShipmentRequestId);
    }
}
