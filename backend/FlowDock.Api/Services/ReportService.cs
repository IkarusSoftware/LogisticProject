using FlowDock.Api.Data;
using FlowDock.Api.Models.DTOs;
using FlowDock.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Services;

public interface IReportService
{
    Task<ReportDurationsDto> GetDurationsAsync();
    Task<List<CompanyPerformanceDto>> GetCompanyPerformanceAsync();
    Task<List<LocationIntensityDto>> GetLocationIntensityAsync();
    Task<List<RampUsageDto>> GetRampUsageAsync();
}

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    private static readonly ShipmentStatus[] TerminalStatuses =
    {
        ShipmentStatus.Completed, ShipmentStatus.Rejected,
        ShipmentStatus.Cancelled, ShipmentStatus.VehicleCancelled
    };

    public ReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ReportDurationsDto> GetDurationsAsync()
    {
        var completed = await _db.ShipmentRequests
            .Where(r => r.CurrentStatus == ShipmentStatus.Completed)
            .Include(r => r.GateOperation)
            .Include(r => r.LoadingOperation)
            .Include(r => r.VehicleAssignment)
            .ToListAsync();

        double avgApproval = 0, avgGate = 0, avgLoading = 0;

        if (completed.Count > 0)
        {
            // Approval time: created → vehicle approved
            var approvalTimes = completed
                .Where(r => r.VehicleAssignment?.ApprovedAt != null)
                .Select(r => (r.VehicleAssignment!.ApprovedAt!.Value - r.CreatedAt).TotalMinutes)
                .ToList();
            if (approvalTimes.Count > 0) avgApproval = approvalTimes.Average();

            // Gate time: arrived → ramp taken
            var gateTimes = completed
                .Where(r => r.GateOperation?.ArrivedAt != null && r.GateOperation?.RampTakenAt != null)
                .Select(r => (r.GateOperation!.RampTakenAt!.Value - r.GateOperation!.ArrivedAt!.Value).TotalMinutes)
                .ToList();
            if (gateTimes.Count > 0) avgGate = gateTimes.Average();

            // Loading time: started → completed
            var loadingTimes = completed
                .Where(r => r.LoadingOperation?.StartedAt != null && r.LoadingOperation?.CompletedAt != null)
                .Select(r => (r.LoadingOperation!.CompletedAt!.Value - r.LoadingOperation!.StartedAt!.Value).TotalMinutes)
                .ToList();
            if (loadingTimes.Count > 0) avgLoading = loadingTimes.Average();
        }

        return new ReportDurationsDto
        {
            AverageApprovalMinutes = Math.Round(avgApproval, 1),
            AverageGateMinutes = Math.Round(avgGate, 1),
            AverageLoadingMinutes = Math.Round(avgLoading, 1),
        };
    }

    public async Task<List<CompanyPerformanceDto>> GetCompanyPerformanceAsync()
    {
        return await _db.ShipmentRequests
            .Include(r => r.AssignedSupplierCompany)
            .GroupBy(r => new { r.AssignedSupplierCompanyId, r.AssignedSupplierCompany.Name })
            .Select(g => new CompanyPerformanceDto
            {
                CompanyId = g.Key.AssignedSupplierCompanyId,
                CompanyName = g.Key.Name,
                Total = g.Count(),
                Completed = g.Count(r => r.CurrentStatus == ShipmentStatus.Completed),
                Rejected = g.Count(r => r.CurrentStatus == ShipmentStatus.Rejected),
                CompletionRate = g.Count() > 0
                    ? Math.Round((double)g.Count(r => r.CurrentStatus == ShipmentStatus.Completed) / g.Count() * 100, 1)
                    : 0,
            })
            .OrderByDescending(c => c.Total)
            .ToListAsync();
    }

    public async Task<List<LocationIntensityDto>> GetLocationIntensityAsync()
    {
        return await _db.ShipmentRequests
            .Include(r => r.TargetLocation)
            .GroupBy(r => new { r.TargetLocationId, r.TargetLocation.Name })
            .Select(g => new LocationIntensityDto
            {
                LocationId = g.Key.TargetLocationId,
                LocationName = g.Key.Name,
                Total = g.Count(),
                Active = g.Count(r => !TerminalStatuses.Contains(r.CurrentStatus)),
            })
            .OrderByDescending(l => l.Total)
            .ToListAsync();
    }

    public async Task<List<RampUsageDto>> GetRampUsageAsync()
    {
        var ramps = await _db.Set<Models.Entities.Ramp>()
            .Include(r => r.Location)
            .Where(r => r.IsActive)
            .ToListAsync();

        var activeAssignments = await _db.Set<Models.Entities.RampAssignment>()
            .Include(ra => ra.ShipmentRequest)
            .Where(ra => !TerminalStatuses.Contains(ra.ShipmentRequest.CurrentStatus))
            .ToListAsync();

        var allAssignments = await _db.Set<Models.Entities.RampAssignment>()
            .GroupBy(ra => ra.RampId)
            .Select(g => new { RampId = g.Key, Count = g.Count() })
            .ToListAsync();

        return ramps.Select(ramp =>
        {
            var active = activeAssignments.FirstOrDefault(a => a.RampId == ramp.Id);
            var totalCount = allAssignments.FirstOrDefault(a => a.RampId == ramp.Id)?.Count ?? 0;
            return new RampUsageDto
            {
                RampId = ramp.Id,
                RampCode = ramp.Code,
                RampName = ramp.Name,
                LocationName = ramp.Location.Name,
                AssignmentCount = totalCount,
                CurrentShipmentRequestNo = active?.ShipmentRequest?.RequestNo,
            };
        }).OrderBy(r => r.LocationName).ThenBy(r => r.RampCode).ToList();
    }
}
