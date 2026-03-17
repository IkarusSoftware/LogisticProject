namespace FlowDock.Api.Infrastructure;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "FlowDock.Api";
    public string Audience { get; set; } = "FlowDock.Client";
    public int AccessTokenExpirationMinutes { get; set; } = 60;
    public int RefreshTokenExpirationDays { get; set; } = 7;
}
