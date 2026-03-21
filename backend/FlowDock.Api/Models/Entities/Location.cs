namespace FlowDock.Api.Models.Entities;

public class Location
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public Guid CompanyId { get; set; }
    public bool IsActive { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<Ramp> Ramps { get; set; } = new List<Ramp>();
}
