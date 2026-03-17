namespace FlowDock.Api.Models.DTOs;

public record LookupLocationDto(
    Guid Id,
    string Name,
    string Address,
    Guid CompanyId,
    bool IsActive
);

public record LookupRampDto(
    Guid Id,
    Guid LocationId,
    string Code,
    string Name,
    string Status,
    bool IsActive
);

public record LookupUserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    Guid RoleId,
    string RoleKey,
    Guid CompanyId,
    bool IsActive
);

public record LookupSettingsDto(
    Guid Id,
    string CompanyName,
    string WorkStartHour,
    string WorkEndHour,
    int MaxDailyShipments,
    string DefaultVehicleType,
    bool NotificationsEnabled,
    bool AutoAssignRamp,
    bool MaintenanceMode
);

public record LookupRoleDto(
    Guid Id,
    string Key,
    string Name,
    string[] Permissions
);

public record LookupCompanyDto(
    Guid Id,
    string Name,
    string Type,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record BootstrapDto(
    List<LookupCompanyDto> Companies,
    List<LookupRoleDto> Roles,
    List<LookupUserDto> Users,
    List<LookupLocationDto> Locations,
    List<LookupRampDto> Ramps,
    LookupSettingsDto Settings
);
