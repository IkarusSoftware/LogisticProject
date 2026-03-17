using System.Text.Json;
using FlowDock.Api.Data;
using FlowDock.Api.Models.DTOs;
using FlowDock.Api.Models.Entities;
using FlowDock.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Services;

public interface ISystemSettingsService
{
    Task<SystemSettingsDto> GetAsync();
    Task<OperationResult> UpdateAsync(UpdateSystemSettingsRequest request);
}

public class SystemSettingsService : ISystemSettingsService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditFileLogger _auditFileLogger;

    public SystemSettingsService(AppDbContext db, ICurrentUserService currentUser, IAuditFileLogger auditFileLogger)
    {
        _db = db;
        _currentUser = currentUser;
        _auditFileLogger = auditFileLogger;
    }

    public async Task<SystemSettingsDto> GetAsync()
    {
        var settings = await _db.SystemSettings.FirstAsync();
        return MapDto(settings);
    }

    public async Task<OperationResult> UpdateAsync(UpdateSystemSettingsRequest request)
    {
        var settings = await _db.SystemSettings.FirstAsync();
        var oldValue = JsonSerializer.Serialize(MapDto(settings));

        if (request.CompanyName != null) settings.CompanyName = request.CompanyName.Trim();
        if (request.WorkStartHour != null) settings.WorkStartHour = request.WorkStartHour;
        if (request.WorkEndHour != null) settings.WorkEndHour = request.WorkEndHour;
        if (request.MaxDailyShipments.HasValue) settings.MaxDailyShipments = request.MaxDailyShipments.Value;
        if (request.NotificationsEnabled.HasValue) settings.NotificationsEnabled = request.NotificationsEnabled.Value;
        if (request.AutoAssignRamp.HasValue) settings.AutoAssignRamp = request.AutoAssignRamp.Value;
        if (request.MaintenanceMode.HasValue) settings.MaintenanceMode = request.MaintenanceMode.Value;

        if (request.DefaultVehicleType != null)
        {
            if (Enum.TryParse<VehicleType>(request.DefaultVehicleType, true, out var vehicleType))
                settings.DefaultVehicleType = vehicleType;
            else
                return OperationResult.Fail($"Gecersiz arac tipi: {request.DefaultVehicleType}");
        }

        _ = _auditFileLogger.WriteAsync(new Models.AuditLogEntry
        {
            Id = Guid.NewGuid().ToString(),
            EntityType = "SystemSettings",
            EntityId = settings.Id.ToString(),
            ActionType = "settings_updated",
            OldValue = oldValue,
            NewValue = JsonSerializer.Serialize(MapDto(settings)),
            Description = "Sistem ayarlari guncellendi.",
            PerformedByUserId = _currentUser.UserId ?? Guid.Empty,
            PerformedByName = _currentUser.FullName ?? "-",
            PerformedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return OperationResult.Success("Sistem ayarlari basariyla guncellendi.");
    }

    private static SystemSettingsDto MapDto(SystemSettings s) => new()
    {
        Id = s.Id,
        CompanyName = s.CompanyName,
        WorkStartHour = s.WorkStartHour,
        WorkEndHour = s.WorkEndHour,
        MaxDailyShipments = s.MaxDailyShipments,
        DefaultVehicleType = s.DefaultVehicleType.ToString().ToUpper(),
        NotificationsEnabled = s.NotificationsEnabled,
        AutoAssignRamp = s.AutoAssignRamp,
        MaintenanceMode = s.MaintenanceMode,
    };
}
