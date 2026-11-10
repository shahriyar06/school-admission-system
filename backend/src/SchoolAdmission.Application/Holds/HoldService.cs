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

    // Part 2 te confirm/cancel e o eta abar use hobe
    private static string ValidateStudentId(string? studentId)
    {
        var trimmed = studentId?.Trim();
        if (trimmed is null || !StudentIdRules.IsValid(trimmed))
            throw new BadRequestException("INVALID_STUDENT_ID",
                $"X-Student-Id must be exactly {StudentIdRules.Length} digits.");
        return trimmed;
    }
}
