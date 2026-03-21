namespace FlowDock.Api.Models.DTOs;

// ── Response DTOs ──

public class ShipmentListDto
{
    public Guid Id { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public string CurrentStatus { get; set; } = string.Empty;
    public string RequesterCompanyName { get; set; } = string.Empty;
    public string SupplierCompanyName { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public string VehicleType { get; set; } = string.Empty;
    public string LoadDate { get; set; } = string.Empty;
    public string LoadTime { get; set; } = string.Empty;
    public string ProductInfo { get; set; } = string.Empty;
    public string QuantityInfo { get; set; } = string.Empty;
    public string? TractorPlate { get; set; }
    public string? DriverName { get; set; }
    public string? RampCode { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class ShipmentDetailDto
{
    public Guid Id { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public string CurrentStatus { get; set; } = string.Empty;
    public Guid RequesterCompanyId { get; set; }
    public string RequesterCompanyName { get; set; } = string.Empty;
    public Guid AssignedSupplierCompanyId { get; set; }
    public string SupplierCompanyName { get; set; } = string.Empty;
    public Guid TargetLocationId { get; set; }
    public string LocationName { get; set; } = string.Empty;
    public string VehicleType { get; set; } = string.Empty;
    public string RequestDate { get; set; } = string.Empty;
    public string LoadDate { get; set; } = string.Empty;
    public string LoadTime { get; set; } = string.Empty;
    public string QuantityInfo { get; set; } = string.Empty;
    public string ProductInfo { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
    public Guid CreatedBy { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;

    public VehicleAssignmentDto? VehicleAssignment { get; set; }
    public RampAssignmentDto? RampAssignment { get; set; }
    public GateOperationDto? GateOperation { get; set; }
    public LoadingOperationDto? LoadingOperation { get; set; }
}

public class VehicleAssignmentDto
{
    public Guid Id { get; set; }
    public string TractorPlate { get; set; } = string.Empty;
    public string TrailerPlate { get; set; } = string.Empty;
    public string DriverFirstName { get; set; } = string.Empty;
    public string DriverLastName { get; set; } = string.Empty;
    public string DriverPhone { get; set; } = string.Empty;
    public string AssignmentStatus { get; set; } = string.Empty;
    public string AssignedAt { get; set; } = string.Empty;
    public string? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }
}

public class RampAssignmentDto
{
    public Guid Id { get; set; }
    public Guid RampId { get; set; }
    public string RampCode { get; set; } = string.Empty;
    public string RampName { get; set; } = string.Empty;
    public string AssignedAt { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class GateOperationDto
{
    public Guid Id { get; set; }
    public string? ArrivedAt { get; set; }
    public string? AdmittedAt { get; set; }
    public string? RampTakenAt { get; set; }
    public string? Notes { get; set; }
}

public class LoadingOperationDto
{
    public Guid Id { get; set; }
    public string? StartedAt { get; set; }
    public string? CompletedAt { get; set; }
    public string? SealNumber { get; set; }
    public string? SealedAt { get; set; }
    public string? ExitAt { get; set; }
    public string? Notes { get; set; }
}

public class StatusHistoryDto
{
    public Guid Id { get; set; }
    public string OldStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string ChangedByName { get; set; } = string.Empty;
    public string ChangedAt { get; set; } = string.Empty;
    public string? Note { get; set; }
}

// ── Request DTOs ──

public class CreateShipmentRequest
{
    public Guid TargetLocationId { get; set; }
    public Guid AssignedSupplierCompanyId { get; set; }
    public string VehicleType { get; set; } = string.Empty;
    public string RequestDate { get; set; } = string.Empty;
    public string LoadDate { get; set; } = string.Empty;
    public string LoadTime { get; set; } = string.Empty;
    public string QuantityInfo { get; set; } = string.Empty;
    public string ProductInfo { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}

public class CreateShipmentBatchRequest
{
    public List<CreateShipmentRequest> Items { get; set; } = new();
}

public class ReviseShipmentInput
{
    public string VehicleType { get; set; } = string.Empty;
    public string LoadTime { get; set; } = string.Empty;
}

public class CancelShipmentInput
{
    public string? Note { get; set; }
}

public class VehicleAssignmentInput
{
    public string TractorPlate { get; set; } = string.Empty;
    public string TrailerPlate { get; set; } = string.Empty;
    public string DriverFirstName { get; set; } = string.Empty;
    public string DriverLastName { get; set; } = string.Empty;
    public string DriverPhone { get; set; } = string.Empty;
}

public class ReviewDecisionInput
{
    public string Decision { get; set; } = string.Empty;   // "approve" or "reject"
    public string Note { get; set; } = string.Empty;
}

public class RampPlanningInput
{
    public Guid RampId { get; set; }
    public string? Note { get; set; }
}

public class GateActionInput
{
    public string Action { get; set; } = string.Empty;     // "arrive", "admit", "takeToRamp", "startLoading"
    public string? Note { get; set; }
}

public class LoadingCompletionInput
{
    public string SealNumber { get; set; } = string.Empty;
    public string? Note { get; set; }
}

public class ShipmentFilterRequest
{
    public string? Status { get; set; }
    public bool? Terminal { get; set; }
    public Guid? LocationId { get; set; }
    public Guid? SupplierId { get; set; }
    public string? VehicleType { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
