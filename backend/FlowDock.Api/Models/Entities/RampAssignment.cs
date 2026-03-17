namespace FlowDock.Api.Models.Entities;

public class RampAssignment
{
    public Guid Id { get; set; }
    public Guid ShipmentRequestId { get; set; }
    public Guid RampId { get; set; }
    public Guid AssignedBy { get; set; }
    public DateTime AssignedAt { get; set; }
    public string Status { get; set; } = "ASSIGNED";

    public ShipmentRequest ShipmentRequest { get; set; } = null!;
    public Ramp Ramp { get; set; } = null!;
}
