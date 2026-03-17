using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class RampConfiguration : IEntityTypeConfiguration<Ramp>
{
    public void Configure(EntityTypeBuilder<Ramp> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Code).HasMaxLength(50).IsRequired();
        builder.Property(r => r.Name).HasMaxLength(100).IsRequired();
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
        builder.HasOne(r => r.Location).WithMany(l => l.Ramps).HasForeignKey(r => r.LocationId);
    }
}
