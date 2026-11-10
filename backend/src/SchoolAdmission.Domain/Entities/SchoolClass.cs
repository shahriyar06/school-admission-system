using SchoolAdmission.Domain.Common;
using SchoolAdmission.Domain.Exceptions;

namespace SchoolAdmission.Domain.Entities;

public class SchoolClass
{
    public const int MaxNameLength = 200;
    public const int MaxSeats = 10_000;

    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public int TotalSeats { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private SchoolClass() { } // EF Core er jonno

    public static SchoolClass Create(string? name, int totalSeats, DateTime nowUtc)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length == 0)
            throw new DomainValidationException("Class name is required.");
        if (trimmed.Length > MaxNameLength)
            throw new DomainValidationException($"Class name must be at most {MaxNameLength} characters.");
        if (totalSeats <= 0)
            throw new DomainValidationException("Total seats must be greater than 0.");
        if (totalSeats > MaxSeats)
            throw new DomainValidationException($"Total seats must be at most {MaxSeats}.");

        return new SchoolClass
        {
            Id = Guid.NewGuid(),
            Name = trimmed,
            TotalSeats = totalSeats,
            CreatedAt = TimePrecision.TruncateToMicroseconds(nowUtc)
        };
    }
}