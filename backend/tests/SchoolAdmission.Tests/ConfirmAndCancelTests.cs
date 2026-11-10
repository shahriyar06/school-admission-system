using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

public sealed class ConfirmAndCancelTests(AdmissionApiFactory factory) : IClassFixture<AdmissionApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private async Task<(Guid ClassId, HoldDto Hold)> NewHoldAsync(int seats = 3)
    {
        var classId = await _client.CreateClassAsync(seats);
        var hold = await _client.CreateHoldAsync(classId, StudentIds.Next());
        return (classId, hold);
    }

    [Fact]
    public async Task Rule4_OwnerConfirms_Returns200ConfirmedAndSeatMovesFromHeldToConfirmed()
    {
        var (classId, hold) = await NewHoldAsync();

        var response = await _client.ConfirmAsync(hold.HoldId, hold.StudentId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<HoldDto>(Json.Options);
        Assert.Equal("CONFIRMED", body!.Status);

        var seats = await _client.GetClassAsync(classId);
        Assert.Equal(1, seats.ConfirmedSeats);
        Assert.Equal(0, seats.HeldSeats);
    }

    [Fact]
    public async Task Rule5_ConfirmTwice_BothReturn200AndConfirmedSeatsStaysOne()
    {
        var (classId, hold) = await NewHoldAsync();

        var first = await _client.ConfirmAsync(hold.HoldId, hold.StudentId);
        var second = await _client.ConfirmAsync(hold.HoldId, hold.StudentId);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal("CONFIRMED", (await second.Content.ReadFromJsonAsync<HoldDto>(Json.Options))!.Status);
        Assert.Equal(1, (await _client.GetClassAsync(classId)).ConfirmedSeats);
    }

    [Fact]
    public async Task Rule4_AnotherStudentConfirms_Returns403Forbidden()
    {
        var (_, hold) = await NewHoldAsync();

        var response = await _client.ConfirmAsync(hold.HoldId, StudentIds.Next());

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.Forbidden, "FORBIDDEN");
    }

    [Fact]
    public async Task Rule4_ConfirmAfterExpiry_Returns409()
    {
        var (_, hold) = await NewHoldAsync();
        factory.Clock.Advance(TimeSpan.FromSeconds(AdmissionApiFactory.HoldDurationSeconds + 1));

        var response = await _client.ConfirmAsync(hold.HoldId, hold.StudentId);

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.Conflict, "INVALID_HOLD_STATE");
    }

    [Fact]
    public async Task ConfirmCancelledHold_Returns409()
    {
        var (_, hold) = await NewHoldAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await _client.CancelAsync(hold.HoldId, hold.StudentId)).StatusCode);

        var response = await _client.ConfirmAsync(hold.HoldId, hold.StudentId);

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.Conflict, "INVALID_HOLD_STATE");
    }

    [Fact]
    public async Task CancelOwnHeldHold_Returns204AndFreesSeat_CancelAgainAlso204()
    {
        var (classId, hold) = await NewHoldAsync(seats: 1);
        Assert.Equal(0, (await _client.GetClassAsync(classId)).AvailableSeats);

        var first = await _client.CancelAsync(hold.HoldId, hold.StudentId);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        var seats = await _client.GetClassAsync(classId);
        Assert.Equal(0, seats.HeldSeats);
        Assert.Equal(1, seats.AvailableSeats);
        Assert.Equal("CANCELLED", (await _client.GetHoldAsync(hold.HoldId)).Status);

        // Seat asolei khali: onno student nite parbe
        Assert.Equal(HttpStatusCode.Created, (await _client.PostHoldAsync(classId, StudentIds.Next())).StatusCode);

        var second = await _client.CancelAsync(hold.HoldId, hold.StudentId);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
    }

    [Fact]
    public async Task CancelConfirmedHold_Returns409()
    {
        var (_, hold) = await NewHoldAsync();
        await _client.ConfirmAsync(hold.HoldId, hold.StudentId);

        var response = await _client.CancelAsync(hold.HoldId, hold.StudentId);

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.Conflict, "INVALID_HOLD_STATE");
    }

    [Fact]
    public async Task CancelByAnotherStudent_Returns403Forbidden()
    {
        var (_, hold) = await NewHoldAsync();

        var response = await _client.CancelAsync(hold.HoldId, StudentIds.Next());

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.Forbidden, "FORBIDDEN");
        Assert.Equal("HELD", (await _client.GetHoldAsync(hold.HoldId)).Status);
    }

    [Fact]
    public async Task ConfirmWithoutStudentHeader_Returns400InvalidStudentId()
    {
        var (_, hold) = await NewHoldAsync();

        var response = await _client.ConfirmAsync(hold.HoldId, null);

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.BadRequest, "INVALID_STUDENT_ID");
    }

    [Fact]
    public async Task CancelWithoutStudentHeader_Returns400InvalidStudentId()
    {
        var (_, hold) = await NewHoldAsync();

        var response = await _client.CancelAsync(hold.HoldId, null);

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.BadRequest, "INVALID_STUDENT_ID");
    }
}
