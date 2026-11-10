using SchoolAdmission.Domain.Enums;

namespace SchoolAdmission.Application.Common;

public static class HoldStatusExtensions
{
    // API te status sob somoi uppercase e jabe: "HELD", "CONFIRMED", ...
    public static string ToApiString(this HoldStatus status) =>
        status.ToString().ToUpperInvariant();
}
