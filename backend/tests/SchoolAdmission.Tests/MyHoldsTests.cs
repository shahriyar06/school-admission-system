using System.Net;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

public sealed class MyHoldsTests(AdmissionApiFactory factory) : IClassFixture<AdmissionApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task MyHolds_ReturnsOnlyThisStudentsHoldsWithAllFields_NewestFirst()
    {
        var me = StudentIds.Next();
        var other = StudentIds.Next();
        var classA = await _client.CreateClassAsync(5, "Class A");
        var classB = await _client.CreateClassAsync(5, "Class B");

        // CreatedAt FakeClock theke ase, tai majhe somoi bariye order nischit korlam
        var first = await _client.CreateHoldAsync(classA, me);
        factory.Clock.Advance(TimeSpan.FromSeconds(1));
        await _client.CreateHoldAsync(classA, other);
        factory.Clock.Advance(TimeSpan.FromSeconds(1));
        var second = await _client.CreateHoldAsync(classB, me);
        await _client.ConfirmAsync(first.HoldId, me);

        var response = await _client.GetMyHoldsAsync(me);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json.ReadAsync(response);
        var items = body.EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        foreach (var item in items)
        {
            foreach (var field in new[] { "holdId", "classId", "className", "status", "expiresAt" })
                Assert.True(item.TryGetProperty(field, out _), $"Field '{field}' missing");
            Assert.Equal(me, item.GetProperty("studentId").GetString());
        }

        Assert.Equal(second.HoldId, items[0].GetProperty("holdId").GetGuid());
        Assert.Equal("Class B", items[0].GetProperty("className").GetString());
        Assert.Equal("HELD", items[0].GetProperty("status").GetString());
        Assert.Equal(first.HoldId, items[1].GetProperty("holdId").GetGuid());
        Assert.Equal("Class A", items[1].GetProperty("className").GetString());
        Assert.Equal("CONFIRMED", items[1].GetProperty("status").GetString());
    }

    [Fact]
    public async Task MyHolds_StudentWithNoHolds_ReturnsEmptyList()
    {
        var response = await _client.GetMyHoldsAsync(StudentIds.Next());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, (await Json.ReadAsync(response)).GetArrayLength());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("12345")]
    [InlineData("abcdefghijklmnopq")]
    public async Task MyHolds_MissingOrInvalidStudentId_Returns400InvalidStudentId(string? studentId)
    {
        var response = await _client.GetMyHoldsAsync(studentId);

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.BadRequest, "INVALID_STUDENT_ID");
    }
}
