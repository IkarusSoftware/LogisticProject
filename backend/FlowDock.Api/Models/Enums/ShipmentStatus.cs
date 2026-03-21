namespace FlowDock.Api.Models.Enums;

public enum ShipmentStatus
{
    RequestCreated,
    SentToSupplier,
    SupplierReviewing,
    VehicleAssigned,
    CorrectionRequested,
    VehicleCancelled,
    InControl,
    Approved,
    RampPlanned,
    Arrived,
    Admitted,
    AtRamp,
    Loading,
    Loaded,
    Sealed,
    Exited,
    Completed,
    Rejected,
    Cancelled
}
