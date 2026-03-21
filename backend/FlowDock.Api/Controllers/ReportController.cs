using FlowDock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowDock.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("durations")]
    public async Task<IActionResult> GetDurations()
    {
        var result = await _reportService.GetDurationsAsync();
        return Ok(result);
    }

    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanyPerformance()
    {
        var result = await _reportService.GetCompanyPerformanceAsync();
        return Ok(result);
    }

    [HttpGet("locations")]
    public async Task<IActionResult> GetLocationIntensity()
    {
        var result = await _reportService.GetLocationIntensityAsync();
        return Ok(result);
    }

    [HttpGet("ramps")]
    public async Task<IActionResult> GetRampUsage()
    {
        var result = await _reportService.GetRampUsageAsync();
        return Ok(result);
    }
}
