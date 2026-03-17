using FlowDock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowDock.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies()
    {
        var companies = await _adminService.GetCompaniesAsync();
        return Ok(companies);
    }

    [HttpPatch("companies/{id:guid}/status")]
    public async Task<IActionResult> ToggleCompanyStatus(Guid id)
    {
        var result = await _adminService.ToggleCompanyStatusAsync(id);
        return Ok(result);
    }

    [HttpGet("ramps")]
    public async Task<IActionResult> GetRamps()
    {
        var ramps = await _adminService.GetRampsAsync();
        return Ok(ramps);
    }

    [HttpPatch("ramps/{id:guid}/status")]
    public async Task<IActionResult> ToggleRampStatus(Guid id)
    {
        var result = await _adminService.ToggleRampActiveAsync(id);
        return Ok(result);
    }
}
