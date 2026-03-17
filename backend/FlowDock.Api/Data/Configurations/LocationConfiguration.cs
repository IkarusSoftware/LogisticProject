using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Name).HasMaxLength(200).IsRequired();
        builder.Property(l => l.Address).HasMaxLength(500);
        builder.HasOne(l => l.Company).WithMany(c => c.Locations).HasForeignKey(l => l.CompanyId);
    }
}
