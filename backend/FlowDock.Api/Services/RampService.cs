using FlowDock.Api.Data;
using FlowDock.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Services;

public interface IRampService
{
    Task<List<object>> GetRampsByLocationAsync(Guid locationId);
    Task<List<object>> GetRampOccupancyAsync();
}

public class RampService : IRampService
{
    private readonly AppDbContext _db;

    private static readonly ShipmentStatus[] TerminalStatuses =
    {
        ShipmentStatus.Completed, ShipmentStatus.Rejected,
        ShipmentStatus.Cancelled, ShipmentStatus.VehicleCancelled
    };

    public RampService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<object>> GetRampsByLocationAsync(Guid locationId)
    {
        var ramps = await _db.Set<Models.Entities.Ramp>()
            .Where(r => r.LocationId == locationId && r.IsActive)
            .OrderBy(r => r.Code)
            .Select(r => new
            {
                id = r.Id,
                code = r.Code,
                name = r.Name,
                status = r.Status.ToString().ToLower(),
                isActive = r.IsActive,
            })
            .ToListAsync();

        return ramps.Cast<object>().ToList();
    }

    public async Task<List<object>> GetRampOccupancyAsync()
    {
        var ramps = await _db.Set<Models.Entities.Ramp>()
            .Include(r => r.Location)
            .Where(r => r.IsActive)
            .ToListAsync();

        var activeAssignments = await _db.Set<Models.Entities.RampAssignment>()
            .Include(ra => ra.ShipmentRequest)
            .Where(ra => !TerminalStatuses.Contains(ra.ShipmentRequest.CurrentStatus))
            .ToListAsync();

        return ramps.Select(ramp =>
        {
            var active = activeAssignments.FirstOrDefault(a => a.RampId == ramp.Id);
            return (object)new
            {
                rampId = ramp.Id,
                rampCode = ramp.Code,
                rampName = ramp.Name,
                locationName = ramp.Location.Name,
                isOccupied = active != null,
                shipmentRequestNo = active?.ShipmentRequest?.RequestNo,
                shipmentRequestId = active?.ShipmentRequestId,
            };
        }).ToList();
    }
}
