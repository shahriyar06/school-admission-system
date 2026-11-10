using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Application.Common.Exceptions;
using SchoolAdmission.Domain.Exceptions;

namespace SchoolAdmission.Api.Middleware;

// Je kono exception ke application/problem+json response e convert korbe, sathe "code" thakbe
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, code, message) = Map(exception);

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception");

        var problem = new ProblemDetails
        {
            Status = status,
            Title = code,
            Detail = message,
            Instance = httpContext.Request.Path
        };
        problem.Extensions["code"] = code;

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(
            problem, (System.Text.Json.JsonSerializerOptions?)null, "application/problem+json", cancellationToken);
        return true;
    }

    private static (int Status, string Code, string Message) Map(Exception exception) => exception switch
    {
        BadRequestException e => (StatusCodes.Status400BadRequest, e.Code, e.Message),
        NotFoundException e => (StatusCodes.Status404NotFound, e.Code, e.Message),
        ForbiddenException e => (StatusCodes.Status403Forbidden, e.Code, e.Message),
        ConflictException e => (StatusCodes.Status409Conflict, e.Code, e.Message),
        DomainValidationException e => (StatusCodes.Status400BadRequest, "VALIDATION_ERROR", e.Message),
        InvalidHoldStateException e => (StatusCodes.Status409Conflict, "INVALID_HOLD_STATE", e.Message),

        // Backup hisebe: C# check par hoye geleo DB er unique index duplicate active hold dhore felbe
        DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } } =>
            (StatusCodes.Status409Conflict, "ALREADY_APPLIED", "Student already has an active hold for this class."),

        BadHttpRequestException e => (StatusCodes.Status400BadRequest, "BAD_REQUEST", e.Message),
        _ => (StatusCodes.Status500InternalServerError, "INTERNAL_ERROR", "An unexpected error occurred.")
    };
}
