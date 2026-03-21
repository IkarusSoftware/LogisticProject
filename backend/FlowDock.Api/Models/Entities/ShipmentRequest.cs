using FlowDock.Api.Models.Enums;

namespace FlowDock.Api.Models.Entities;

public class ShipmentRequest
{
    public Guid Id { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public Guid RequesterCompanyId { get; set; }
    public Guid TargetLocationId { get; set; }
    public DateTime RequestDate { get; set; }
    public VehicleType VehicleType { get; set; }
    public DateTime LoadDate { get; set; }
    public string LoadTime { get; set; } = string.Empty;
    public string QuantityInfo { get; set; } = string.Empty;
    public string ProductInfo { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public ShipmentStatus CurrentStatus { get; set; }
    public Guid AssignedSupplierCompanyId { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Company RequesterCompany { get; set; } = null!;
    public Location TargetLocation { get; set; } = null!;
    public Company AssignedSupplierCompany { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public VehicleAssignment? VehicleAssignment { get; set; }
    public RampAssignment? RampAssignment { get; set; }
    public GateOperation? GateOperation { get; set; }
    public LoadingOperation? LoadingOperation { get; set; }
    public ICollection<StatusHistory> StatusHistories { get; set; } = new List<StatusHistory>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
