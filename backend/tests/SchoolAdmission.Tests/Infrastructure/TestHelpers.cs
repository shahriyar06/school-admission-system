using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace SchoolAdmission.Tests.Infrastructure;

// Protita test e notun student lagbe, eksathe onek thread theke chaile o duplicate hobe na
public static class StudentIds
{
    private static long _counter = 20150000000000000;

    public static string Next() => Interlocked.Increment(ref _counter).ToString("D17");
}

// API camelCase JSON dey, tai Web default use korlam
public static class Json
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static StringContent Raw(string body) =>
        new(body, Encoding.UTF8, "application/json");

    public static async Task<JsonElement> ReadAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(text);
        return doc.RootElement.Clone();
    }

    public static string[] PropertyNames(JsonElement obj) =>
        obj.EnumerateObject().Select(p => p.Name).OrderBy(n => n).ToArray();

    public static async Task<string?> ErrorCodeAsync(HttpResponseMessage response)
    {
        var body = await ReadAsync(response);
        return body.TryGetProperty("code", out var code) ? code.GetString() : null;
    }
}

public sealed record ClassSeats(Guid Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);

public sealed record HoldDto(Guid HoldId, Guid ClassId, string ClassName, string StudentId, string Status, DateTime ExpiresAt);

// Class/hold banano ar request pathano sohoj korar jonno
public static class ApiClientExtensions
{
    public const string StudentHeader = "X-Student-Id";

    public static async Task<Guid> CreateClassAsync(this HttpClient client, int totalSeats, string? name = null)
    {
        var response = await client.PostAsJsonAsync("/classes",
            new { name = name ?? $"Class {Guid.NewGuid():N}", totalSeats }, Json.Options);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json.ReadAsync(response);
        return body.GetProperty("id").GetGuid();
    }

    public static Task<HttpResponseMessage> PostHoldAsync(this HttpClient client, Guid classId, string? studentId) =>
        client.SendAsync(WithStudent(HttpMethod.Post, $"/classes/{classId}/holds", studentId));

    public static async Task<HoldDto> CreateHoldAsync(this HttpClient client, Guid classId, string studentId)
    {
        var response = await client.PostHoldAsync(classId, studentId);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<HoldDto>(Json.Options))!;
    }

    public static Task<HttpResponseMessage> ConfirmAsync(this HttpClient client, Guid holdId, string? studentId) =>
        client.SendAsync(WithStudent(HttpMethod.Post, $"/holds/{holdId}/confirm", studentId));

    public static Task<HttpResponseMessage> CancelAsync(this HttpClient client, Guid holdId, string? studentId) =>
        client.SendAsync(WithStudent(HttpMethod.Delete, $"/holds/{holdId}", studentId));

    public static Task<HttpResponseMessage> GetMyHoldsAsync(this HttpClient client, string? studentId) =>
        client.SendAsync(WithStudent(HttpMethod.Get, "/me/holds", studentId));

    public static async Task<ClassSeats> GetClassAsync(this HttpClient client, Guid classId)
    {
        var response = await client.GetAsync($"/classes/{classId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ClassSeats>(Json.Options))!;
    }

    public static async Task<HoldDto> GetHoldAsync(this HttpClient client, Guid holdId)
    {
        var response = await client.GetAsync($"/holds/{holdId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<HoldDto>(Json.Options))!;
    }

    // studentId null hole header ei pathabo na
    public static HttpRequestMessage WithStudent(HttpMethod method, string url, string? studentId)
    {
        var request = new HttpRequestMessage(method, url);
        if (studentId is not null)
            request.Headers.TryAddWithoutValidation(StudentHeader, studentId);
        return request;
    }

    public static async Task AssertErrorAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, await Json.ErrorCodeAsync(response));
    }
}
