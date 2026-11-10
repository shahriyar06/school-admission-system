using System.Net;
using System.Text.Json;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

public sealed class ResponseFormatTests(AdmissionApiFactory factory) : IClassFixture<AdmissionApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task ExpiresAt_SameStringFromPostHoldGetHoldAndMyHolds_MicrosecondPrecision()
    {
        // FakeClock second e shuru hoy, tai 100ns er tick jog kori: fix na thakle POST e 7 digit asto
        factory.Clock.Advance(TimeSpan.FromTicks(1_234_567));
        var classId = await _client.CreateClassAsync(2);
        var student = StudentIds.Next();

        var post = await _client.PostHoldAsync(classId, student);
        Assert.Equal(HttpStatusCode.Created, post.StatusCode);
        var postBody = await Json.ReadAsync(post);
        var holdId = postBody.GetProperty("holdId").GetGuid();
        var fromPost = postBody.GetProperty("expiresAt").GetString();

        var fromGet = (await Json.ReadAsync(await _client.GetAsync($"/holds/{holdId}")))
            .GetProperty("expiresAt").GetString();
        var fromMine = (await Json.ReadAsync(await _client.GetMyHoldsAsync(student)))
            .EnumerateArray().Single().GetProperty("expiresAt").GetString();

        Assert.Equal(fromPost, fromGet);
        Assert.Equal(fromPost, fromMine);
        // Microsecond porjonto, tar beshi na
        Assert.DoesNotMatch(@"\.\d{7}", fromPost!);
    }

    // Vanga JSON, vul type, khali body: 400 VALIDATION_ERROR, kintu .NET er internal text bahire jabe na
    [Theory]
    [InlineData("""{ "name": "Bad", "totalSeats": """)]
    [InlineData("""{ "name": "Bad" "totalSeats": 5 }""")]
    [InlineData("""{ "name": "Bad", "totalSeats": "abc" }""")]
    [InlineData("""{ "name": "Bad", "totalSeats": 1.5 }""")]
    [InlineData("""{ "name": "Bad", "totalSeats": true }""")]
    [InlineData("""{ "name": 123, "totalSeats": 5 }""")]
    [InlineData("null")]
    [InlineData("")]
    public async Task ValidationError_MalformedOrWrongTypeOrEmptyBody_CleanBodyWithoutInternalTypeNames(string body)
    {
        var response = await _client.PostAsync("/classes", Json.Raw(body));
        var text = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var doc = JsonDocument.Parse(text);
        var root = doc.RootElement;
        Assert.Equal("VALIDATION_ERROR", root.GetProperty("code").GetString());
        Assert.Equal("VALIDATION_ERROR", root.GetProperty("title").GetString());
        Assert.Equal(400, root.GetProperty("status").GetInt32());
        Assert.True(root.TryGetProperty("detail", out _));
        Assert.True(root.GetProperty("errors").EnumerateObject().Any(), "errors should not be empty");

        Assert.DoesNotContain("System.", text);
        Assert.DoesNotContain("request field", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("SchoolAdmission.", text);
    }

    [Theory]
    [InlineData("""{ "name": "Bad", "totalSeats": "abc" }""", "totalSeats", "totalSeats must be a whole number.")]
    [InlineData("""{ "name": "Bad", "totalSeats": 1.5 }""", "totalSeats", "totalSeats must be a whole number.")]
    [InlineData("""{ "name": 123, "totalSeats": 5 }""", "name", "Invalid value for 'name'.")]
    [InlineData("""{ "name": "Bad", "totalSeats": """, "body", "Request body is missing or is not valid JSON.")]
    [InlineData("", "body", "Request body is missing or is not valid JSON.")]
    [InlineData("null", "body", "Request body is missing or is not valid JSON.")]
    public async Task ValidationError_KeysNormalizedAndMessagesFriendly(string body, string key, string message)
    {
        var response = await _client.PostAsync("/classes", Json.Raw(body));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await Json.ReadAsync(response)).GetProperty("errors");
        Assert.Equal([key], errors.EnumerateObject().Select(p => p.Name).ToArray());
        Assert.Equal([message], errors.GetProperty(key).EnumerateArray().Select(e => e.GetString()!).ToArray());
    }
}
