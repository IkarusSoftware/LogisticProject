using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class LoadingOperationConfiguration : IEntityTypeConfiguration<LoadingOperation>
{
    public void Configure(EntityTypeBuilder<LoadingOperation> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.SealNumber).HasMaxLength(50);
        builder.Property(l => l.Notes).HasMaxLength(1000);

        builder.HasOne(l => l.ShipmentRequest).WithOne(s => s.LoadingOperation).HasForeignKey<LoadingOperation>(l => l.ShipmentRequestId);
    }
}
