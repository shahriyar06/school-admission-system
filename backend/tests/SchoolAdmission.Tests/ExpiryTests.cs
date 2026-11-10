using System.Diagnostics;
using System.Net;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Domain.Enums;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

public sealed class ExpiryTests(AdmissionApiFactory factory) : IClassFixture<AdmissionApiFactory>
{
    private static readonly TimeSpan PastExpiry = TimeSpan.FromSeconds(AdmissionApiFactory.HoldDurationSeconds + 1);

    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Rule2_AfterExpiry_ReadOnlyGetsShowSeatFreeAndHoldExpired()
    {
        var classId = await _client.CreateClassAsync(1);
        var hold = await _client.CreateHoldAsync(classId, StudentIds.Next());

        factory.Clock.Advance(PastExpiry);

        // Sudhu GET call, kono data bodlano API na: tobu hisab thik thakte hobe
        var seats = await _client.GetClassAsync(classId);
        Assert.Equal(0, seats.HeldSeats);
        Assert.Equal(1, seats.AvailableSeats);
        Assert.Equal("EXPIRED", (await _client.GetHoldAsync(hold.HoldId)).Status);
    }

    [Fact]
    public async Task Rule2_AfterExpiry_AnotherStudentCanTakeTheSeat()
    {
        var classId = await _client.CreateClassAsync(1);
        await _client.CreateHoldAsync(classId, StudentIds.Next());
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostHoldAsync(classId, StudentIds.Next())).StatusCode);

        factory.Clock.Advance(PastExpiry);

        var response = await _client.PostHoldAsync(classId, StudentIds.Next());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Rule2_AfterExpiry_OriginalStudentCanApplyAgain()
    {
        var classId = await _client.CreateClassAsync(1);
        var student = StudentIds.Next();
        var oldHold = await _client.CreateHoldAsync(classId, student);

        factory.Clock.Advance(PastExpiry);

        var newHold = await _client.CreateHoldAsync(classId, student);
        Assert.NotEqual(oldHold.HoldId, newHold.HoldId);
        Assert.Equal("HELD", newHold.Status);
        Assert.Equal("EXPIRED", (await _client.GetHoldAsync(oldHold.HoldId)).Status);
    }

    [Fact]
    public async Task Sweeper_AfterClockPassesExpiry_StoredStatusBecomesExpiredInDatabase()
    {
        var classId = await _client.CreateClassAsync(2);
        var hold = await _client.CreateHoldAsync(classId, StudentIds.Next());

        factory.Clock.Advance(PastExpiry);

        // Sweeper proti 5 second e chole, tai 10 second porjonto DB te sorasori dekhi
        var sw = Stopwatch.StartNew();
        HoldStatus stored;
        do
        {
            await using var db = factory.CreateDbContext();
            stored = await db.Holds.AsNoTracking()
                .Where(h => h.Id == hold.HoldId)
                .Select(h => h.Status)
                .SingleAsync();
            if (stored == HoldStatus.Expired) break;
            await Task.Delay(250);
        } while (sw.Elapsed < TimeSpan.FromSeconds(10));

        Assert.Equal(HoldStatus.Expired, stored);
    }
}
