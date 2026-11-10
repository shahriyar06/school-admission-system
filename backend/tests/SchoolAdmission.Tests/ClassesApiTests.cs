using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

public sealed class ClassesApiTests(AdmissionApiFactory factory) : IClassFixture<AdmissionApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task CreateClass_ValidRequest_Returns201WithExactlyIdNameTotalSeatsAndLocation()
    {
        var response = await _client.PostAsJsonAsync("/classes", new { name = "Class 6", totalSeats = 30 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json.ReadAsync(response);
        Assert.Equal(["id", "name", "totalSeats"], Json.PropertyNames(body));
        Assert.Equal("Class 6", body.GetProperty("name").GetString());
        Assert.Equal(30, body.GetProperty("totalSeats").GetInt32());

        var id = body.GetProperty("id").GetGuid();
        Assert.NotNull(response.Headers.Location);
        Assert.EndsWith($"/classes/{id}", response.Headers.Location!.ToString());
    }

    [Fact]
    public async Task CreateClass_NameWithSurroundingSpaces_IsTrimmed()
    {
        var response = await _client.PostAsJsonAsync("/classes", new { name = "   Day Shift   ", totalSeats = 5 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json.ReadAsync(response);
        Assert.Equal("Day Shift", body.GetProperty("name").GetString());
    }

    // Protita invalid body te 400 ar code VALIDATION_ERROR, kokhono 500 na
    [Theory]
    [InlineData("""{ "name": "Bad", "totalSeats": 0 }""")]
    [InlineData("""{ "name": "Bad", "totalSeats": -1 }""")]
    [InlineData("""{ "name": "Bad", "totalSeats": 10001 }""")]
    [InlineData("""{ "name": "Bad" }""")]
    [InlineData("""{ "totalSeats": 10 }""")]
    [InlineData("""{ "name": "    ", "totalSeats": 10 }""")]
    [InlineData("""{ "name": "Bad", "totalSeats": "abc" }""")]
    [InlineData("""{ "name": "Bad", "totalSeats": 1.5 }""")]
    [InlineData("""{ "name": "Bad", "totalSeats": """)]
    [InlineData("")]
    public async Task CreateClass_InvalidBody_Returns400ValidationError(string body)
    {
        var response = await _client.PostAsync("/classes", Json.Raw(body));

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.BadRequest, "VALIDATION_ERROR");
    }

    [Fact]
    public async Task GetClasses_Returns200AndEveryItemHasAllSeatFields()
    {
        await _client.CreateClassAsync(3);
        await _client.CreateClassAsync(7);

        var response = await _client.GetAsync("/classes");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json.ReadAsync(response);
        Assert.True(body.GetArrayLength() >= 2);
        foreach (var item in body.EnumerateArray())
        {
            Assert.Equal(
                ["availableSeats", "confirmedSeats", "heldSeats", "id", "name", "totalSeats"],
                Json.PropertyNames(item));
        }
    }

    [Fact]
    public async Task GetClassById_ExistingClass_Returns200WithFreshSeatCounts()
    {
        var classId = await _client.CreateClassAsync(4, "Science");

        var seats = await _client.GetClassAsync(classId);

        Assert.Equal(new ClassSeats(classId, "Science", 4, 0, 0, 4), seats);
    }

    [Fact]
    public async Task GetClassById_UnknownGuid_Returns404ClassNotFound()
    {
        var response = await _client.GetAsync($"/classes/{Guid.NewGuid()}");

        await ApiClientExtensions.AssertErrorAsync(response, HttpStatusCode.NotFound, "CLASS_NOT_FOUND");
    }

    [Fact]
    public async Task GetClassById_NotAGuid_Returns404()
    {
        var response = await _client.GetAsync("/classes/not-a-guid");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
