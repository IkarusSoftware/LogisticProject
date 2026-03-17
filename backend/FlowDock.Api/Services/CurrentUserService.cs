using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace FlowDock.Api.Services;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? RoleKey { get; }
    Guid? CompanyId { get; }
    string? FullName { get; }
}

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var sub = _httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? RoleKey =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue("role")
        ?? _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Role);

    public Guid? CompanyId
    {
        get
        {
            var val = _httpContextAccessor.HttpContext?.User.FindFirstValue("companyId");
            return Guid.TryParse(val, out var id) ? id : null;
        }
    }

    public string? FullName =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Name)
        ?? _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Name);
}
