namespace SchoolAdmission.Domain.Common;

public static class StudentIdRules
{
    public const int Length = 17;

    // Birth Certificate Number: Exactly 17 digits
    public static bool IsValid(string? value) =>
        value is { Length: Length } && value.All(char.IsAsciiDigit);
}