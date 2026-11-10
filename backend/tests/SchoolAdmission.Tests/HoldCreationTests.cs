using System.Net;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

public sealed class HoldCreationTests(AdmissionApiFactory factory) : IClassFixture<AdmissionApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task CreateHold_ValidRequest_Returns201HeldWithExpiresAtNowPlusHoldDuration()
    {
        var classId = await _client.CreateClassAsync(3);
        var student = StudentIds.Next();
        var now = factory.Clock.UtcNow;

        var response = await _client.PostHoldAsync(classId, student);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json.ReadAsync(response);
        foreach (var field in new[] { "holdId", "classId", "studentId", "status", "expiresAt" })
            Assert.True(body.TryGetProperty(field, out _), $"Field '{field}' missing");

        Assert.Equal(classId, body.GetProperty("classId").GetGuid());
        Assert.Equal(student, body.GetProperty("studentId").GetString());
        Assert.Equal("HELD", body.GetProperty("status").GetString());
        var expiresAt = body.GetProperty("expiresAt").GetDateTime().ToUniversalTime();
        Assert.Equal(now.AddSeconds(AdmissionApiFactory.HoldDurationSeconds), expiresAt);

        var holdId = body.GetProperty("holdId").GetGuid();
        Assert.EndsWith($"/holds/{holdId}", response.Headers.Location!.ToString());
    }

    [Fact]
    public async Task Rule3_SameStudentSameClassTwice_Returns409AlreadyApplied()
    {
        var classId = await _client.CreateClassAsync(5);
        var student = StudentIds.Next();
        await _client.CreateHoldAsync(classId, student);

        var second = await _client.PostHoldAsync(classId, student);

        await ApiClientExtensions.AssertErrorAsync(second, HttpStatusCode.Conflict, "ALREADY_APPLIED");
    }

    [Fact]
    public async Task Rule3_SameStudentDifferentClass_Returns201()
    {
        var classA = await _client.CreateClassAsync(5);
        var classB = await _client.CreateClassAsync(5);
        var student = StudentIds.Next();
        await _client.CreateHoldAsync(classA, student);

        var response = await _client.PostHoldAsync(classB, student);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Rule1_ClassWithNoSeatsLeft_Returns409NoSeats()
    {
        var classId = await _client.CreateClassAsync(1);
        await _client.CreateHoldAsync(classId, StudentIds.Next());

        var response = await _client.PostHoldAsync(classId, StudentIds.Next());

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.Conflict, "NO_SEATS");
    }

    // null = header e pathabo na
    [Theory]
    [InlineData(null)]
    [InlineData("2015269123456789")]
    [InlineData("201526912345678901")]
    [InlineData("2015269123456789A")]
    [InlineData("2015 2691 2345 678")]
    public async Task CreateHold_MissingOrInvalidStudentId_Returns400InvalidStudentId(string? studentId)
    {
        var classId = await _client.CreateClassAsync(5);

        var response = await _client.PostHoldAsync(classId, studentId);

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.BadRequest, "INVALID_STUDENT_ID");
    }

    [Fact]
    public async Task CreateHold_UnknownClass_Returns404ClassNotFound()
    {
        var response = await _client.PostHoldAsync(Guid.NewGuid(), StudentIds.Next());

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.NotFound, "CLASS_NOT_FOUND");
    }

    [Fact]
    public async Task SeatCounts_AfterTwoHolds_HeldSeatsTwoAndAvailableReduced()
    {
        var classId = await _client.CreateClassAsync(5);
        await _client.CreateHoldAsync(classId, StudentIds.Next());
        await _client.CreateHoldAsync(classId, StudentIds.Next());

        var seats = await _client.GetClassAsync(classId);

        Assert.Equal(2, seats.HeldSeats);
        Assert.Equal(0, seats.ConfirmedSeats);
        Assert.Equal(3, seats.AvailableSeats);
    }
}
