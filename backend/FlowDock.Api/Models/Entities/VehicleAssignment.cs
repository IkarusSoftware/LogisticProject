using FlowDock.Api.Models.Enums;

namespace FlowDock.Api.Models.Entities;

public class VehicleAssignment
{
    public Guid Id { get; set; }
    public Guid ShipmentRequestId { get; set; }
    public Guid SupplierCompanyId { get; set; }
    public string TractorPlate { get; set; } = string.Empty;
    public string TrailerPlate { get; set; } = string.Empty;
    public string DriverFirstName { get; set; } = string.Empty;
    public string DriverLastName { get; set; } = string.Empty;
    public string DriverPhone { get; set; } = string.Empty;
    public AssignmentStatus AssignmentStatus { get; set; }
    public Guid AssignedBy { get; set; }
    public DateTime AssignedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }

    public ShipmentRequest ShipmentRequest { get; set; } = null!;
    public Company SupplierCompany { get; set; } = null!;
}
