using FlowDock.Api.Models.DTOs;
using FlowDock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowDock.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUser;
    private readonly IWebHostEnvironment _env;

    public AuthController(IAuthService authService, ICurrentUserService currentUser, IWebHostEnvironment env)
    {
        _authService = authService;
        _currentUser = currentUser;
        _env = env;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Email, request.Password);
        if (result == null)
            return Unauthorized(new { message = "Gecersiz e-posta veya sifre." });

        return Ok(result);
    }

    [HttpPost("demo-login")]
    public async Task<IActionResult> DemoLogin([FromBody] DemoLoginRequest request)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var result = await _authService.DemoLoginAsync(request.UserId);
        if (result == null)
            return Unauthorized(new { message = "Demo kullanici bulunamadi." });

        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RefreshAsync(request.RefreshToken);
        if (result == null)
            return Unauthorized(new { message = "Gecersiz veya suresi dolmus refresh token." });

        return Ok(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (_currentUser.UserId.HasValue)
            await _authService.LogoutAsync(_currentUser.UserId.Value);

        return Ok(new { message = "Cikis yapildi." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!_currentUser.UserId.HasValue)
            return Unauthorized();

        var profile = await _authService.GetProfileAsync(_currentUser.UserId.Value);
        if (profile == null)
            return NotFound();

        return Ok(profile);
    }
}
