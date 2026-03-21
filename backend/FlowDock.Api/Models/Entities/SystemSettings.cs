using FlowDock.Api.Models.Enums;

namespace FlowDock.Api.Models.Entities;

public class SystemSettings
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string WorkStartHour { get; set; } = "08:00";
    public string WorkEndHour { get; set; } = "18:00";
    public int MaxDailyShipments { get; set; } = 50;
    public VehicleType DefaultVehicleType { get; set; } = VehicleType.Tir;
    public bool NotificationsEnabled { get; set; } = true;
    public bool AutoAssignRamp { get; set; }
    public bool MaintenanceMode { get; set; }
}
