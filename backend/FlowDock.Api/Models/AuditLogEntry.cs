namespace FlowDock.Api.Models;

public class AuditLogEntry
{
    public string Id { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string OldValue { get; set; } = string.Empty;
    public string NewValue { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid PerformedByUserId { get; set; }
    public string PerformedByName { get; set; } = string.Empty;
    public DateTime PerformedAt { get; set; }
}
