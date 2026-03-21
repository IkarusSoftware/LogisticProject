using System.Text.Json;
using FlowDock.Api.Data;
using FlowDock.Api.Models.DTOs;
using FlowDock.Api.Models.Entities;
using FlowDock.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Services;

public interface IUserService
{
    Task<PagedResult<UserDto>> GetUsersAsync(UserListFilterRequest filter);
    Task<UserDto?> GetByIdAsync(Guid id);
    Task<OperationResult> CreateAsync(CreateUserRequest request);
    Task<OperationResult> UpdateAsync(Guid id, UpdateUserRequest request);
    Task<OperationResult> ToggleStatusAsync(Guid id);
    Task<OperationResult> DeleteAsync(Guid id);
}

public class UserService : IUserService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditFileLogger _auditFileLogger;

    public UserService(AppDbContext db, ICurrentUserService currentUser, IAuditFileLogger auditFileLogger)
    {
        _db = db;
        _currentUser = currentUser;
        _auditFileLogger = auditFileLogger;
    }

    public async Task<PagedResult<UserDto>> GetUsersAsync(UserListFilterRequest filter)
    {
        var query = _db.Users
            .Include(u => u.Role)
            .Include(u => u.Company)
            .AsQueryable();

        if (filter.IsActive.HasValue)
            query = query.Where(u => u.IsActive == filter.IsActive.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(search) ||
                u.LastName.ToLower().Contains(search) ||
                u.Email.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(Math.Min(filter.PageSize, 100))
            .Select(u => MapDto(u))
            .ToListAsync();

        return new PagedResult<UserDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize,
        };
    }

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Id == id);

        return user == null ? null : MapDto(user);
    }

    public async Task<OperationResult> CreateAsync(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.RoleKey))
            return OperationResult.Fail("Zorunlu alanlar eksik.");

        if (!Enum.TryParse<UserRoleKey>(request.RoleKey, true, out var roleKey))
            return OperationResult.Fail($"Gecersiz rol: {request.RoleKey}");

        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Key == roleKey);
        if (role == null)
            return OperationResult.Fail("Rol bulunamadi.");

        if (!await _db.Companies.AnyAsync(c => c.Id == request.CompanyId))
            return OperationResult.Fail("Sirket bulunamadi.");

        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
            return OperationResult.Fail("Bu e-posta adresi zaten kullaniliyor.");

        var password = request.Password ?? "demo123";
        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim().ToLower(),
            Phone = request.Phone?.Trim() ?? string.Empty,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            RoleId = role.Id,
            CompanyId = request.CompanyId,
            IsActive = true,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);

        _ = _auditFileLogger.WriteAsync(new Models.AuditLogEntry
        {
            Id = Guid.NewGuid().ToString(),
            EntityType = "User",
            EntityId = user.Id.ToString(),
            ActionType = "user_created",
            OldValue = string.Empty,
            NewValue = JsonSerializer.Serialize(new { user.FirstName, user.LastName, user.Email, RoleKey = roleKey.ToString().ToLower() }),
            Description = $"{user.FirstName} {user.LastName} kullanicisi olusturuldu.",
            PerformedByUserId = _currentUser.UserId ?? Guid.Empty,
            PerformedByName = _currentUser.FullName ?? "-",
            PerformedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return OperationResult.Success($"{user.FirstName} {user.LastName} basariyla olusturuldu.");
    }

    public async Task<OperationResult> UpdateAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return OperationResult.Fail("Kullanici bulunamadi.");

        var oldValue = JsonSerializer.Serialize(new { user.FirstName, user.LastName, user.Email, user.Phone, RoleKey = user.Role.Key.ToString().ToLower() });

        if (request.Email != null && request.Email.ToLower() != user.Email.ToLower())
        {
            if (await _db.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.Id != id))
                return OperationResult.Fail("Bu e-posta adresi zaten kullaniliyor.");
            user.Email = request.Email.Trim().ToLower();
        }

        if (request.RoleKey != null)
        {
            if (!Enum.TryParse<UserRoleKey>(request.RoleKey, true, out var roleKey))
                return OperationResult.Fail($"Gecersiz rol: {request.RoleKey}");
            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Key == roleKey);
            if (role == null)
                return OperationResult.Fail("Rol bulunamadi.");
            user.RoleId = role.Id;
        }

        if (request.CompanyId.HasValue)
        {
            if (!await _db.Companies.AnyAsync(c => c.Id == request.CompanyId.Value))
                return OperationResult.Fail("Sirket bulunamadi.");
            user.CompanyId = request.CompanyId.Value;
        }

        if (request.FirstName != null) user.FirstName = request.FirstName.Trim();
        if (request.LastName != null) user.LastName = request.LastName.Trim();
        if (request.Phone != null) user.Phone = request.Phone.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        // Reload role for audit log newValue
        await _db.Entry(user).Reference(u => u.Role).LoadAsync();

        _ = _auditFileLogger.WriteAsync(new Models.AuditLogEntry
        {
            Id = Guid.NewGuid().ToString(),
            EntityType = "User",
            EntityId = user.Id.ToString(),
            ActionType = "user_updated",
            OldValue = oldValue,
            NewValue = JsonSerializer.Serialize(new { user.FirstName, user.LastName, user.Email, user.Phone, RoleKey = user.Role.Key.ToString().ToLower() }),
            Description = $"{user.FirstName} {user.LastName} kullanicisi guncellendi.",
            PerformedByUserId = _currentUser.UserId ?? Guid.Empty,
            PerformedByName = _currentUser.FullName ?? "-",
            PerformedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return OperationResult.Success($"{user.FirstName} {user.LastName} basariyla guncellendi.");
    }

    public async Task<OperationResult> ToggleStatusAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return OperationResult.Fail("Kullanici bulunamadi.");

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        var statusText = user.IsActive ? "aktif" : "pasif";

        _ = _auditFileLogger.WriteAsync(new Models.AuditLogEntry
        {
            Id = Guid.NewGuid().ToString(),
            EntityType = "User",
            EntityId = user.Id.ToString(),
            ActionType = "user_status_toggled",
            OldValue = (!user.IsActive).ToString(),
            NewValue = user.IsActive.ToString(),
            Description = $"{user.FirstName} {user.LastName} {statusText} yapildi.",
            PerformedByUserId = _currentUser.UserId ?? Guid.Empty,
            PerformedByName = _currentUser.FullName ?? "-",
            PerformedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return OperationResult.Success($"{user.FirstName} {user.LastName} {statusText} yapildi.");
    }

    public async Task<OperationResult> DeleteAsync(Guid id)
    {
        var requestingUserId = _currentUser.UserId ?? Guid.Empty;
        if (id == requestingUserId)
            return OperationResult.Fail("Kendi hesabinizi silemezsiniz.");

        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return OperationResult.Fail("Kullanici bulunamadi.");

        var fullName = $"{user.FirstName} {user.LastName}";
        var email = user.Email;

        _db.Users.Remove(user);

        _ = _auditFileLogger.WriteAsync(new Models.AuditLogEntry
        {
            Id = Guid.NewGuid().ToString(),
            EntityType = "User",
            EntityId = id.ToString(),
            ActionType = "user_deleted",
            OldValue = fullName,
            NewValue = string.Empty,
            Description = $"Kullanici silindi: {fullName} ({email})",
            PerformedByUserId = _currentUser.UserId ?? Guid.Empty,
            PerformedByName = _currentUser.FullName ?? "-",
            PerformedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return OperationResult.Success($"{fullName} kalici olarak silindi.");
    }

    private static UserDto MapDto(User user) => new()
    {
        Id = user.Id,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        Phone = user.Phone,
        RoleKey = user.Role.Key.ToString().ToLower(),
        RoleName = user.Role.Name,
        CompanyId = user.CompanyId,
        CompanyName = user.Company.Name,
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt,
    };
}
