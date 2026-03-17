using FlowDock.Api.Data;
using FlowDock.Api.Models.DTOs;
using FlowDock.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Services;

public interface IAdminService
{
    Task<List<CompanyAdminDto>> GetCompaniesAsync();
    Task<OperationResult> ToggleCompanyStatusAsync(Guid id);
    Task<List<RampAdminDto>> GetRampsAsync();
    Task<OperationResult> ToggleRampActiveAsync(Guid id);
}

public class CompanyAdminDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class RampAdminDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class AdminService : IAdminService
{
    private readonly AppDbContext _db;

    public AdminService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<CompanyAdminDto>> GetCompaniesAsync()
    {
        return await _db.Set<Models.Entities.Company>()
            .OrderBy(c => c.Name)
            .Select(c => new CompanyAdminDto
            {
                Id = c.Id.ToString(),
                Name = c.Name,
                Type = c.Type.ToString().ToUpper(),
                Status = c.Status == RecordStatus.Active ? "ACTIVE" : "PASSIVE",
            })
            .ToListAsync();
    }

    public async Task<OperationResult> ToggleCompanyStatusAsync(Guid id)
    {
        var company = await _db.Set<Models.Entities.Company>().FindAsync(id);
        if (company == null)
            return OperationResult.Fail("Firma bulunamadi.");

        company.Status = company.Status == RecordStatus.Active ? RecordStatus.Passive : RecordStatus.Active;
        company.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var statusLabel = company.Status == RecordStatus.Active ? "aktif" : "pasif";
        return OperationResult.Success($"{company.Name} {statusLabel} yapildi.");
    }

    public async Task<List<RampAdminDto>> GetRampsAsync()
    {
        return await _db.Set<Models.Entities.Ramp>()
            .Include(r => r.Location)
            .OrderBy(r => r.Code)
            .Select(r => new RampAdminDto
            {
                Id = r.Id.ToString(),
                Code = r.Code,
                Name = r.Name,
                LocationName = r.Location.Name,
                IsActive = r.IsActive,
            })
            .ToListAsync();
    }

    public async Task<OperationResult> ToggleRampActiveAsync(Guid id)
    {
        var ramp = await _db.Set<Models.Entities.Ramp>().FindAsync(id);
        if (ramp == null)
            return OperationResult.Fail("Rampa bulunamadi.");

        ramp.IsActive = !ramp.IsActive;
        await _db.SaveChangesAsync();

        var statusLabel = ramp.IsActive ? "aktif" : "pasif";
        return OperationResult.Success($"{ramp.Code} rampasi {statusLabel} yapildi.");
    }
}
