using System.Text;
using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

// Rule 7: vul input jai hok, server 4xx dibe, kokhono 5xx na
public sealed class NeverReturns500Tests(AdmissionApiFactory factory) : IClassFixture<AdmissionApiFactory>
{
    private const string ValidStudent = "20990000000000001";
    private const string OtherStudent = "20990000000000002";

    private readonly HttpClient _client = factory.CreateClient();

    // {class} ar {hold} test chalanor somoy asol id diye bodle jabe
    // student = null hole header pathabo na; contentType = null hole body o pathabo na
    [Theory]
    // POST /classes
    [InlineData("POST", "/classes", """{ "name": "X", "totalSeats": """, "application/json", null)]
    [InlineData("POST", "/classes", "", "application/json", null)]
    [InlineData("POST", "/classes", "null", "application/json", null)]
    [InlineData("POST", "/classes", "[]", "application/json", null)]
    [InlineData("POST", "/classes", "\"just a string\"", "application/json", null)]
    [InlineData("POST", "/classes", """{ "name": 123, "totalSeats": 5 }""", "application/json", null)]
    [InlineData("POST", "/classes", """{ "name": "X", "totalSeats": "abc" }""", "application/json", null)]
    [InlineData("POST", "/classes", """{ "name": "X", "totalSeats": 99999999999 }""", "application/json", null)]
    [InlineData("POST", "/classes", """{ "name": "X", "totalSeats": true }""", "application/json", null)]
    [InlineData("POST", "/classes", """{ "name": null, "totalSeats": null }""", "application/json", null)]
    [InlineData("POST", "/classes", "{NAME_TOO_LONG}", "application/json", null)]
    [InlineData("POST", "/classes", """{ "name": "X", "totalSeats": 5 }""", "text/plain", null)]
    [InlineData("POST", "/classes", "name=X&totalSeats=5", "application/x-www-form-urlencoded", null)]
    [InlineData("POST", "/classes", "<xml/>", "application/xml", null)]
    // GET /classes/{id}
    [InlineData("GET", "/classes/not-a-guid", null, null, null)]
    [InlineData("GET", "/classes/00000000-0000-0000-0000-000000000000", null, null, null)]
    [InlineData("GET", "/classes/{unknown}", null, null, null)]
    // POST /classes/{id}/holds
    [InlineData("POST", "/classes/{class}/holds", null, null, null)]
    [InlineData("POST", "/classes/{class}/holds", null, null, "")]
    [InlineData("POST", "/classes/{class}/holds", null, null, "123")]
    [InlineData("POST", "/classes/{class}/holds", null, null, "2015269123456789A")]
    [InlineData("POST", "/classes/{class}/holds", null, null, "-2015269123456789")]
    [InlineData("POST", "/classes/{class}/holds", null, null, "20990000000000001,20990000000000002")]
    [InlineData("POST", "/classes/{class}/holds", null, null, "'; DROP TABLE holds; --")]
    [InlineData("POST", "/classes/{unknown}/holds", null, null, ValidStudent)]
    [InlineData("POST", "/classes/not-a-guid/holds", null, null, ValidStudent)]
    [InlineData("POST", "/classes/{class}/holds", null, null, ValidStudent)] // agei hold ache → 409
    [InlineData("POST", "/classes/{full}/holds", null, null, OtherStudent)] // seat nai → 409
    // GET /holds/{id}
    [InlineData("GET", "/holds/not-a-guid", null, null, null)]
    [InlineData("GET", "/holds/{unknown}", null, null, null)]
    // POST /holds/{id}/confirm
    [InlineData("POST", "/holds/{hold}/confirm", null, null, null)]
    [InlineData("POST", "/holds/{hold}/confirm", null, null, "abc")]
    [InlineData("POST", "/holds/{hold}/confirm", null, null, OtherStudent)]
    [InlineData("POST", "/holds/{unknown}/confirm", null, null, ValidStudent)]
    [InlineData("POST", "/holds/not-a-guid/confirm", null, null, ValidStudent)]
    [InlineData("POST", "/holds/{cancelled}/confirm", null, null, ValidStudent)]
    // DELETE /holds/{id}
    [InlineData("DELETE", "/holds/{hold}", null, null, null)]
    [InlineData("DELETE", "/holds/{hold}", null, null, "1")]
    [InlineData("DELETE", "/holds/{hold}", null, null, OtherStudent)]
    [InlineData("DELETE", "/holds/{unknown}", null, null, ValidStudent)]
    [InlineData("DELETE", "/holds/not-a-guid", null, null, ValidStudent)]
    [InlineData("DELETE", "/holds/{confirmed}", null, null, ValidStudent)]
    // GET /me/holds
    [InlineData("GET", "/me/holds", null, null, null)]
    [InlineData("GET", "/me/holds", null, null, "12345")]
    [InlineData("GET", "/me/holds", null, null, "                 ")]
    // Route i nai / method allow na
    [InlineData("PUT", "/classes", null, null, null)]
    [InlineData("PATCH", "/holds/{hold}", null, null, ValidStudent)]
    [InlineData("GET", "/does-not-exist", null, null, null)]
    public async Task Rule7_BadInput_AlwaysReturns4xxNever5xx(
        string method, string urlTemplate, string? body, string? contentType, string? student)
    {
        var url = await ResolveAsync(urlTemplate);
        var request = ApiClientExtensions.WithStudent(new HttpMethod(method), url, student);
        if (contentType is not null)
        {
            var text = body == "{NAME_TOO_LONG}"
                ? $$"""{ "name": "{{new string('a', 201)}}", "totalSeats": 5 }"""
                : body ?? "";
            request.Content = new StringContent(text, Encoding.UTF8);
            request.Content.Headers.ContentType = new(contentType);
        }

        var response = await _client.SendAsync(request);

        var status = (int)response.StatusCode;
        Assert.True(status is >= 400 and < 500,
            $"{method} {urlTemplate} returned {status}: {await response.Content.ReadAsStringAsync()}");
    }

    // Protita case er jonno notun class/hold, jate ek case onno case ke prabhabito na kore
    private async Task<string> ResolveAsync(string template)
    {
        if (template.Contains("{unknown}"))
            return template.Replace("{unknown}", Guid.NewGuid().ToString());

        if (template.Contains("{full}"))
        {
            var full = await _client.CreateClassAsync(1);
            await _client.CreateHoldAsync(full, StudentIds.Next());
            return template.Replace("{full}", full.ToString());
        }

        if (!template.Contains('{'))
            return template;

        var classId = await _client.CreateClassAsync(5);
        var hold = await _client.CreateHoldAsync(classId, ValidStudent);

        if (template.Contains("{cancelled}"))
        {
            await _client.CancelAsync(hold.HoldId, ValidStudent);
            return template.Replace("{cancelled}", hold.HoldId.ToString());
        }

        if (template.Contains("{confirmed}"))
        {
            await _client.ConfirmAsync(hold.HoldId, ValidStudent);
            return template.Replace("{confirmed}", hold.HoldId.ToString());
        }

        return template.Replace("{class}", classId.ToString()).Replace("{hold}", hold.HoldId.ToString());
    }
}
