using FlowDock.Api.Models.DTOs;
using FlowDock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowDock.Api.Controllers;

[ApiController]
[Route("api/shipments")]
[Authorize]
public class ShipmentController : ControllerBase
{
    private readonly IShipmentService _shipmentService;

    public ShipmentController(IShipmentService shipmentService)
    {
        _shipmentService = shipmentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] ShipmentFilterRequest filter)
    {
        var result = await _shipmentService.GetListAsync(filter);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id)
    {
        var detail = await _shipmentService.GetDetailAsync(id);
        return detail == null ? NotFound() : Ok(detail);
    }

    [HttpGet("{id:guid}/history")]
    public async Task<IActionResult> GetHistory(Guid id)
    {
        var history = await _shipmentService.GetStatusHistoryAsync(id);
        return Ok(history);
    }

    [HttpGet("{id:guid}/audit")]
    public async Task<IActionResult> GetAudit(Guid id)
    {
        var logs = await _shipmentService.GetShipmentAuditLogsAsync(id);
        return Ok(logs);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateShipmentRequest request)
    {
        var result = await _shipmentService.CreateAsync(request);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPost("batch")]
    public async Task<IActionResult> CreateBatch([FromBody] CreateShipmentBatchRequest request)
    {
        var result = await _shipmentService.CreateBatchAsync(request);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/revise")]
    public async Task<IActionResult> Revise(Guid id, [FromBody] ReviseShipmentInput input)
    {
        var result = await _shipmentService.ReviseAsync(id, input);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelShipmentInput input)
    {
        var result = await _shipmentService.CancelAsync(id, input);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/cancel-vehicle")]
    public async Task<IActionResult> CancelVehicle(Guid id)
    {
        var result = await _shipmentService.CancelVehicleAsync(id);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/begin-review")]
    public async Task<IActionResult> BeginReview(Guid id)
    {
        var result = await _shipmentService.BeginSupplierReviewAsync(id);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{id:guid}/vehicle-assignment")]
    public async Task<IActionResult> SubmitVehicleAssignment(Guid id, [FromBody] VehicleAssignmentInput input)
    {
        var result = await _shipmentService.SubmitVehicleAssignmentAsync(id, input);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/accept-correction")]
    public async Task<IActionResult> AcceptCorrection(Guid id)
    {
        var result = await _shipmentService.AcceptSecurityCorrectionAsync(id);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/request-correction")]
    public async Task<IActionResult> RequestCorrection(Guid id, [FromBody] CancelShipmentInput input)
    {
        var result = await _shipmentService.RequestSecurityCorrectionAsync(id, input.Note ?? "");
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/register-vehicle")]
    public async Task<IActionResult> RegisterVehicle(Guid id, [FromBody] CancelShipmentInput? input)
    {
        var result = await _shipmentService.RegisterVehicleRecordAsync(id, input?.Note);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{id:guid}/review")]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewDecisionInput input)
    {
        var result = await _shipmentService.ReviewVehicleAssignmentAsync(id, input);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{id:guid}/assign-ramp")]
    public async Task<IActionResult> AssignRamp(Guid id, [FromBody] RampPlanningInput input)
    {
        var result = await _shipmentService.AssignRampAsync(id, input);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{id:guid}/gate-action")]
    public async Task<IActionResult> GateAction(Guid id, [FromBody] GateActionInput input)
    {
        var result = await _shipmentService.RecordGateActionAsync(id, input);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{id:guid}/finalize")]
    public async Task<IActionResult> Finalize(Guid id, [FromBody] LoadingCompletionInput input)
    {
        var result = await _shipmentService.FinalizeLoadingAsync(id, input);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    [HttpDelete("active")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> ClearActive()
    {
        var result = await _shipmentService.ClearActiveAsync();
        return Ok(result);
    }
}
