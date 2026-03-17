using FlowDock.Api.Models.Enums;

namespace FlowDock.Api.Models.Entities;

public class Ramp
{
    public Guid Id { get; set; }
    public Guid LocationId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public RampStatus Status { get; set; }
    public bool IsActive { get; set; }

    public Location Location { get; set; } = null!;
}
