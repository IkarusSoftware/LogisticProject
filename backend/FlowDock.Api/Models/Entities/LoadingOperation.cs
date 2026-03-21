namespace FlowDock.Api.Models.Entities;

public class LoadingOperation
{
    public Guid Id { get; set; }
    public Guid ShipmentRequestId { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? SealNumber { get; set; }
    public DateTime? SealedAt { get; set; }
    public Guid? FinalizedBy { get; set; }
    public DateTime? ExitAt { get; set; }
    public string? Notes { get; set; }

    public ShipmentRequest ShipmentRequest { get; set; } = null!;
}
