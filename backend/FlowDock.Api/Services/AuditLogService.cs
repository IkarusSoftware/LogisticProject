using FlowDock.Api.Models.DTOs;

namespace FlowDock.Api.Services;

public interface IAuditLogService
{
    Task<PagedResult<AuditLogDto>> GetLogsAsync(AuditLogFilterRequest filter);
    Task<AuditLogDto?> GetByIdAsync(Guid id);
    Task<List<AuditLogDto>> GetExportLogsAsync(AuditLogFilterRequest filter);
    Task<List<AuditLogStatsDto>> GetStatsAsync();
}

public class AuditLogService : IAuditLogService
{
    private readonly IAuditFileLogger _fileLogger;

    public AuditLogService(IAuditFileLogger fileLogger)
    {
        _fileLogger = fileLogger;
    }

    public Task<PagedResult<AuditLogDto>> GetLogsAsync(AuditLogFilterRequest filter)
        => _fileLogger.ReadAsync(filter);

    public async Task<AuditLogDto?> GetByIdAsync(Guid id)
        => await _fileLogger.GetByIdAsync(id.ToString());

    public Task<List<AuditLogDto>> GetExportLogsAsync(AuditLogFilterRequest filter)
        => _fileLogger.ReadForExportAsync(filter);

    public Task<List<AuditLogStatsDto>> GetStatsAsync()
        => _fileLogger.GetStatsAsync();
}
