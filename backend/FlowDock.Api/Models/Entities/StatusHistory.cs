namespace FlowDock.Api.Models.Entities;

public class StatusHistory
{
    public Guid Id { get; set; }
    public Guid ShipmentRequestId { get; set; }
    public string OldStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public Guid ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? Note { get; set; }

    public ShipmentRequest ShipmentRequest { get; set; } = null!;
}
