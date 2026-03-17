using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class VehicleAssignmentConfiguration : IEntityTypeConfiguration<VehicleAssignment>
{
    public void Configure(EntityTypeBuilder<VehicleAssignment> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.TractorPlate).HasMaxLength(20);
        builder.Property(v => v.TrailerPlate).HasMaxLength(20);
        builder.Property(v => v.DriverFirstName).HasMaxLength(100);
        builder.Property(v => v.DriverLastName).HasMaxLength(100);
        builder.Property(v => v.DriverPhone).HasMaxLength(20);
        builder.Property(v => v.AssignmentStatus).HasConversion<string>().HasMaxLength(20);
        builder.Property(v => v.RejectionReason).HasMaxLength(500);

        builder.HasOne(v => v.ShipmentRequest).WithOne(s => s.VehicleAssignment).HasForeignKey<VehicleAssignment>(v => v.ShipmentRequestId);
        builder.HasOne(v => v.SupplierCompany).WithMany().HasForeignKey(v => v.SupplierCompanyId).OnDelete(DeleteBehavior.Restrict);
    }
}
