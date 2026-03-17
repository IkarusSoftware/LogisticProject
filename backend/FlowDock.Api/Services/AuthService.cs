using FlowDock.Api.Data;
using FlowDock.Api.Infrastructure;
using FlowDock.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FlowDock.Api.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(string email, string password);
    Task<LoginResponse?> DemoLoginAsync(string legacyUserId);
    Task<LoginResponse?> RefreshAsync(string refreshToken);
    Task LogoutAsync(Guid userId);
    Task<UserProfile?> GetProfileAsync(Guid userId);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly JwtTokenGenerator _jwt;
    private readonly JwtSettings _jwtSettings;

    public AuthService(AppDbContext db, JwtTokenGenerator jwt, IOptions<JwtSettings> jwtSettings)
    {
        _db = db;
        _jwt = jwt;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<LoginResponse?> LoginAsync(string email, string password)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

        if (user == null || !user.IsActive)
            return null;

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        return await GenerateLoginResponseAsync(user);
    }

    public async Task<LoginResponse?> DemoLoginAsync(string legacyUserId)
    {
        if (!SeedIds.UserIdMap.TryGetValue(legacyUserId, out var userId))
            return null;

        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || !user.IsActive)
            return null;

        return await GenerateLoginResponseAsync(user);
    }

    public async Task<LoginResponse?> RefreshAsync(string refreshToken)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken && u.RefreshTokenExpiresAt > DateTime.UtcNow);

        if (user == null)
            return null;

        return await GenerateLoginResponseAsync(user);
    }

    public async Task LogoutAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiresAt = null;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<UserProfile?> GetProfileAsync(Guid userId)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        return MapProfile(user);
    }

    private async Task<LoginResponse> GenerateLoginResponseAsync(Models.Entities.User user)
    {
        var roleKey = user.Role.Key.ToString().ToLower();
        var (accessToken, expiresAt) = _jwt.GenerateAccessToken(user, roleKey);
        var refreshToken = _jwt.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays);
        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt,
            User = MapProfile(user),
        };
    }

    private static UserProfile MapProfile(Models.Entities.User user) => new()
    {
        Id = user.Id,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        RoleKey = user.Role.Key.ToString().ToLower(),
        RoleName = user.Role.Name,
        CompanyId = user.CompanyId,
        CompanyName = user.Company.Name,
    };
}
