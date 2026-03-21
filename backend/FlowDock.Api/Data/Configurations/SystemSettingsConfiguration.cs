using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlowDock.Api.Data.Configurations;

public class SystemSettingsConfiguration : IEntityTypeConfiguration<SystemSettings>
{
    public void Configure(EntityTypeBuilder<SystemSettings> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.CompanyName).HasMaxLength(200).IsRequired();
        builder.Property(s => s.WorkStartHour).HasMaxLength(10);
        builder.Property(s => s.WorkEndHour).HasMaxLength(10);
        builder.Property(s => s.DefaultVehicleType).HasConversion<string>().HasMaxLength(20);
    }
}
