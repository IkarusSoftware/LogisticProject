namespace FlowDock.Api.Models.DTOs;

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

public class OperationResult
{
    public bool Ok { get; set; }
    public string Message { get; set; } = string.Empty;

    public static OperationResult Success(string message = "Basarili") => new() { Ok = true, Message = message };
    public static OperationResult Fail(string message) => new() { Ok = false, Message = message };
}
