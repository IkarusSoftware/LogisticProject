using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class RampAssignmentConfiguration : IEntityTypeConfiguration<RampAssignment>
{
    public void Configure(EntityTypeBuilder<RampAssignment> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Status).HasMaxLength(20);

        builder.HasOne(r => r.ShipmentRequest).WithOne(s => s.RampAssignment).HasForeignKey<RampAssignment>(r => r.ShipmentRequestId);
        builder.HasOne(r => r.Ramp).WithMany().HasForeignKey(r => r.RampId).OnDelete(DeleteBehavior.Restrict);
    }
}
