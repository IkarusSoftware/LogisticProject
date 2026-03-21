using System.Text.Json;
using System.Text.RegularExpressions;
using FlowDock.Api.Data;
using FlowDock.Api.Models.DTOs;
using FlowDock.Api.Models.Entities;
using FlowDock.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Services;

public interface IShipmentService
{
    // Mutations
    Task<OperationResult> CreateAsync(CreateShipmentRequest dto);
    Task<OperationResult> CreateBatchAsync(CreateShipmentBatchRequest dto);
    Task<OperationResult> ReviseAsync(Guid id, ReviseShipmentInput dto);
    Task<OperationResult> CancelAsync(Guid id, CancelShipmentInput dto);
    Task<OperationResult> CancelVehicleAsync(Guid id);
    Task<OperationResult> BeginSupplierReviewAsync(Guid id);
    Task<OperationResult> SubmitVehicleAssignmentAsync(Guid id, VehicleAssignmentInput dto);
    Task<OperationResult> AcceptSecurityCorrectionAsync(Guid id);
    Task<OperationResult> RequestSecurityCorrectionAsync(Guid id, string note);
    Task<OperationResult> RegisterVehicleRecordAsync(Guid id, string? note);
    Task<OperationResult> ReviewVehicleAssignmentAsync(Guid id, ReviewDecisionInput dto);
    Task<OperationResult> AssignRampAsync(Guid id, RampPlanningInput dto);
    Task<OperationResult> RecordGateActionAsync(Guid id, GateActionInput dto);
    Task<OperationResult> FinalizeLoadingAsync(Guid id, LoadingCompletionInput dto);
    Task<OperationResult> ClearActiveAsync();

    // Reads
    Task<PagedResult<ShipmentListDto>> GetListAsync(ShipmentFilterRequest filter);
    Task<ShipmentDetailDto?> GetDetailAsync(Guid id);
    Task<List<StatusHistoryDto>> GetStatusHistoryAsync(Guid id);
    Task<List<AuditLogDto>> GetShipmentAuditLogsAsync(Guid id);
}

