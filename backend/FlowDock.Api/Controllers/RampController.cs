using FlowDock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowDock.Api.Controllers;

[ApiController]
[Route("api/ramps")]
[Authorize]
public class RampController : ControllerBase
{
    private readonly IRampService _rampService;

    public RampController(IRampService rampService)
    {
        _rampService = rampService;
    }

    [HttpGet("by-location/{locationId:guid}")]
    public async Task<IActionResult> GetByLocation(Guid locationId)
    {
        var ramps = await _rampService.GetRampsByLocationAsync(locationId);
        return Ok(ramps);
    }

    [HttpGet("occupancy")]
    public async Task<IActionResult> GetOccupancy()
    {
        var occupancy = await _rampService.GetRampOccupancyAsync();
        return Ok(occupancy);
    }
}
