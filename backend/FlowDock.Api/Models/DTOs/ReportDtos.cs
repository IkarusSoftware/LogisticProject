namespace FlowDock.Api.Models.DTOs;

public class ReportDurationsDto
{
    public double AverageApprovalMinutes { get; set; }
    public double AverageGateMinutes { get; set; }
    public double AverageLoadingMinutes { get; set; }
}

public class CompanyPerformanceDto
{
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Completed { get; set; }
    public int Rejected { get; set; }
    public double CompletionRate { get; set; }
}

public class LocationIntensityDto
{
    public Guid LocationId { get; set; }
    public string LocationName { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Active { get; set; }
}

public class RampUsageDto
{
    public Guid RampId { get; set; }
    public string RampCode { get; set; } = string.Empty;
    public string RampName { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public int AssignmentCount { get; set; }
    public string? CurrentShipmentRequestNo { get; set; }
}
