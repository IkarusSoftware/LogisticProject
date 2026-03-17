using FlowDock.Api.Models.Enums;

namespace FlowDock.Api.Models.Entities;

public class Role
{
    public Guid Id { get; set; }
    public UserRoleKey Key { get; set; }
    public string Name { get; set; } = string.Empty;
    public string[] Permissions { get; set; } = Array.Empty<string>();

    public ICollection<User> Users { get; set; } = new List<User>();
}
