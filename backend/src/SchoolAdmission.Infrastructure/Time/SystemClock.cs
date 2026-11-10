using SchoolAdmission.Application.Common.Interfaces;

namespace SchoolAdmission.Infrastructure.Time;

public sealed class SystemClock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
}