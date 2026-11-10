using System.Net;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Domain.Enums;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

// Bonus §1.6: backend er duita instance eksathe ekoi database e.
// Duita AdmissionApiFactory = duita alada app host, alada DI container, alada memory।
// Tader moddhe kono C# lock / static state share hoy na, sudhu PostgreSQL ta common।
// Tai jodi 50 ta request duita host e bhag kore pathiye o thik 5 ta pass kore, tahole
// proman hoy je lock ta DB level e (SELECT ... FOR UPDATE classes row e), in-memory na।
public sealed class MultiInstanceTests
{
    [Fact]
    public async Task Bonus_TwoAppInstancesSharingOneDatabase_FiftyHoldsOnFiveSeats_ExactlyFiveSucceed()
    {
        const int seats = 5;
        const int requests = 50;

        await using var instanceA = new AdmissionApiFactory();
        await instanceA.InitializeAsync();
        await using var instanceB = AdmissionApiFactory.ForDatabase(instanceA.DatabaseName);
        await instanceB.InitializeAsync();

        var clientA = instanceA.CreateClient();
        var clientB = instanceB.CreateClient();

        var classId = await clientA.CreateClassAsync(seats);
        var students = Enumerable.Range(0, requests).Select(_ => StudentIds.Next()).ToArray();

        // Request cholar somoy DB te barbar gune dekhi, active hold kokhono totalSeats er beshi na hoy
        using var stopWatching = new CancellationTokenSource();
        var maxSeen = 0;
        var watcher = Task.Run(async () =>
        {
            await using var db = instanceA.CreateDbContext();
            while (!stopWatching.IsCancellationRequested)
            {
                var active = await db.Holds.AsNoTracking().CountAsync(h =>
                    h.ClassId == classId && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed));
                maxSeen = Math.Max(maxSeen, active);
                await Task.Delay(5);
            }
        });

        // Jor request A te, bijor request B te
        var responses = await ConcurrencyTests.FireTogetherAsync(requests, i =>
            (i % 2 == 0 ? clientA : clientB).PostHoldAsync(classId, students[i]));

        stopWatching.Cancel();
        await watcher;

        Assert.DoesNotContain(responses, r => (int)r.StatusCode >= 500);
        Assert.Equal(seats, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(requests - seats, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        Assert.True(maxSeen <= seats, $"Active holds reached {maxSeen}, more than {seats} seats");

        // Duita instance thekei eki hisab dekhabe
        var seatsFromA = await clientA.GetClassAsync(classId);
        var seatsFromB = await clientB.GetClassAsync(classId);
        Assert.Equal(seatsFromA, seatsFromB);
        Assert.Equal(seats, seatsFromA.HeldSeats + seatsFromA.ConfirmedSeats);
        Assert.Equal(0, seatsFromA.AvailableSeats);
    }
}
