using FlowDock.Api.Data;
using FlowDock.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Services;

public interface INotificationService
{
    Task<List<NotificationDto>> GetForCurrentUserAsync();
    Task<int> GetUnreadCountAsync();
    Task MarkAllReadAsync();
    Task MarkOneReadAsync(Guid id);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public NotificationService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<List<NotificationDto>> GetForCurrentUserAsync()
    {
        var userId = _currentUser.UserId ?? Guid.Empty;
        var roleKey = _currentUser.RoleKey ?? string.Empty;
        var companyId = _currentUser.CompanyId ?? Guid.Empty;

        var notifications = await _db.Set<Models.Entities.Notification>()
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        return notifications
            .Where(n => IsTargeted(n, roleKey, companyId))
            .Take(20)
            .Select(n => MapDto(n, userId))
            .ToList();
    }

    public async Task<int> GetUnreadCountAsync()
    {
        var userId = _currentUser.UserId ?? Guid.Empty;
        var roleKey = _currentUser.RoleKey ?? string.Empty;
        var companyId = _currentUser.CompanyId ?? Guid.Empty;

        var notifications = await _db.Set<Models.Entities.Notification>()
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        return notifications
            .Where(n => IsTargeted(n, roleKey, companyId) && !n.IsReadBy.Contains(userId))
            .Count();
    }

    public async Task MarkAllReadAsync()
    {
        var userId = _currentUser.UserId ?? Guid.Empty;
        var roleKey = _currentUser.RoleKey ?? string.Empty;
        var companyId = _currentUser.CompanyId ?? Guid.Empty;

        var notifications = await _db.Set<Models.Entities.Notification>()
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        var unread = notifications
            .Where(n => IsTargeted(n, roleKey, companyId) && !n.IsReadBy.Contains(userId))
            .ToList();

        foreach (var n in unread)
            n.IsReadBy = n.IsReadBy.Append(userId).ToArray();

        if (unread.Count > 0)
            await _db.SaveChangesAsync();
    }

    public async Task MarkOneReadAsync(Guid id)
    {
        var userId = _currentUser.UserId ?? Guid.Empty;
        var notification = await _db.Set<Models.Entities.Notification>().FindAsync(id);
        if (notification == null || notification.IsReadBy.Contains(userId)) return;
        notification.IsReadBy = notification.IsReadBy.Append(userId).ToArray();
        await _db.SaveChangesAsync();
    }

    private static bool IsTargeted(Models.Entities.Notification n, string roleKey, Guid companyId)
    {
        // No targeting = broadcast to all
        if (n.TargetRoleKeys.Length == 0 && n.TargetCompanyIds.Length == 0)
            return true;

        var roleMatch = n.TargetRoleKeys.Length == 0 || n.TargetRoleKeys.Contains(roleKey);
        var companyMatch = n.TargetCompanyIds.Length == 0 || n.TargetCompanyIds.Contains(companyId);
        return roleMatch && companyMatch;
    }

    private static NotificationDto MapDto(Models.Entities.Notification n, Guid userId) => new()
    {
        Id = n.Id,
        Title = n.Title,
        Message = n.Message,
        Level = n.Level,
        CreatedAt = n.CreatedAt.ToString("o"),
        TargetRoleKeys = n.TargetRoleKeys,
        TargetCompanyIds = n.TargetCompanyIds.Select(id => id.ToString()).ToArray(),
        ShipmentRequestId = n.ShipmentRequestId?.ToString(),
        IsRead = n.IsReadBy.Contains(userId),
    };
}
