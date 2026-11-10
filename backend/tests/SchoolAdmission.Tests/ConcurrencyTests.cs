using System.Net;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Domain.Enums;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

// Assignment er required concurrency test.
// Idea: onek request ke ekta "gate" (TaskCompletionSource) er pichone dar koriye rakhi,
// tarpor gate khule di, tai sob request asolei eksathe server e pouchay.
// Lock thik na thakle duita request eki somoy "seat ache" dekhe duijonei insert korto (overbooking)।
public sealed class ConcurrencyTests(AdmissionApiFactory factory) : IClassFixture<AdmissionApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    // Gate khular por sob kaj eksathe chalu kore, sob response ferot dey
    internal static async Task<HttpResponseMessage[]> FireTogetherAsync(
        int count, Func<int, Task<HttpResponseMessage>> send)
    {
        var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        var tasks = Enumerable.Range(0, count)
            .Select(i => Task.Run(async () =>
            {
                await gate.Task; // sobai ekhane opekkha korbe
                return await send(i);
            }))
            .ToArray();

        gate.SetResult(); // ek sathe sobaike chere dilam
        return await Task.WhenAll(tasks);
    }

    [Fact]
    public async Task Rule1_FiftySimultaneousHoldsOnFiveSeats_ExactlyFiveSucceedNoOverbooking()
    {
        const int seats = 5;
        const int requests = 50;
        var classId = await _client.CreateClassAsync(seats);

        // 50 jon alada student eksathe ekoi class e apply korche
        var students = Enumerable.Range(0, requests).Select(_ => StudentIds.Next()).ToArray();
        var responses = await FireTogetherAsync(requests, i => _client.PostHoldAsync(classId, students[i]));

        // Kono request e 500 asbe na
        Assert.DoesNotContain(responses, r => (int)r.StatusCode >= 500);

        // Thik 5 jon seat pabe, baki 45 jon NO_SEATS
        var created = responses.Where(r => r.StatusCode == HttpStatusCode.Created).ToList();
        var conflicts = responses.Where(r => r.StatusCode == HttpStatusCode.Conflict).ToList();
        Assert.Equal(seats, created.Count);
        Assert.Equal(requests - seats, conflicts.Count);
        foreach (var conflict in conflicts)
            Assert.Equal("NO_SEATS", await Json.ErrorCodeAsync(conflict));

        // API er hisab o thik
        var classSeats = await _client.GetClassAsync(classId);
        Assert.Equal(seats, classSeats.HeldSeats);
        Assert.Equal(0, classSeats.AvailableSeats);

        // API ke bisshas na kore DB te sorasori gune dekhi: active hold thik 5 ta
        await using var db = factory.CreateDbContext();
        var active = await db.Holds.CountAsync(h =>
            h.ClassId == classId && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed));
        Assert.Equal(seats, active);
    }

    [Fact]
    public async Task Rule3_SameStudentTwentySimultaneousHolds_ExactlyOneSucceeds()
    {
        var classId = await _client.CreateClassAsync(10);
        var student = StudentIds.Next();

        var responses = await FireTogetherAsync(20, _ => _client.PostHoldAsync(classId, student));

        Assert.DoesNotContain(responses, r => (int)r.StatusCode >= 500);
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Created);
        Assert.Equal(19, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        foreach (var conflict in responses.Where(r => r.StatusCode == HttpStatusCode.Conflict))
            Assert.Equal("ALREADY_APPLIED", await Json.ErrorCodeAsync(conflict));

        Assert.Equal(1, (await _client.GetClassAsync(classId)).HeldSeats);
    }

    [Fact]
    public async Task Rule5_TwentySimultaneousConfirmsOnSameHold_AllReturn200AndConfirmedSeatsIsOne()
    {
        var classId = await _client.CreateClassAsync(3);
        var hold = await _client.CreateHoldAsync(classId, StudentIds.Next());

        var responses = await FireTogetherAsync(20, _ => _client.ConfirmAsync(hold.HoldId, hold.StudentId));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        var seats = await _client.GetClassAsync(classId);
        Assert.Equal(1, seats.ConfirmedSeats);
        Assert.Equal(0, seats.HeldSeats);
        Assert.Equal(2, seats.AvailableSeats);
    }
}
