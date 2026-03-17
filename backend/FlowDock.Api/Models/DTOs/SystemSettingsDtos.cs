namespace FlowDock.Api.Models.DTOs;

public class SystemSettingsDto
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string WorkStartHour { get; set; } = string.Empty;
    public string WorkEndHour { get; set; } = string.Empty;
    public int MaxDailyShipments { get; set; }
    public string DefaultVehicleType { get; set; } = string.Empty;
    public bool NotificationsEnabled { get; set; }
    public bool AutoAssignRamp { get; set; }
    public bool MaintenanceMode { get; set; }
}

public class UpdateSystemSettingsRequest
{
    public string? CompanyName { get; set; }
    public string? WorkStartHour { get; set; }
    public string? WorkEndHour { get; set; }
    public int? MaxDailyShipments { get; set; }
    public string? DefaultVehicleType { get; set; }
    public bool? NotificationsEnabled { get; set; }
    public bool? AutoAssignRamp { get; set; }
    public bool? MaintenanceMode { get; set; }
}
