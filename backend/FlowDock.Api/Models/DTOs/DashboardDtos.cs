namespace FlowDock.Api.Models.DTOs;

public class DashboardMetricDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Value { get; set; }
    public string Tone { get; set; } = "neutral";
}

public class PipelineCountDto
{
    public string Status { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
}
