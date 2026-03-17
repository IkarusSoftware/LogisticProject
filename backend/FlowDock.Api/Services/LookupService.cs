using FlowDock.Api.Data;
using FlowDock.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Services;

public interface ILookupService
{
    Task<List<LookupCompanyDto>> GetCompaniesAsync();
    Task<List<LookupRoleDto>> GetRolesAsync();
    Task<List<LookupUserDto>> GetUsersAsync();
    Task<List<LookupLocationDto>> GetLocationsAsync();
    Task<List<LookupRampDto>> GetRampsAsync();
    Task<LookupSettingsDto?> GetSettingsAsync();
    Task<BootstrapDto> GetBootstrapAsync();
}

public class LookupService : ILookupService
{
    private readonly AppDbContext _db;

    public LookupService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<LookupCompanyDto>> GetCompaniesAsync()
    {
        return await _db.Companies
            .OrderBy(c => c.Name)
            .Select(c => new LookupCompanyDto(
                c.Id,
                c.Name,
                c.Type.ToString().ToLower(),
                c.Status.ToString().ToUpper(),
                c.CreatedAt,
                c.UpdatedAt
            ))
            .ToListAsync();
    }

    public async Task<List<LookupRoleDto>> GetRolesAsync()
    {
        return await _db.Roles
            .OrderBy(r => r.Name)
            .Select(r => new LookupRoleDto(
                r.Id,
                r.Key.ToString().ToLower(),
                r.Name,
                r.Permissions
            ))
            .ToListAsync();
    }

    public async Task<List<LookupUserDto>> GetUsersAsync()
    {
        return await _db.Users
            .Include(u => u.Role)
            .OrderBy(u => u.FirstName)
            .Select(u => new LookupUserDto(
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.Phone,
                u.RoleId,
                u.Role.Key.ToString().ToLower(),
                u.CompanyId,
                u.IsActive
            ))
            .ToListAsync();
    }

    public async Task<List<LookupLocationDto>> GetLocationsAsync()
    {
        return await _db.Locations
            .OrderBy(l => l.Name)
            .Select(l => new LookupLocationDto(
                l.Id,
                l.Name,
                l.Address,
                l.CompanyId,
                l.IsActive
            ))
            .ToListAsync();
    }

    public async Task<List<LookupRampDto>> GetRampsAsync()
    {
        return await _db.Ramps
            .OrderBy(r => r.Code)
            .Select(r => new LookupRampDto(
                r.Id,
                r.LocationId,
                r.Code,
                r.Name,
                r.Status.ToString().ToUpper(),
                r.IsActive
            ))
            .ToListAsync();
    }

    public async Task<LookupSettingsDto?> GetSettingsAsync()
    {
        var s = await _db.SystemSettings.FirstOrDefaultAsync();
        if (s == null) return null;

        return new LookupSettingsDto(
            s.Id,
            s.CompanyName,
            s.WorkStartHour,
            s.WorkEndHour,
            s.MaxDailyShipments,
            s.DefaultVehicleType.ToString().ToUpper(),
            s.NotificationsEnabled,
            s.AutoAssignRamp,
            s.MaintenanceMode
        );
    }

    public async Task<BootstrapDto> GetBootstrapAsync()
    {
        var companies = await GetCompaniesAsync();
        var roles = await GetRolesAsync();
        var users = await GetUsersAsync();
        var locations = await GetLocationsAsync();
        var ramps = await GetRampsAsync();
        var settings = await GetSettingsAsync();

        return new BootstrapDto(
            companies,
            roles,
            users,
            locations,
            ramps,
            settings!
        );
    }
}
