using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using FlowDock.Api.Models;
using FlowDock.Api.Models.DTOs;

namespace FlowDock.Api.Services;

public interface IAuditFileLogger
{
    Task WriteAsync(AuditLogEntry entry);
    Task<PagedResult<AuditLogDto>> ReadAsync(AuditLogFilterRequest filter);
    Task<AuditLogDto?> GetByIdAsync(string id);
    Task<List<AuditLogDto>> ReadForExportAsync(AuditLogFilterRequest filter);
    Task<List<AuditLogStatsDto>> GetStatsAsync();
}

public class AuditFileLogger : IAuditFileLogger
{
    private readonly string _baseDir;
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public AuditFileLogger(IConfiguration configuration)
    {
        _baseDir = Path.Combine(AppContext.BaseDirectory, "logs", "audit");
        Directory.CreateDirectory(_baseDir);
    }

    private string GetFilePath(DateTime date) =>
        Path.Combine(_baseDir, $"audit-{date:yyyyMMdd}.jsonl");

    // ── WRITE ──

    public async Task WriteAsync(AuditLogEntry entry)
    {
        if (string.IsNullOrEmpty(entry.Id))
            entry.Id = Guid.NewGuid().ToString();

        var line = JsonSerializer.Serialize(entry, JsonOptions);
        var filePath = GetFilePath(entry.PerformedAt);

        await _writeLock.WaitAsync();
        try
        {
            await File.AppendAllTextAsync(filePath, line + Environment.NewLine);
        }
        finally
        {
            _writeLock.Release();
        }
    }

    // ── READ ──

    public async Task<PagedResult<AuditLogDto>> ReadAsync(AuditLogFilterRequest filter)
    {
        var allEntries = await ReadEntriesAsync(filter.DateFrom, filter.DateTo);
        var filtered = ApplyFilters(allEntries, filter);

        var sorted = ApplySorting(filtered, filter.SortBy, filter.SortDirection);
        var totalCount = sorted.Count;
        var pageSize = Math.Min(filter.PageSize, 100);
        var items = sorted
            .Skip((filter.Page - 1) * pageSize)
            .Take(pageSize)
            .Select(MapToDto)
            .ToList();

        return new PagedResult<AuditLogDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = pageSize,
        };
    }

    public async Task<AuditLogDto?> GetByIdAsync(string id)
    {
        // Search all files (most recent first) for the entry
        var files = GetAllFiles();
        foreach (var file in files)
        {
            var entries = await ReadFileAsync(file);
            var entry = entries.FirstOrDefault(e => e.Id == id);
            if (entry != null)
                return MapToDto(entry);
        }
        return null;
    }

    public async Task<List<AuditLogDto>> ReadForExportAsync(AuditLogFilterRequest filter)
    {
        var allEntries = await ReadEntriesAsync(filter.DateFrom, filter.DateTo);
        var filtered = ApplyFilters(allEntries, filter);
        var sorted = ApplySorting(filtered, filter.SortBy, filter.SortDirection);

        return sorted.Take(10000).Select(MapToDto).ToList();
    }

    public async Task<List<AuditLogStatsDto>> GetStatsAsync()
    {
        var allEntries = await ReadEntriesAsync(null, null);
        return allEntries
            .GroupBy(e => e.ActionType)
            .Select(g => new AuditLogStatsDto
            {
                ActionType = g.Key,
                Count = g.Count(),
            })
            .OrderByDescending(s => s.Count)
            .ToList();
    }

    // ── PRIVATE HELPERS ──

    private List<string> GetAllFiles()
    {
        if (!Directory.Exists(_baseDir))
            return new List<string>();

        return Directory.GetFiles(_baseDir, "audit-*.jsonl")
            .OrderByDescending(f => f)
            .ToList();
    }

    private List<string> GetFilesForDateRange(DateTime? from, DateTime? to)
    {
        var allFiles = GetAllFiles();
        if (from == null && to == null)
            return allFiles;

        return allFiles.Where(f =>
        {
            var fileName = Path.GetFileNameWithoutExtension(f);
            var datePart = fileName.Replace("audit-", "");
            if (DateTime.TryParseExact(datePart, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fileDate))
            {
                if (from.HasValue && fileDate.Date < from.Value.Date)
                    return false;
                if (to.HasValue && fileDate.Date > to.Value.Date)
                    return false;
                return true;
            }
            return false;
        }).ToList();
    }

    private async Task<List<AuditLogEntry>> ReadEntriesAsync(DateTime? from, DateTime? to)
    {
        var files = GetFilesForDateRange(from, to);
        var allEntries = new List<AuditLogEntry>();

        foreach (var file in files)
        {
            var entries = await ReadFileAsync(file);
            allEntries.AddRange(entries);
        }

        return allEntries;
    }

    private static async Task<List<AuditLogEntry>> ReadFileAsync(string filePath)
    {
        var entries = new List<AuditLogEntry>();
        if (!File.Exists(filePath))
            return entries;

        var lines = await File.ReadAllLinesAsync(filePath);
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            try
            {
                var entry = JsonSerializer.Deserialize<AuditLogEntry>(line, JsonOptions);
                if (entry != null)
                    entries.Add(entry);
            }
            catch
            {
                // Skip malformed lines
            }
        }

        return entries;
    }

    private static List<AuditLogEntry> ApplyFilters(List<AuditLogEntry> entries, AuditLogFilterRequest filter)
    {
        var query = entries.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(filter.EntityType))
            query = query.Where(e => e.EntityType == filter.EntityType);

        if (!string.IsNullOrWhiteSpace(filter.ActionType))
            query = query.Where(e => e.ActionType == filter.ActionType);

        if (filter.PerformedByUserId.HasValue)
            query = query.Where(e => e.PerformedByUserId == filter.PerformedByUserId.Value);

        if (filter.DateFrom.HasValue)
            query = query.Where(e => e.PerformedAt >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(e => e.PerformedAt <= filter.DateTo.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.ToLower();
            query = query.Where(e =>
                e.Description.ToLower().Contains(search) ||
                e.EntityId.ToLower().Contains(search) ||
                e.OldValue.ToLower().Contains(search) ||
                e.NewValue.ToLower().Contains(search));
        }

        return query.ToList();
    }

    private static List<AuditLogEntry> ApplySorting(List<AuditLogEntry> entries, string sortBy, string direction)
    {
        var desc = direction.Equals("desc", StringComparison.OrdinalIgnoreCase);
        return sortBy.ToLower() switch
        {
            "entitytype" => desc
                ? entries.OrderByDescending(e => e.EntityType).ToList()
                : entries.OrderBy(e => e.EntityType).ToList(),
            "actiontype" => desc
                ? entries.OrderByDescending(e => e.ActionType).ToList()
                : entries.OrderBy(e => e.ActionType).ToList(),
            _ => desc
                ? entries.OrderByDescending(e => e.PerformedAt).ToList()
                : entries.OrderBy(e => e.PerformedAt).ToList(),
        };
    }

    private static AuditLogDto MapToDto(AuditLogEntry entry) => new()
    {
        Id = Guid.TryParse(entry.Id, out var guid) ? guid : Guid.Empty,
        EntityType = entry.EntityType,
        EntityId = entry.EntityId,
        ActionType = entry.ActionType,
        OldValue = entry.OldValue,
        NewValue = entry.NewValue,
        Description = entry.Description,
        PerformedByUserId = entry.PerformedByUserId,
        PerformedByName = entry.PerformedByName,
        PerformedAt = entry.PerformedAt,
    };
}
