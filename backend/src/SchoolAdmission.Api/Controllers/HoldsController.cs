using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("holds")]
public sealed class HoldsController(HoldService holdService) : ControllerBase
{
    // :guid constraint dilam, tai vul ID dile 500 na hoye 404 asbe
    [HttpGet("{holdId:guid}")]
    public async Task<ActionResult<HoldResponse>> Get(Guid holdId, CancellationToken ct) =>
        Ok(await holdService.GetAsync(holdId, ct));

    [HttpPost("{holdId:guid}/confirm")]
    public async Task<ActionResult<HoldResponse>> Confirm(
        Guid holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct) =>
        Ok(await holdService.ConfirmAsync(holdId, studentId, ct));

    [HttpDelete("{holdId:guid}")]
    public async Task<IActionResult> Cancel(
        Guid holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct)
    {
        await holdService.CancelAsync(holdId, studentId, ct);
        return NoContent();
    }
}
