using System.Globalization;
using CsvHelper;
using FlowDock.Api.Models.DTOs;
using FlowDock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowDock.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = "SuperAdmin")]
public class AuditLogController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] AuditLogFilterRequest filter)
    {
        var result = await _auditLogService.GetLogsAsync(filter);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var log = await _auditLogService.GetByIdAsync(id);
        if (log == null)
            return NotFound();

        return Ok(log);
    }

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] AuditLogFilterRequest filter)
    {
        var logs = await _auditLogService.GetExportLogsAsync(filter);

        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        csv.WriteRecords(logs);
        await writer.FlushAsync();

        return File(memoryStream.ToArray(), "text/csv", $"audit-logs-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _auditLogService.GetStatsAsync();
        return Ok(stats);
    }
}
