using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Application.Common.Exceptions;
using SchoolAdmission.Application.Common.Interfaces;
using SchoolAdmission.Domain.Entities;
using SchoolAdmission.Domain.Enums;

namespace SchoolAdmission.Application.Classes;

public sealed class ClassService(IAppDbContext db, IClock clock)
{
    public async Task<ClassResponse> CreateAsync(CreateClassRequest request, CancellationToken ct)
    {
        if (request.TotalSeats is not { } totalSeats)
            throw new BadRequestException("VALIDATION_ERROR", "Total seats is required.");

        var schoolClass = SchoolClass.Create(request.Name, totalSeats, clock.UtcNow);
        db.Classes.Add(schoolClass);
        await db.SaveChangesAsync(ct);

        return new ClassResponse(schoolClass.Id, schoolClass.Name, schoolClass.TotalSeats);
    }

    public async Task<IReadOnlyList<ClassSeatsResponse>> GetAllAsync(CancellationToken ct)
    {
        var classes = await db.Classes
            .AsNoTracking()
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(ct);

        var counts = await GetSeatCountsAsync(null, ct);
        return classes.Select(c => ToSeatsResponse(c, counts)).ToList();
    }

    public async Task<ClassSeatsResponse> GetByIdAsync(Guid classId, CancellationToken ct)
    {
        var schoolClass = await db.Classes
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == classId, ct)
            ?? throw new NotFoundException("CLASS_NOT_FOUND", "Class not found.");

        var counts = await GetSeatCountsAsync(classId, ct);
        return ToSeatsResponse(schoolClass, counts);
    }

    // Ekta grouped query tei sob gona hobe
    // DB te HELD thakleo somoi par hoye gele asole EXPIRED, tai oita kokhono gona hobe na
    private async Task<Dictionary<(Guid ClassId, HoldStatus Status), int>> GetSeatCountsAsync(
        Guid? classId, CancellationToken ct)
    {
        var now = clock.UtcNow;

        var query = db.Holds.AsNoTracking()
            .Where(h => h.Status == HoldStatus.Confirmed
                        || (h.Status == HoldStatus.Held && h.ExpiresAt > now));
        if (classId is { } id)
            query = query.Where(h => h.ClassId == id);

        var rows = await query
            .GroupBy(h => new { h.ClassId, h.Status })
            .Select(g => new { g.Key.ClassId, g.Key.Status, Count = g.Count() })
            .ToListAsync(ct);

        return rows.ToDictionary(r => (r.ClassId, r.Status), r => r.Count);
    }

    private static ClassSeatsResponse ToSeatsResponse(
        SchoolClass c, Dictionary<(Guid ClassId, HoldStatus Status), int> counts)
    {
        var held = counts.GetValueOrDefault((c.Id, HoldStatus.Held));
        var confirmed = counts.GetValueOrDefault((c.Id, HoldStatus.Confirmed));
        var available = Math.Max(0, c.TotalSeats - held - confirmed);
        return new ClassSeatsResponse(c.Id, c.Name, c.TotalSeats, held, confirmed, available);
    }
}