public partial class ShipmentService : IShipmentService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditFileLogger _auditFileLogger;

    public ShipmentService(AppDbContext db, ICurrentUserService currentUser, IAuditFileLogger auditFileLogger)
    {
        _db = db;
        _currentUser = currentUser;
        _auditFileLogger = auditFileLogger;
    }

    // ── Status Helpers ──

    private static readonly ShipmentStatus[] TerminalStatuses =
    {
        ShipmentStatus.Completed, ShipmentStatus.Rejected,
        ShipmentStatus.Cancelled, ShipmentStatus.VehicleCancelled
    };

    private static readonly ShipmentStatus[] NotCancellable =
    {
        ShipmentStatus.Completed, ShipmentStatus.Rejected,
        ShipmentStatus.Cancelled, ShipmentStatus.VehicleCancelled,
        ShipmentStatus.AtRamp, ShipmentStatus.Loading,
        ShipmentStatus.Loaded, ShipmentStatus.Sealed, ShipmentStatus.Exited
    };

    private static bool IsTerminal(ShipmentStatus s) => TerminalStatuses.Contains(s);

    private static string ToFrontend(ShipmentStatus s) => s switch
    {
        ShipmentStatus.RequestCreated => "REQUEST_CREATED",
        ShipmentStatus.SentToSupplier => "SENT_TO_SUPPLIER",
        ShipmentStatus.SupplierReviewing => "SUPPLIER_REVIEWING",
        ShipmentStatus.VehicleAssigned => "VEHICLE_ASSIGNED",
        ShipmentStatus.CorrectionRequested => "CORRECTION_REQUESTED",
        ShipmentStatus.VehicleCancelled => "VEHICLE_CANCELLED",
        ShipmentStatus.InControl => "IN_CONTROL",
        ShipmentStatus.Approved => "APPROVED",
        ShipmentStatus.RampPlanned => "RAMP_PLANNED",
        ShipmentStatus.Arrived => "ARRIVED",
        ShipmentStatus.Admitted => "ADMITTED",
        ShipmentStatus.AtRamp => "AT_RAMP",
        ShipmentStatus.Loading => "LOADING",
        ShipmentStatus.Loaded => "LOADED",
        ShipmentStatus.Sealed => "SEALED",
        ShipmentStatus.Exited => "EXITED",
        ShipmentStatus.Completed => "COMPLETED",
        ShipmentStatus.Rejected => "REJECTED",
        ShipmentStatus.Cancelled => "CANCELLED",
        _ => s.ToString().ToUpper()
    };

    private static ShipmentStatus? ParseStatus(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        // Try PascalCase first, then map from SCREAMING_SNAKE
        if (Enum.TryParse<ShipmentStatus>(s, true, out var status))
            return status;
        var mapped = s.Replace("_", "") ;
        return Enum.TryParse<ShipmentStatus>(mapped, true, out var status2) ? status2 : null;
    }

    private static string ToFrontendAssignment(AssignmentStatus s) => s.ToString().ToUpper();

    private void Transition(ShipmentRequest req, ShipmentStatus newStatus, string? note = null, DateTime? at = null)
    {
        var now = at ?? DateTime.UtcNow;
        var oldStatus = req.CurrentStatus;
        req.CurrentStatus = newStatus;
        req.UpdatedAt = now;

        _db.Set<StatusHistory>().Add(new StatusHistory
        {
            Id = Guid.NewGuid(),
            ShipmentRequestId = req.Id,
            OldStatus = ToFrontend(oldStatus),
            NewStatus = ToFrontend(newStatus),
            ChangedBy = _currentUser.UserId ?? Guid.Empty,
            ChangedAt = now,
            Note = note,
        });

        _ = _auditFileLogger.WriteAsync(new Models.AuditLogEntry
        {
            Id = Guid.NewGuid().ToString(),
            EntityType = "ShipmentRequest",
            EntityId = req.Id.ToString(),
            ActionType = $"status_{ToFrontend(newStatus).ToLower()}",
            OldValue = ToFrontend(oldStatus),
            NewValue = ToFrontend(newStatus),
            Description = $"{req.RequestNo}: {ToFrontend(oldStatus)} → {ToFrontend(newStatus)}",
            PerformedByUserId = _currentUser.UserId ?? Guid.Empty,
            PerformedByName = _currentUser.FullName ?? "-",
            PerformedAt = now,
        });
    }

    private void Notify(string title, string message, string level, Guid? shipmentRequestId, string[]? targetRoleKeys = null, Guid[]? targetCompanyIds = null)
    {
        _db.Set<Notification>().Add(new Notification
        {
            Id = Guid.NewGuid(),
            Title = title,
            Message = message,
            Level = level,
            CreatedAt = DateTime.UtcNow,
            ShipmentRequestId = shipmentRequestId,
            TargetRoleKeys = targetRoleKeys ?? Array.Empty<string>(),
            TargetCompanyIds = targetCompanyIds ?? Array.Empty<Guid>(),
        });
    }

    // ── Validation ──

    [GeneratedRegex(@"^(\d{2})\s?[A-Z]{1,3}\s?(\d{2,4})$")]
    private static partial Regex PlateRegex();

    private static string NormalizePlate(string v) =>
        Regex.Replace(v.ToUpperInvariant().Trim(), @"[^A-Z0-9]", " ").Trim();

    private static bool IsValidPlate(string v) => PlateRegex().IsMatch(NormalizePlate(v));

    private static string NormalizePhone(string v)
    {
        var digits = Regex.Replace(v, @"\D", "");
        if (digits.StartsWith("0")) digits = "90" + digits[1..];
        if (!digits.StartsWith("90")) digits = "90" + digits;
        return "+" + digits;
    }

    private static bool IsValidPhone(string v) => NormalizePhone(v).Length == 13; // +90XXXXXXXXXX

    // ── MUTATIONS ──

    public async Task<OperationResult> CreateAsync(CreateShipmentRequest dto)
    {
        if (!await _db.Locations.AnyAsync(l => l.Id == dto.TargetLocationId && l.IsActive))
            return OperationResult.Fail("Lokasyon bulunamadi veya aktif degil.");
        if (!await _db.Companies.AnyAsync(c => c.Id == dto.AssignedSupplierCompanyId))
            return OperationResult.Fail("Tedarikci sirket bulunamadi.");
        if (!Enum.TryParse<VehicleType>(dto.VehicleType, true, out var vehicleType))
            return OperationResult.Fail($"Gecersiz arac tipi: {dto.VehicleType}");

        var reqCompanyId = _currentUser.CompanyId ?? Guid.Empty;

        // Generate sequential RequestNo
        var today = DateTime.UtcNow;
        var datePrefix = today.ToString("yyMMdd");
        var countToday = await _db.ShipmentRequests
            .CountAsync(r => r.RequestDate.Date == today.Date);
        var requestNo = $"SR-{datePrefix}-{(countToday + 1):D3}";

        DateTime.TryParse(dto.RequestDate, out var requestDate);
        DateTime.TryParse(dto.LoadDate, out var loadDate);

        var request = new ShipmentRequest
        {
            Id = Guid.NewGuid(),
            RequestNo = requestNo,
            RequesterCompanyId = reqCompanyId,
            TargetLocationId = dto.TargetLocationId,
            RequestDate = requestDate != default ? requestDate : today,
            VehicleType = vehicleType,
            LoadDate = loadDate != default ? loadDate : today,
            LoadTime = dto.LoadTime,
            QuantityInfo = dto.QuantityInfo,
            ProductInfo = dto.ProductInfo,
            Notes = dto.Notes,
            CurrentStatus = ShipmentStatus.RequestCreated,
            AssignedSupplierCompanyId = dto.AssignedSupplierCompanyId,
            CreatedBy = _currentUser.UserId ?? Guid.Empty,
            CreatedAt = today,
            UpdatedAt = today,
        };

        _db.ShipmentRequests.Add(request);
        Transition(request, ShipmentStatus.SentToSupplier);

        Notify("Yeni Sevkiyat Talebi", $"{requestNo} numarali talep olusturuldu.",
            "info", request.Id,
            new[] { "supplier" }, new[] { dto.AssignedSupplierCompanyId });

        await _db.SaveChangesAsync();
        return OperationResult.Success($"{requestNo} basariyla olusturuldu.");
    }

    public async Task<OperationResult> CreateBatchAsync(CreateShipmentBatchRequest dto)
    {
        if (dto.Items.Count == 0)
            return OperationResult.Fail("En az bir talep gerekli.");

        var results = new List<string>();
        foreach (var item in dto.Items)
        {
            var result = await CreateAsync(item);
            results.Add(result.Message);
            if (!result.Ok) return OperationResult.Fail(result.Message);
        }
        return OperationResult.Success($"{dto.Items.Count} talep basariyla olusturuldu.");
    }

    public async Task<OperationResult> ReviseAsync(Guid id, ReviseShipmentInput dto)
    {
        var req = await _db.ShipmentRequests.FindAsync(id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");
        if (IsTerminal(req.CurrentStatus))
            return OperationResult.Fail("Terminal durumda olan talep revize edilemez.");
        if (string.IsNullOrWhiteSpace(dto.LoadTime))
            return OperationResult.Fail("Yukleme saati bos olamaz.");
        if (!Enum.TryParse<VehicleType>(dto.VehicleType, true, out var vehicleType))
            return OperationResult.Fail($"Gecersiz arac tipi: {dto.VehicleType}");

        var oldVehicleType = req.VehicleType;
        var oldLoadTime = req.LoadTime;
        req.VehicleType = vehicleType;
        req.LoadTime = dto.LoadTime;
        req.UpdatedAt = DateTime.UtcNow;

        _ = _auditFileLogger.WriteAsync(new Models.AuditLogEntry
        {
            Id = Guid.NewGuid().ToString(),
            EntityType = "ShipmentRequest",
            EntityId = req.Id.ToString(),
            ActionType = "shipment_revised",
            OldValue = JsonSerializer.Serialize(new { VehicleType = oldVehicleType.ToString(), LoadTime = oldLoadTime }),
            NewValue = JsonSerializer.Serialize(new { VehicleType = vehicleType.ToString(), LoadTime = dto.LoadTime }),
            Description = $"{req.RequestNo} revize edildi.",
            PerformedByUserId = _currentUser.UserId ?? Guid.Empty,
            PerformedByName = _currentUser.FullName ?? "-",
            PerformedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return OperationResult.Success($"{req.RequestNo} basariyla revize edildi.");
    }

    public async Task<OperationResult> CancelAsync(Guid id, CancelShipmentInput dto)
    {
        var req = await _db.ShipmentRequests.FindAsync(id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");
        if (NotCancellable.Contains(req.CurrentStatus))
            return OperationResult.Fail("Bu durumda iptal edilemez.");

        Transition(req, ShipmentStatus.Cancelled, dto.Note);
        Notify("Talep Iptal Edildi", $"{req.RequestNo} iptal edildi.", "warning", req.Id);
        await _db.SaveChangesAsync();
        return OperationResult.Success($"{req.RequestNo} iptal edildi.");
    }

    public async Task<OperationResult> CancelVehicleAsync(Guid id)
    {
        var req = await _db.ShipmentRequests.FindAsync(id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");
        if (NotCancellable.Contains(req.CurrentStatus))
            return OperationResult.Fail("Bu durumda iptal edilemez.");

        Transition(req, ShipmentStatus.VehicleCancelled);
        Notify("Arac Talebi Iptal Edildi", $"{req.RequestNo} arac talebi iptal edildi.", "warning", req.Id);
        await _db.SaveChangesAsync();
        return OperationResult.Success($"{req.RequestNo} arac talebi iptal edildi.");
    }

    public async Task<OperationResult> BeginSupplierReviewAsync(Guid id)
    {
        var req = await _db.ShipmentRequests.FindAsync(id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");
        if (req.CurrentStatus != ShipmentStatus.SentToSupplier)
            return OperationResult.Fail("Talep 'Tedarikciye Iletildi' durumunda degil.");

        Transition(req, ShipmentStatus.SupplierReviewing);
        await _db.SaveChangesAsync();
        return OperationResult.Success("Tedarikci incelemesi basladi.");
    }

    public async Task<OperationResult> SubmitVehicleAssignmentAsync(Guid id, VehicleAssignmentInput dto)
    {
        var req = await _db.ShipmentRequests
            .Include(r => r.VehicleAssignment)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");

        var role = _currentUser.RoleKey;
        if (role != "supplier" && role != "admin" && role != "superadmin")
            return OperationResult.Fail("Bu islem icin yetkiniz yok.");
        if (role == "supplier" && _currentUser.CompanyId != req.AssignedSupplierCompanyId)
            return OperationResult.Fail("Bu talep size atanmamis.");

        var validStatuses = new[] { ShipmentStatus.SentToSupplier, ShipmentStatus.SupplierReviewing, ShipmentStatus.CorrectionRequested };
        if (!validStatuses.Contains(req.CurrentStatus))
            return OperationResult.Fail("Bu durumda arac atanamaz.");

        if (string.IsNullOrWhiteSpace(dto.DriverFirstName) || string.IsNullOrWhiteSpace(dto.DriverLastName) || string.IsNullOrWhiteSpace(dto.DriverPhone))
            return OperationResult.Fail("Surucu bilgileri eksik.");
        if (!IsValidPlate(dto.TractorPlate))
            return OperationResult.Fail("Gecersiz cekici plaka formati.");
        if (!IsValidPhone(dto.DriverPhone))
            return OperationResult.Fail("Gecersiz telefon formati.");

        // Transition through SupplierReviewing if needed
        if (req.CurrentStatus == ShipmentStatus.SentToSupplier)
            Transition(req, ShipmentStatus.SupplierReviewing);

        var now = DateTime.UtcNow;
        if (req.VehicleAssignment == null)
        {
            req.VehicleAssignment = new VehicleAssignment
            {
                Id = Guid.NewGuid(),
                ShipmentRequestId = req.Id,
                SupplierCompanyId = req.AssignedSupplierCompanyId,
                TractorPlate = NormalizePlate(dto.TractorPlate),
                TrailerPlate = NormalizePlate(dto.TrailerPlate),
                DriverFirstName = dto.DriverFirstName.Trim(),
                DriverLastName = dto.DriverLastName.Trim(),
                DriverPhone = NormalizePhone(dto.DriverPhone),
                AssignmentStatus = AssignmentStatus.Submitted,
                AssignedBy = _currentUser.UserId ?? Guid.Empty,
                AssignedAt = now,
            };
        }
        else
        {
            req.VehicleAssignment.TractorPlate = NormalizePlate(dto.TractorPlate);
            req.VehicleAssignment.TrailerPlate = NormalizePlate(dto.TrailerPlate);
            req.VehicleAssignment.DriverFirstName = dto.DriverFirstName.Trim();
            req.VehicleAssignment.DriverLastName = dto.DriverLastName.Trim();
            req.VehicleAssignment.DriverPhone = NormalizePhone(dto.DriverPhone);
            req.VehicleAssignment.AssignmentStatus = AssignmentStatus.Submitted;
            req.VehicleAssignment.AssignedAt = now;
            req.VehicleAssignment.RejectionReason = null;
        }

        Transition(req, ShipmentStatus.VehicleAssigned);
        Notify("Arac Atandi", $"{req.RequestNo} icin arac atandi.", "info", req.Id, new[] { "gate", "admin" });
        await _db.SaveChangesAsync();
        return OperationResult.Success($"Arac basariyla atandi: {NormalizePlate(dto.TractorPlate)}");
    }

    public async Task<OperationResult> AcceptSecurityCorrectionAsync(Guid id)
    {
        var req = await _db.ShipmentRequests.FindAsync(id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");
        if (req.CurrentStatus != ShipmentStatus.CorrectionRequested)
            return OperationResult.Fail("Talep 'Duzeltme Talebi' durumunda degil.");

        Transition(req, ShipmentStatus.SupplierReviewing);
        Notify("Duzeltme Kabul Edildi", $"{req.RequestNo} duzeltme talebi kabul edildi.", "info", req.Id, new[] { "gate", "admin" });
        await _db.SaveChangesAsync();
        return OperationResult.Success("Duzeltme talebi kabul edildi.");
    }

    public async Task<OperationResult> RequestSecurityCorrectionAsync(Guid id, string note)
    {
        if (string.IsNullOrWhiteSpace(note))
            return OperationResult.Fail("Duzeltme notu zorunludur.");

        var req = await _db.ShipmentRequests
            .Include(r => r.VehicleAssignment)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");

        var validStatuses = new[] { ShipmentStatus.VehicleAssigned, ShipmentStatus.CorrectionRequested };
        if (!validStatuses.Contains(req.CurrentStatus))
            return OperationResult.Fail("Bu durumda duzeltme talep edilemez.");

        if (req.VehicleAssignment != null)
        {
            req.VehicleAssignment.AssignmentStatus = AssignmentStatus.Rejected;
            req.VehicleAssignment.RejectionReason = note;
        }

        Transition(req, ShipmentStatus.CorrectionRequested, note);
        Notify("Duzeltme Talebi", $"{req.RequestNo} icin duzeltme talebi olusturuldu: {note}", "warning", req.Id,
            new[] { "supplier" }, new[] { req.AssignedSupplierCompanyId });
        await _db.SaveChangesAsync();
        return OperationResult.Success("Duzeltme talebi olusturuldu.");
    }

    public async Task<OperationResult> RegisterVehicleRecordAsync(Guid id, string? note)
    {
        var req = await _db.ShipmentRequests
            .Include(r => r.VehicleAssignment)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");

        var validStatuses = new[] { ShipmentStatus.VehicleAssigned, ShipmentStatus.CorrectionRequested };
        if (!validStatuses.Contains(req.CurrentStatus))
            return OperationResult.Fail("Bu durumda kayit yapilamaz.");
        if (req.VehicleAssignment == null)
            return OperationResult.Fail("Arac atamasi bulunamadi.");

        req.VehicleAssignment.AssignmentStatus = AssignmentStatus.Approved;
        req.VehicleAssignment.ApprovedBy = _currentUser.UserId;
        req.VehicleAssignment.ApprovedAt = DateTime.UtcNow;
        req.VehicleAssignment.RejectionReason = null;

        Transition(req, ShipmentStatus.Approved, note);
        Notify("Arac Kaydi Yapildi", $"{req.RequestNo} arac kaydi onaylandi.", "success", req.Id, new[] { "control", "admin" });
        await _db.SaveChangesAsync();
        return OperationResult.Success($"{req.RequestNo} arac kaydi basariyla yapildi.");
    }

    public async Task<OperationResult> ReviewVehicleAssignmentAsync(Guid id, ReviewDecisionInput dto)
    {
        var req = await _db.ShipmentRequests
            .Include(r => r.VehicleAssignment)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");
        if (req.VehicleAssignment == null)
            return OperationResult.Fail("Arac atamasi bulunamadi.");

        // Transition to InControl if needed
        if (req.CurrentStatus == ShipmentStatus.VehicleAssigned)
            Transition(req, ShipmentStatus.InControl);
        else if (req.CurrentStatus != ShipmentStatus.InControl)
            return OperationResult.Fail("Bu durumda inceleme yapilamaz.");

        if (dto.Decision.Equals("approve", StringComparison.OrdinalIgnoreCase))
        {
            req.VehicleAssignment.AssignmentStatus = AssignmentStatus.Approved;
            req.VehicleAssignment.ApprovedBy = _currentUser.UserId;
            req.VehicleAssignment.ApprovedAt = DateTime.UtcNow;
            Transition(req, ShipmentStatus.Approved, dto.Note);
            Notify("Arac Onaylandi", $"{req.RequestNo} arac atamasi onaylandi.", "success", req.Id, new[] { "ramp", "admin" });
        }
        else
        {
            req.VehicleAssignment.AssignmentStatus = AssignmentStatus.Rejected;
            req.VehicleAssignment.RejectionReason = dto.Note;
            Transition(req, ShipmentStatus.Rejected, dto.Note);
            Notify("Arac Reddedildi", $"{req.RequestNo} arac atamasi reddedildi.", "error", req.Id,
                new[] { "supplier", "requester" }, new[] { req.AssignedSupplierCompanyId, req.RequesterCompanyId });
        }

        await _db.SaveChangesAsync();
        return OperationResult.Success(dto.Decision.Equals("approve", StringComparison.OrdinalIgnoreCase)
            ? "Arac atamasi onaylandi." : "Arac atamasi reddedildi.");
    }

    public async Task<OperationResult> AssignRampAsync(Guid id, RampPlanningInput dto)
    {
        var req = await _db.ShipmentRequests
            .Include(r => r.RampAssignment)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");

        var validStatuses = new[] { ShipmentStatus.Approved, ShipmentStatus.RampPlanned };
        if (!validStatuses.Contains(req.CurrentStatus))
            return OperationResult.Fail("Bu durumda rampa atanamaz.");

        var ramp = await _db.Set<Ramp>().FirstOrDefaultAsync(r => r.Id == dto.RampId && r.IsActive);
        if (ramp == null)
            return OperationResult.Fail("Rampa bulunamadi veya aktif degil.");

        // Check ramp conflict
        var conflict = await _db.Set<RampAssignment>()
            .Include(ra => ra.ShipmentRequest)
            .AnyAsync(ra =>
                ra.RampId == dto.RampId &&
                ra.ShipmentRequestId != id &&
                !TerminalStatuses.Select(s => s.ToString()).Contains(ra.ShipmentRequest.CurrentStatus.ToString()) &&
                ra.ShipmentRequest.LoadDate.Date == req.LoadDate.Date &&
                ra.ShipmentRequest.LoadTime == req.LoadTime);

        if (conflict)
            return OperationResult.Fail("Bu rampa belirtilen tarih/saatte baska bir talebe atanmis.");

        var now = DateTime.UtcNow;
        if (req.RampAssignment == null)
        {
            req.RampAssignment = new RampAssignment
            {
                Id = Guid.NewGuid(),
                ShipmentRequestId = req.Id,
                RampId = dto.RampId,
                AssignedBy = _currentUser.UserId ?? Guid.Empty,
                AssignedAt = now,
                Status = "ASSIGNED",
            };
        }
        else
        {
            req.RampAssignment.RampId = dto.RampId;
            req.RampAssignment.AssignedBy = _currentUser.UserId ?? Guid.Empty;
            req.RampAssignment.AssignedAt = now;
        }

        if (req.CurrentStatus == ShipmentStatus.Approved)
            Transition(req, ShipmentStatus.RampPlanned, dto.Note);
        else
            req.UpdatedAt = now; // already RampPlanned, just update

        Notify("Rampa Atandi", $"{req.RequestNo} rampaya atandi.", "info", req.Id, new[] { "gate", "admin" });
        await _db.SaveChangesAsync();
        return OperationResult.Success($"{req.RequestNo} rampa atamasi yapildi.");
    }

    public async Task<OperationResult> RecordGateActionAsync(Guid id, GateActionInput dto)
    {
        var req = await _db.ShipmentRequests
            .Include(r => r.GateOperation)
            .Include(r => r.LoadingOperation)
            .Include(r => r.RampAssignment)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");

        var now = DateTime.UtcNow;
        req.GateOperation ??= new GateOperation
        {
            Id = Guid.NewGuid(),
            ShipmentRequestId = req.Id,
        };

        switch (dto.Action.ToLower())
        {
            case "arrive":
                if (req.CurrentStatus != ShipmentStatus.RampPlanned)
                    return OperationResult.Fail("Talep 'Rampa Planlandi' durumunda degil.");
                req.GateOperation.ArrivedAt = now;
                req.GateOperation.CheckedBy = _currentUser.UserId;
                req.GateOperation.Notes = dto.Note;
                Transition(req, ShipmentStatus.Arrived);
                break;

            case "admit":
                if (req.CurrentStatus != ShipmentStatus.Arrived)
                    return OperationResult.Fail("Talep 'Geldi' durumunda degil.");
                req.GateOperation.AdmittedAt = now;
                req.GateOperation.CheckedBy = _currentUser.UserId;
                Transition(req, ShipmentStatus.Admitted);
                break;

            case "totoramp":
                if (req.CurrentStatus != ShipmentStatus.Admitted)
                    return OperationResult.Fail("Talep 'Kabul Edildi' durumunda degil.");
                if (req.RampAssignment == null)
                    return OperationResult.Fail("Rampa atamasi bulunamadi.");
                req.GateOperation.RampTakenAt = now;
                Transition(req, ShipmentStatus.AtRamp);
                break;

            case "startloading":
                if (req.CurrentStatus != ShipmentStatus.AtRamp)
                    return OperationResult.Fail("Talep 'Rampada' durumunda degil.");
                req.LoadingOperation ??= new LoadingOperation
                {
                    Id = Guid.NewGuid(),
                    ShipmentRequestId = req.Id,
                };
                req.LoadingOperation.StartedAt = now;
                req.LoadingOperation.Notes = dto.Note;
                Transition(req, ShipmentStatus.Loading);
                break;

            default:
                return OperationResult.Fail($"Gecersiz islem: {dto.Action}");
        }

        await _db.SaveChangesAsync();
        return OperationResult.Success($"{req.RequestNo} kapi islemi basarili: {dto.Action}");
    }

    public async Task<OperationResult> FinalizeLoadingAsync(Guid id, LoadingCompletionInput dto)
    {
        if (string.IsNullOrWhiteSpace(dto.SealNumber))
            return OperationResult.Fail("Muhur numarasi zorunludur.");

        var req = await _db.ShipmentRequests
            .Include(r => r.LoadingOperation)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req == null) return OperationResult.Fail("Talep bulunamadi.");

        var validStatuses = new[] { ShipmentStatus.RampPlanned, ShipmentStatus.Loading };
        if (!validStatuses.Contains(req.CurrentStatus))
            return OperationResult.Fail("Bu durumda yukleme tamamlanamaz.");

        var now = DateTime.UtcNow;

        req.LoadingOperation ??= new LoadingOperation
        {
            Id = Guid.NewGuid(),
            ShipmentRequestId = req.Id,
        };

        req.LoadingOperation.StartedAt ??= now.AddMinutes(-1);
        req.LoadingOperation.CompletedAt = now;
        req.LoadingOperation.SealNumber = dto.SealNumber.Trim().ToUpperInvariant();
        req.LoadingOperation.SealedAt = now.AddMinutes(2);
        req.LoadingOperation.FinalizedBy = _currentUser.UserId;
        req.LoadingOperation.ExitAt = now.AddMinutes(10);
        req.LoadingOperation.Notes = dto.Note;

        // If was RampPlanned, insert intermediate Loading status
        if (req.CurrentStatus == ShipmentStatus.RampPlanned)
            Transition(req, ShipmentStatus.Loading, null, now.AddMinutes(-1));

        Transition(req, ShipmentStatus.Loaded);

        Notify("Yukleme Tamamlandi", $"{req.RequestNo} yukleme tamamlandi. Muhur: {dto.SealNumber.Trim().ToUpperInvariant()}", "success", req.Id);
        await _db.SaveChangesAsync();
        return OperationResult.Success($"{req.RequestNo} yukleme basariyla tamamlandi.");
    }

    public async Task<OperationResult> ClearActiveAsync()
    {
        var activeRequests = await _db.ShipmentRequests
            .Where(r => !TerminalStatuses.Contains(r.CurrentStatus))
            .Select(r => r.Id)
            .ToListAsync();

        if (activeRequests.Count == 0)
            return OperationResult.Success("Aktif talep bulunamadi.");

        // Delete related entities
        await _db.Set<LoadingOperation>().Where(x => activeRequests.Contains(x.ShipmentRequestId)).ExecuteDeleteAsync();
        await _db.Set<GateOperation>().Where(x => activeRequests.Contains(x.ShipmentRequestId)).ExecuteDeleteAsync();
        await _db.Set<RampAssignment>().Where(x => activeRequests.Contains(x.ShipmentRequestId)).ExecuteDeleteAsync();
        await _db.Set<VehicleAssignment>().Where(x => activeRequests.Contains(x.ShipmentRequestId)).ExecuteDeleteAsync();
        await _db.Set<StatusHistory>().Where(x => activeRequests.Contains(x.ShipmentRequestId)).ExecuteDeleteAsync();
        await _db.Set<Notification>().Where(x => x.ShipmentRequestId.HasValue && activeRequests.Contains(x.ShipmentRequestId.Value)).ExecuteDeleteAsync();
        await _db.ShipmentRequests.Where(r => activeRequests.Contains(r.Id)).ExecuteDeleteAsync();

        return OperationResult.Success($"{activeRequests.Count} aktif talep silindi.");
    }

    // ── READS ──

    public async Task<PagedResult<ShipmentListDto>> GetListAsync(ShipmentFilterRequest filter)
    {
        var query = _db.ShipmentRequests
            .Include(r => r.RequesterCompany)
            .Include(r => r.AssignedSupplierCompany)
            .Include(r => r.TargetLocation)
            .Include(r => r.VehicleAssignment)
            .Include(r => r.RampAssignment).ThenInclude(ra => ra!.Ramp)
            .AsQueryable();

        // Role-based filtering
        var role = _currentUser.RoleKey;
        var userId = _currentUser.UserId ?? Guid.Empty;
        var companyId = _currentUser.CompanyId ?? Guid.Empty;

        if (role == "requester")
            query = query.Where(r => r.CreatedBy == userId);
        else if (role == "supplier")
            query = query.Where(r => r.AssignedSupplierCompanyId == companyId);
        else if (role != "admin" && role != "superadmin")
            query = query.Where(r => r.RequesterCompanyId == companyId);

        // Filters
        if (filter.Terminal == true)
        {
            query = query.Where(r => TerminalStatuses.Contains(r.CurrentStatus));
        }
        else if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "ALL")
        {
            var status = ParseStatus(filter.Status);
            if (status.HasValue) query = query.Where(r => r.CurrentStatus == status.Value);
        }
        if (filter.LocationId.HasValue)
            query = query.Where(r => r.TargetLocationId == filter.LocationId.Value);
        if (filter.SupplierId.HasValue)
            query = query.Where(r => r.AssignedSupplierCompanyId == filter.SupplierId.Value);
        if (!string.IsNullOrWhiteSpace(filter.VehicleType) && filter.VehicleType != "ALL")
        {
            if (Enum.TryParse<VehicleType>(filter.VehicleType, true, out var vt))
                query = query.Where(r => r.VehicleType == vt);
        }
        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(r => r.LoadDate >= dateFrom);
        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(r => r.LoadDate <= dateTo);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.ToLower();
            query = query.Where(r =>
                r.RequestNo.ToLower().Contains(search) ||
                r.ProductInfo.ToLower().Contains(search) ||
                r.QuantityInfo.ToLower().Contains(search) ||
                r.TargetLocation.Name.ToLower().Contains(search) ||
                (r.VehicleAssignment != null && (
                    r.VehicleAssignment.TractorPlate.ToLower().Contains(search) ||
                    r.VehicleAssignment.DriverFirstName.ToLower().Contains(search) ||
                    r.VehicleAssignment.DriverLastName.ToLower().Contains(search)
                )));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(r => r.LoadDate).ThenBy(r => r.LoadTime).ThenByDescending(r => r.UpdatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(Math.Min(filter.PageSize, 100))
            .Select(r => new ShipmentListDto
            {
                Id = r.Id,
                RequestNo = r.RequestNo,
                CurrentStatus = ToFrontend(r.CurrentStatus),
                RequesterCompanyName = r.RequesterCompany.Name,
                SupplierCompanyName = r.AssignedSupplierCompany.Name,
                LocationName = r.TargetLocation.Name,
                VehicleType = r.VehicleType.ToString().ToUpper(),
                LoadDate = r.LoadDate.ToString("yyyy-MM-dd"),
                LoadTime = r.LoadTime,
                ProductInfo = r.ProductInfo,
                QuantityInfo = r.QuantityInfo,
                TractorPlate = r.VehicleAssignment != null ? r.VehicleAssignment.TractorPlate : null,
                DriverName = r.VehicleAssignment != null ? r.VehicleAssignment.DriverFirstName + " " + r.VehicleAssignment.DriverLastName : null,
                RampCode = r.RampAssignment != null ? r.RampAssignment.Ramp.Code : null,
                CreatedAt = r.CreatedAt.ToString("o"),
                UpdatedAt = r.UpdatedAt.ToString("o"),
            })
            .ToListAsync();

        return new PagedResult<ShipmentListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize,
        };
    }

    public async Task<ShipmentDetailDto?> GetDetailAsync(Guid id)
    {
        var r = await _db.ShipmentRequests
            .Include(r => r.RequesterCompany)
            .Include(r => r.AssignedSupplierCompany)
            .Include(r => r.TargetLocation)
            .Include(r => r.CreatedByUser)
            .Include(r => r.VehicleAssignment)
            .Include(r => r.RampAssignment).ThenInclude(ra => ra!.Ramp)
            .Include(r => r.GateOperation)
            .Include(r => r.LoadingOperation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r == null) return null;

        return new ShipmentDetailDto
        {
            Id = r.Id,
            RequestNo = r.RequestNo,
            CurrentStatus = ToFrontend(r.CurrentStatus),
            RequesterCompanyId = r.RequesterCompanyId,
            RequesterCompanyName = r.RequesterCompany.Name,
            AssignedSupplierCompanyId = r.AssignedSupplierCompanyId,
            SupplierCompanyName = r.AssignedSupplierCompany.Name,
            TargetLocationId = r.TargetLocationId,
            LocationName = r.TargetLocation.Name,
            VehicleType = r.VehicleType.ToString().ToUpper(),
            RequestDate = r.RequestDate.ToString("yyyy-MM-dd"),
            LoadDate = r.LoadDate.ToString("yyyy-MM-dd"),
            LoadTime = r.LoadTime,
            QuantityInfo = r.QuantityInfo,
            ProductInfo = r.ProductInfo,
            Notes = r.Notes,
            CreatedByName = $"{r.CreatedByUser.FirstName} {r.CreatedByUser.LastName}",
            CreatedBy = r.CreatedBy,
            CreatedAt = r.CreatedAt.ToString("o"),
            UpdatedAt = r.UpdatedAt.ToString("o"),
            VehicleAssignment = r.VehicleAssignment != null ? new VehicleAssignmentDto
            {
                Id = r.VehicleAssignment.Id,
                TractorPlate = r.VehicleAssignment.TractorPlate,
                TrailerPlate = r.VehicleAssignment.TrailerPlate,
                DriverFirstName = r.VehicleAssignment.DriverFirstName,
                DriverLastName = r.VehicleAssignment.DriverLastName,
                DriverPhone = r.VehicleAssignment.DriverPhone,
                AssignmentStatus = ToFrontendAssignment(r.VehicleAssignment.AssignmentStatus),
                AssignedAt = r.VehicleAssignment.AssignedAt.ToString("o"),
                ApprovedAt = r.VehicleAssignment.ApprovedAt?.ToString("o"),
                RejectionReason = r.VehicleAssignment.RejectionReason,
            } : null,
            RampAssignment = r.RampAssignment != null ? new RampAssignmentDto
            {
                Id = r.RampAssignment.Id,
                RampId = r.RampAssignment.RampId,
                RampCode = r.RampAssignment.Ramp.Code,
                RampName = r.RampAssignment.Ramp.Name,
                AssignedAt = r.RampAssignment.AssignedAt.ToString("o"),
                Status = r.RampAssignment.Status,
            } : null,
            GateOperation = r.GateOperation != null ? new GateOperationDto
            {
                Id = r.GateOperation.Id,
                ArrivedAt = r.GateOperation.ArrivedAt?.ToString("o"),
                AdmittedAt = r.GateOperation.AdmittedAt?.ToString("o"),
                RampTakenAt = r.GateOperation.RampTakenAt?.ToString("o"),
                Notes = r.GateOperation.Notes,
            } : null,
            LoadingOperation = r.LoadingOperation != null ? new LoadingOperationDto
            {
                Id = r.LoadingOperation.Id,
                StartedAt = r.LoadingOperation.StartedAt?.ToString("o"),
                CompletedAt = r.LoadingOperation.CompletedAt?.ToString("o"),
                SealNumber = r.LoadingOperation.SealNumber,
                SealedAt = r.LoadingOperation.SealedAt?.ToString("o"),
                ExitAt = r.LoadingOperation.ExitAt?.ToString("o"),
                Notes = r.LoadingOperation.Notes,
            } : null,
        };
    }

    public async Task<List<StatusHistoryDto>> GetStatusHistoryAsync(Guid id)
    {
        return await _db.Set<StatusHistory>()
            .Where(h => h.ShipmentRequestId == id)
            .Join(_db.Users, h => h.ChangedBy, u => u.Id, (h, u) => new StatusHistoryDto
            {
                Id = h.Id,
                OldStatus = h.OldStatus,
                NewStatus = h.NewStatus,
                ChangedByName = u.FirstName + " " + u.LastName,
                ChangedAt = h.ChangedAt.ToString("o"),
                Note = h.Note,
            })
            .OrderByDescending(h => h.ChangedAt)
            .ToListAsync();
    }

    public async Task<List<AuditLogDto>> GetShipmentAuditLogsAsync(Guid id)
    {
        var entityId = id.ToString();
        var filter = new AuditLogFilterRequest
        {
            EntityType = "ShipmentRequest",
            SortBy = "performedAt",
            SortDirection = "desc",
            PageSize = 100,
        };
        var result = await _auditFileLogger.ReadAsync(filter);
        return result.Items
            .Where(a => a.EntityId == entityId)
            .ToList();
    }
}
