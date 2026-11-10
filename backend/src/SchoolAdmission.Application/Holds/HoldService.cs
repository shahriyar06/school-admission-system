using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Application.Common;
using SchoolAdmission.Application.Common.Exceptions;
using SchoolAdmission.Application.Common.Interfaces;
using SchoolAdmission.Domain.Common;
using SchoolAdmission.Domain.Entities;
using SchoolAdmission.Domain.Enums;

namespace SchoolAdmission.Application.Holds;

public sealed class HoldService(IAppDbContext db, IClock clock, HoldOptions options)
{
    public async Task<HoldResponse> CreateAsync(Guid classId, string? studentId, CancellationToken ct)
    {
        // ১. DB te jaoar agei vul input bad dibo
        var validStudentId = ValidateStudentId(studentId);

        // ২. Seat check ar insert eksathe hote hobe, tai sob kichu ekta transaction e
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // ৩. Class er row lock korlam। Ekoi class e eksathe onek request asle egula ekhane
        //    line e dariye thakbe, tai niche er check ekbar e ektai request korbe
        var schoolClass = await db.FindClassForUpdateAsync(classId, ct)
            ?? throw new NotFoundException("CLASS_NOT_FOUND", "Class not found.");

        // ৪. Lock paoar porei somoi nilam, karon lock er jonno opekkha korte hote pare
        var now = clock.UtcNow;

        // ৫. Somoi par hoye jaoa hold gula EXPIRED kore dilam, tahole seat khali hobe
        //    ar duplicate check ar unique index e egula active hisebe dhora porbe na
        await db.ExpireStaleHoldsAsync(now, classId, ct);

        // READ COMMITTED e protita statement ager lock holder er commit kora row dekhte pay,
        // tai niche er hisab ei class er jonno ekdom thik thakbe

        // ৬. Ek student ek class e ektar beshi active hold rakhte parbe na (unique index o ache)
        var alreadyApplied = await db.Holds.AnyAsync(h =>
            h.ClassId == classId
            && h.StudentId == validStudentId
            && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);
        if (alreadyApplied)
            throw new ConflictException("ALREADY_APPLIED", "Student already has an active hold for this class.");

        // ৭. Seat ache kina check। ৫ number step e purono HELD agei EXPIRED hoye geche,
        //    tai sudhu count korlei hobe
        var occupied = await db.Holds.CountAsync(h =>
            h.ClassId == classId
            && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);
        if (occupied >= schoolClass.TotalSeats)
            throw new ConflictException("NO_SEATS", "No seats available in this class.");

        // ৮. Insert kore commit। Commit hole lock chere dibe, porer request dhukte parbe
        var hold = Hold.Create(classId, validStudentId, now, options.Duration);
        db.Holds.Add(hold);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return HoldResponse.From(hold, schoolClass.Name, now);
    }

    public async Task<HoldResponse> ConfirmAsync(Guid holdId, string? studentId, CancellationToken ct)
    {
        var validStudentId = ValidateStudentId(studentId);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Hold er row lock korlam। Eksathe duita confirm asle duijonei HELD dekhe
        // duibar update korte pare, lock thakle ditiyo jon wait korbe ar CONFIRMED dekhbe
        var hold = await db.FindHoldForUpdateAsync(holdId, ct)
            ?? throw new NotFoundException("HOLD_NOT_FOUND", "Hold not found.");
        EnsureOwner(hold, validStudentId);

        // Lock paoar por somoi nilam, jate wait er somoi expire hole seta dhora pore
        var now = clock.UtcNow;

        // Agei CONFIRMED hole kichu bodlabe na (idempotent), expired hole 409 dibe
        hold.Confirm(now);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return HoldResponse.From(hold, await GetClassNameAsync(hold.ClassId, ct), now);
    }

    public async Task CancelAsync(Guid holdId, string? studentId, CancellationToken ct)
    {
        var validStudentId = ValidateStudentId(studentId);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Confirm ar cancel eksathe asle jate dutoi na hoy, tai ekhaneo row lock
        var hold = await db.FindHoldForUpdateAsync(holdId, ct)
            ?? throw new NotFoundException("HOLD_NOT_FOUND", "Hold not found.");
        EnsureOwner(hold, validStudentId);

        var now = clock.UtcNow;

        // Agei CANCELLED hole kono error nai, CONFIRMED/EXPIRED hole 409 dibe
        hold.Cancel(now);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    // Header lagbe na, holdId jana thaklei dekha jabe
    public async Task<HoldResponse> GetAsync(Guid holdId, CancellationToken ct)
    {
        var hold = await db.Holds
            .AsNoTracking()
            .Include(h => h.Class)
            .FirstOrDefaultAsync(h => h.Id == holdId, ct)
            ?? throw new NotFoundException("HOLD_NOT_FOUND", "Hold not found.");

        return HoldResponse.From(hold, hold.Class.Name, clock.UtcNow);
    }

    public async Task<IReadOnlyList<HoldResponse>> GetMineAsync(string? studentId, CancellationToken ct)
    {
        var validStudentId = ValidateStudentId(studentId);

        var holds = await db.Holds
            .AsNoTracking()
            .Include(h => h.Class)
            .Where(h => h.StudentId == validStudentId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync(ct);

        var now = clock.UtcNow;
        return holds.Select(h => HoldResponse.From(h, h.Class.Name, now)).ToList();
    }

    // Onno student er hold confirm/cancel korte dibo na
    private static void EnsureOwner(Hold hold, string studentId)
    {
        if (hold.StudentId != studentId)
            throw new ForbiddenException("FORBIDDEN", "This hold belongs to another student.");
    }

    private Task<string> GetClassNameAsync(Guid classId, CancellationToken ct) =>
        db.Classes
            .Where(c => c.Id == classId)
            .Select(c => c.Name)
            .SingleAsync(ct);

    // Create, confirm, cancel ar /me/holds sob jaygay eta use hocche
    private static string ValidateStudentId(string? studentId)
    {
        var trimmed = studentId?.Trim();
        if (trimmed is null || !StudentIdRules.IsValid(trimmed))
            throw new BadRequestException("INVALID_STUDENT_ID",
                $"X-Student-Id must be exactly {StudentIdRules.Length} digits.");
        return trimmed;
    }
}
