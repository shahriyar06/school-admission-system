using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Application.Classes;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
public sealed class ClassesController(ClassService classService, HoldService holdService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ClassResponse>> Create(
        [FromBody] CreateClassRequest request, CancellationToken ct)
    {
        var created = await classService.CreateAsync(request, ct);
        return Created($"/classes/{created.Id}", created);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ClassSeatsResponse>>> GetAll(CancellationToken ct) =>
        Ok(await classService.GetAllAsync(ct));

    // :guid constraint dilam, tai vul ID dile 500 na hoye 404 asbe
    [HttpGet("{classId:guid}")]
    public async Task<ActionResult<ClassSeatsResponse>> GetById(Guid classId, CancellationToken ct) =>
        Ok(await classService.GetByIdAsync(classId, ct));

    [HttpPost("{classId:guid}/holds")]
    public async Task<ActionResult<HoldResponse>> CreateHold(
        Guid classId,
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct)
    {
        var hold = await holdService.CreateAsync(classId, studentId, ct);
        return Created($"/holds/{hold.HoldId}", hold);
    }
}
