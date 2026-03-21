namespace FlowDock.Api.Models.DTOs;

public class AuditLogDto
{
    public Guid Id { get; set; }
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

public class AuditLogFilterRequest
{
    public string? EntityType { get; set; }
    public string? ActionType { get; set; }
    public Guid? PerformedByUserId { get; set; }
    public string? Search { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "performedAt";
    public string SortDirection { get; set; } = "desc";
}

public class AuditLogStatsDto
{
    public string ActionType { get; set; } = string.Empty;
    public int Count { get; set; }
}
