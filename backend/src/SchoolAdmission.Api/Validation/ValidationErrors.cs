using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace SchoolAdmission.Api.Validation;

// ASP.NET er default ModelState error e .NET type name (System.Int32) ar
// barti "The request field is required." thake। Eta client er jonno porishkar errors banay
public static class ValidationErrors
{
    public const string BodyKey = "body";
    public const string BodyInvalidMessage = "Request body is missing or is not valid JSON.";

    public static Dictionary<string, string[]> Clean(ActionContext context)
    {
        var bodyParams = context.ActionDescriptor.Parameters
            .Where(p => p.BindingInfo?.BindingSource == BindingSource.Body)
            .ToList();
        var bodyParamNames = bodyParams.Select(p => p.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var errors = new Dictionary<string, List<string>>();
        var hadImplicitBodyError = false;

        foreach (var (rawKey, entry) in context.ModelState)
        {
            if (entry.Errors.Count == 0)
                continue;

            // Body parse na hole ASP.NET parameter er nam diye ("request") ekta error dey, eta bad
            if (bodyParamNames.Contains(rawKey))
            {
                hadImplicitBodyError = true;
                continue;
            }

            var key = NormalizeKey(rawKey, bodyParamNames);
            foreach (var error in entry.Errors)
            {
                var (finalKey, message) = Describe(key, error.ErrorMessage, bodyParams);
                if (!errors.TryGetValue(finalKey, out var list))
                    errors[finalKey] = list = [];
                if (!list.Contains(message))
                    list.Add(message);
            }
        }

        // Sudhu implicit error thakle (body null), ekta sohoj message
        if (errors.Count == 0 && hadImplicitBodyError)
            errors[BodyKey] = [BodyInvalidMessage];

        return errors.ToDictionary(e => e.Key, e => e.Value.ToArray());
    }

    // "$.totalSeats" → "totalSeats", "$" ba "" → "body"
    private static string NormalizeKey(string rawKey, HashSet<string> bodyParamNames)
    {
        var key = rawKey;
        if (key.StartsWith("$.", StringComparison.Ordinal))
            key = key[2..];
        else if (key is "$" or "")
            return BodyKey;

        var dot = key.IndexOf('.');
        if (dot > 0 && bodyParamNames.Contains(key[..dot]))
            key = key[(dot + 1)..];

        return key.Length == 0 ? BodyKey : char.ToLowerInvariant(key[0]) + key[1..];
    }

    private static (string Key, string Message) Describe(
        string key, string rawMessage, IReadOnlyList<ParameterDescriptor> bodyParams)
    {
        if (key == BodyKey)
            return (BodyKey, BodyInvalidMessage);

        // Vul type: "The JSON value could not be converted to System.Int32..."
        if (rawMessage.Contains("could not be converted", StringComparison.OrdinalIgnoreCase))
            return (key, IsWholeNumber(key, bodyParams)
                ? $"{key} must be a whole number."
                : $"Invalid value for '{key}'.");

        // Baki JSON parser error mane JSON tai vanga
        if (LooksLikeJsonSyntaxError(rawMessage))
            return (BodyKey, BodyInvalidMessage);

        return (key, rawMessage);
    }

    private static bool LooksLikeJsonSyntaxError(string message) =>
        message.Contains("Path: $", StringComparison.Ordinal)
        || message.Contains("LineNumber", StringComparison.Ordinal)
        || message.Contains("BytePositionInLine", StringComparison.Ordinal)
        || message.Contains("JSON", StringComparison.Ordinal);

    // Body model e oi nam er property int/long hole "whole number" message
    private static bool IsWholeNumber(
        string key, IReadOnlyList<ParameterDescriptor> bodyParams)
    {
        foreach (var param in bodyParams)
        {
            var prop = param.ParameterType.GetProperty(
                key, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            if (prop is null)
                continue;

            var type = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
            return type == typeof(int) || type == typeof(long) || type == typeof(short) || type == typeof(byte);
        }
        return false;
    }
}
