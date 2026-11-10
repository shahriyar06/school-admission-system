using SchoolAdmission.Domain.Common;
using SchoolAdmission.Domain.Enums;
using SchoolAdmission.Domain.Exceptions;

namespace SchoolAdmission.Domain.Entities;

public class Hold
{
    public Guid Id { get; private set; }
    public Guid ClassId { get; private set; }
    public string StudentId { get; private set; } = null!;
    public HoldStatus Status { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }
    public DateTime? CancelledAt { get; private set; }

    public SchoolClass Class { get; private set; } = null!;

    private Hold() { } // EF Core er jonno

    public static Hold Create(Guid classId, string studentId, DateTime nowUtc, TimeSpan duration)
    {
        if (!StudentIdRules.IsValid(studentId))
            throw new DomainValidationException("Student ID must be exactly 17 digits.");
        if (duration <= TimeSpan.Zero)
            throw new DomainValidationException("Hold duration must be positive.");

        return new Hold
        {
            Id = Guid.NewGuid(),
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.Held,
            CreatedAt = TimePrecision.TruncateToMicroseconds(nowUtc),
            ExpiresAt = TimePrecision.TruncateToMicroseconds(nowUtc + duration)
        };
    }

    // DB te HELD  thakleo somoi par hoye gele asole EXPIRED।
    // Background job na colleo hisab kokhno vhul hobe na
    public HoldStatus GetEffectiveStatus(DateTime nowUtc) =>
        Status == HoldStatus.Held && ExpiresAt <= nowUtc
            ? HoldStatus.Expired
            : Status;

    // Seat dokhol kore rakhce kina
    public bool IsActive(DateTime nowUtc) =>
        GetEffectiveStatus(nowUtc) is HoldStatus.Held or HoldStatus.Confirmed;

    public void Confirm(DateTime nowUtc)
    {
        // role ৫: agei confirm hoye gele kisu bodlabe na
        if (Status == HoldStatus.Confirmed)
            return;

        var effective = GetEffectiveStatus(nowUtc);
        if (effective != HoldStatus.Held)
            throw new InvalidHoldStateException(
                $"Hold cannot be confirmed because it is {effective.ToString().ToUpperInvariant()}.");

        Status = HoldStatus.Confirmed;
        ConfirmedAt = TimePrecision.TruncateToMicroseconds(nowUtc);
    }

    public void Cancel(DateTime nowUtc)
    {
        // age batil hoye thakle abr batil hoye gele somossa nai
        if (Status == HoldStatus.Cancelled)
            return;

        var effective = GetEffectiveStatus(nowUtc);
        if (effective != HoldStatus.Held)
            throw new InvalidHoldStateException(
                $"Hold cannot be cancelled because it is {effective.ToString().ToUpperInvariant()}.");

        Status = HoldStatus.Cancelled;
        CancelledAt = TimePrecision.TruncateToMicroseconds(nowUtc);
    }

    // Background sweeper ar new hold er age cleanup e bebohar hobe
    public void MarkExpiredIfDue(DateTime nowUtc)
    {
        if (Status == HoldStatus.Held && ExpiresAt <= nowUtc)
            Status = HoldStatus.Expired;
    }
}