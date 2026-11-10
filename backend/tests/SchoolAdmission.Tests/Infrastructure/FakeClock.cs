using SchoolAdmission.Application.Common.Interfaces;

namespace SchoolAdmission.Tests.Infrastructure;

// Test e somoi nijer hate: Advance() dile real wait chara hold expire kora jay
// Request gula eksathe pore, tai lock diye thread-safe rakhlam
public sealed class FakeClock : IClock
{
    private readonly Lock _lock = new();
    private DateTime _now;

    public FakeClock()
    {
        // Postgres microsecond porjonto rakhe, tai second e kete nilam jate round-trip e mile
        var real = DateTime.UtcNow;
        _now = new DateTime(real.Year, real.Month, real.Day, real.Hour, real.Minute, real.Second, DateTimeKind.Utc);
    }

    public DateTime UtcNow
    {
        get { lock (_lock) return _now; }
    }

    public void Advance(TimeSpan by)
    {
        lock (_lock) _now = _now.Add(by);
    }
}
