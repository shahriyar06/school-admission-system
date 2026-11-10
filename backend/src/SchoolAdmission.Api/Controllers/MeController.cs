using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("me")]
public sealed class MeController(HoldService holdService) : ControllerBase
{
    // X-Student-Id header diye "ami ke" bujhbo, tar sob hold notun theke purono
    [HttpGet("holds")]
    public async Task<ActionResult<IReadOnlyList<HoldResponse>>> GetMyHolds(
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct) =>
        Ok(await holdService.GetMineAsync(studentId, ct));
}
