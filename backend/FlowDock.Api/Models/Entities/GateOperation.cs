namespace FlowDock.Api.Models.Entities;

public class GateOperation
{
    public Guid Id { get; set; }
    public Guid ShipmentRequestId { get; set; }
    public DateTime? ArrivedAt { get; set; }
    public Guid? CheckedBy { get; set; }
    public DateTime? AdmittedAt { get; set; }
    public DateTime? RampTakenAt { get; set; }
    public string? Notes { get; set; }

    public ShipmentRequest ShipmentRequest { get; set; } = null!;
}
