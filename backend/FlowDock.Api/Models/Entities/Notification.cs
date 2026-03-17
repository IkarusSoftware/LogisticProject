namespace FlowDock.Api.Models.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Level { get; set; } = "info";
    public DateTime CreatedAt { get; set; }
    public string[] TargetRoleKeys { get; set; } = Array.Empty<string>();
    public Guid[] TargetCompanyIds { get; set; } = Array.Empty<Guid>();
    public Guid? ShipmentRequestId { get; set; }
    public Guid[] IsReadBy { get; set; } = Array.Empty<Guid>();
}
