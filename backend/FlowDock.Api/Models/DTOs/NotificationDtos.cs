namespace FlowDock.Api.Models.DTOs;

public class NotificationDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Level { get; set; } = "info";
    public string CreatedAt { get; set; } = string.Empty;
    public string[] TargetRoleKeys { get; set; } = Array.Empty<string>();
    public string[] TargetCompanyIds { get; set; } = Array.Empty<string>();
    public string? ShipmentRequestId { get; set; }
    public bool IsRead { get; set; }
}
