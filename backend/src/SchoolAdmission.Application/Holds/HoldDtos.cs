using SchoolAdmission.Application.Common;
using SchoolAdmission.Domain.Entities;

namespace SchoolAdmission.Application.Holds;

public sealed record HoldResponse(
    Guid HoldId,
    Guid ClassId,
    string ClassName,
    string StudentId,
    string Status,
    DateTime ExpiresAt)
{
    // Effective status dekhabo, tai somoi par hoye jaoa HELD hold EXPIRED dekhabe
    public static HoldResponse From(Hold hold, string className, DateTime nowUtc) =>
        new(hold.Id,
            hold.ClassId,
            className,
            hold.StudentId,
            hold.GetEffectiveStatus(nowUtc).ToApiString(),
            hold.ExpiresAt);
}
