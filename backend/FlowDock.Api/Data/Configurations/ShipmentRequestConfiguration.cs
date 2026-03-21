using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class ShipmentRequestConfiguration : IEntityTypeConfiguration<ShipmentRequest>
{
    public void Configure(EntityTypeBuilder<ShipmentRequest> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.RequestNo).HasMaxLength(30).IsRequired();
        builder.Property(s => s.VehicleType).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.LoadTime).HasMaxLength(10);
        builder.Property(s => s.QuantityInfo).HasMaxLength(500);
        builder.Property(s => s.ProductInfo).HasMaxLength(500);
        builder.Property(s => s.Notes).HasMaxLength(1000);
        builder.Property(s => s.CurrentStatus).HasConversion<string>().HasMaxLength(30);

        builder.HasIndex(s => s.RequestNo).IsUnique();
        builder.HasIndex(s => s.CurrentStatus);
        builder.HasIndex(s => s.LoadDate);

        builder.HasOne(s => s.RequesterCompany).WithMany().HasForeignKey(s => s.RequesterCompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(s => s.TargetLocation).WithMany().HasForeignKey(s => s.TargetLocationId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(s => s.AssignedSupplierCompany).WithMany().HasForeignKey(s => s.AssignedSupplierCompanyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(s => s.CreatedByUser).WithMany().HasForeignKey(s => s.CreatedBy).OnDelete(DeleteBehavior.Restrict);
    }
}
