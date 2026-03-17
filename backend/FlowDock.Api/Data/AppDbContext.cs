using FlowDock.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Ramp> Ramps => Set<Ramp>();
    public DbSet<ShipmentRequest> ShipmentRequests => Set<ShipmentRequest>();
    public DbSet<VehicleAssignment> VehicleAssignments => Set<VehicleAssignment>();
    public DbSet<RampAssignment> RampAssignments => Set<RampAssignment>();
    public DbSet<GateOperation> GateOperations => Set<GateOperation>();
    public DbSet<LoadingOperation> LoadingOperations => Set<LoadingOperation>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<StatusHistory> StatusHistories => Set<StatusHistory>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<SystemSettings> SystemSettings => Set<SystemSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
