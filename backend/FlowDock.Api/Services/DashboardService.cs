using FlowDock.Api.Data;
using FlowDock.Api.Models.DTOs;
using FlowDock.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Services;

public interface IDashboardService
{
    Task<List<DashboardMetricDto>> GetMetricsAsync();
    Task<List<PipelineCountDto>> GetPipelineAsync();
}

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    private static readonly ShipmentStatus[] TerminalStatuses =
    {
        ShipmentStatus.Completed, ShipmentStatus.Rejected,
        ShipmentStatus.Cancelled, ShipmentStatus.VehicleCancelled
    };

    public DashboardService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    private IQueryable<Models.Entities.ShipmentRequest> GetRoleFilteredQuery()
    {
        var query = _db.ShipmentRequests.AsQueryable();
        var role = _currentUser.RoleKey;
        var userId = _currentUser.UserId ?? Guid.Empty;
        var companyId = _currentUser.CompanyId ?? Guid.Empty;

        if (role == "requester")
            query = query.Where(r => r.CreatedBy == userId);
        else if (role == "supplier")
            query = query.Where(r => r.AssignedSupplierCompanyId == companyId);
        else if (role != "admin" && role != "superadmin")
            query = query.Where(r => r.RequesterCompanyId == companyId);

        return query;
    }

    public async Task<List<DashboardMetricDto>> GetMetricsAsync()
    {
        var query = GetRoleFilteredQuery();
        var statuses = await query
            .GroupBy(r => r.CurrentStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        int Count(params ShipmentStatus[] s) => statuses.Where(x => s.Contains(x.Status)).Sum(x => x.Count);

        return new List<DashboardMetricDto>
        {
            new() { Key = "requested", Label = "Talep Edilen Araclar", Value = Count(ShipmentStatus.SentToSupplier, ShipmentStatus.SupplierReviewing, ShipmentStatus.VehicleAssigned, ShipmentStatus.CorrectionRequested), Tone = "info" },
            new() { Key = "readyForLoading", Label = "Yuklemeye Hazir Bekleyenler", Value = Count(ShipmentStatus.Approved, ShipmentStatus.RampPlanned, ShipmentStatus.Arrived, ShipmentStatus.Admitted, ShipmentStatus.AtRamp), Tone = "warning" },
            new() { Key = "loading", Label = "Aktif Yuklenen Araclar", Value = Count(ShipmentStatus.Loading), Tone = "info" },
            new() { Key = "loaded", Label = "Yuklemesi Tamamlananlar", Value = Count(ShipmentStatus.Loaded, ShipmentStatus.Sealed, ShipmentStatus.Exited, ShipmentStatus.Completed), Tone = "success" },
            new() { Key = "correctionQueue", Label = "Revize Bekleyenler", Value = Count(ShipmentStatus.CorrectionRequested), Tone = "warning" },
            new() { Key = "cancelled", Label = "Iptal / Reddedilenler", Value = Count(ShipmentStatus.Cancelled, ShipmentStatus.VehicleCancelled, ShipmentStatus.Rejected), Tone = "danger" },
        };
    }

    public async Task<List<PipelineCountDto>> GetPipelineAsync()
    {
        var query = GetRoleFilteredQuery();
        var statuses = await query
            .GroupBy(r => r.CurrentStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        int Count(ShipmentStatus s) => statuses.FirstOrDefault(x => x.Status == s)?.Count ?? 0;

        return new List<PipelineCountDto>
        {
            new() { Status = "SENT_TO_SUPPLIER", Label = "Tedarikciye Iletildi", Count = Count(ShipmentStatus.SentToSupplier) + Count(ShipmentStatus.SupplierReviewing) },
            new() { Status = "CORRECTION_REQUESTED", Label = "Duzeltme Talebi Var", Count = Count(ShipmentStatus.CorrectionRequested) },
            new() { Status = "VEHICLE_ASSIGNED", Label = "Arac Kaydi Yapildi", Count = Count(ShipmentStatus.VehicleAssigned) + Count(ShipmentStatus.InControl) + Count(ShipmentStatus.Approved) },
            new() { Status = "RAMP_PLANNED", Label = "Rampaya Cagrildi", Count = Count(ShipmentStatus.RampPlanned) + Count(ShipmentStatus.Arrived) + Count(ShipmentStatus.Admitted) + Count(ShipmentStatus.AtRamp) },
            new() { Status = "LOADING", Label = "Yukleniyor", Count = Count(ShipmentStatus.Loading) },
            new() { Status = "LOADED", Label = "Yuklemesi Tamamlandi", Count = Count(ShipmentStatus.Loaded) + Count(ShipmentStatus.Sealed) + Count(ShipmentStatus.Exited) },
            new() { Status = "COMPLETED", Label = "Tamamlandi", Count = Count(ShipmentStatus.Completed) },
        };
    }
}
