namespace SchoolAdmission.Domain.Common;

public static class TimePrecision
{
    // PostgreSQL microsecond porjonto rakhe, .NET rakhe 100ns tick।
    // Age thekei kete rakhle POST er response ar porer GET e eki value asbe
    public static DateTime TruncateToMicroseconds(DateTime utc) =>
        new(utc.Ticks - utc.Ticks % 10, DateTimeKind.Utc);
}
