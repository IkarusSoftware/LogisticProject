using FlowDock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowDock.Api.Controllers;

[ApiController]
[Route("api/lookup")]
[Authorize]
public class LookupController : ControllerBase
{
    private readonly ILookupService _lookupService;

    public LookupController(ILookupService lookupService)
    {
        _lookupService = lookupService;
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _lookupService.GetRolesAsync();
        return Ok(roles);
    }

    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies()
    {
        var companies = await _lookupService.GetCompaniesAsync();
        return Ok(companies);
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _lookupService.GetUsersAsync();
        return Ok(users);
    }

    [HttpGet("locations")]
    public async Task<IActionResult> GetLocations()
    {
        var locations = await _lookupService.GetLocationsAsync();
        return Ok(locations);
    }

    [HttpGet("ramps")]
    public async Task<IActionResult> GetRamps()
    {
        var ramps = await _lookupService.GetRampsAsync();
        return Ok(ramps);
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _lookupService.GetSettingsAsync();
        if (settings == null) return NotFound();
        return Ok(settings);
    }

    [HttpGet("bootstrap")]
    public async Task<IActionResult> GetBootstrap()
    {
        var bootstrap = await _lookupService.GetBootstrapAsync();
        return Ok(bootstrap);
    }
}
