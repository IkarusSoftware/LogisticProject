namespace FlowDock.Api.Models.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string OldValue { get; set; } = string.Empty;
    public string NewValue { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid PerformedByUserId { get; set; }
    public DateTime PerformedAt { get; set; }

    public User PerformedBy { get; set; } = null!;
}
