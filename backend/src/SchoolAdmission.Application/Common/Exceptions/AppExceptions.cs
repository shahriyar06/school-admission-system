namespace SchoolAdmission.Application.Common.Exceptions;

// Application er error, sathe ekta code thake (exp: "NO_SEATS")
// Api layer e eta theke HTTP status banano hobe
public abstract class AppException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public sealed class BadRequestException(string code, string message) : AppException(code, message);

public sealed class NotFoundException(string code, string message) : AppException(code, message);

public sealed class ForbiddenException(string code, string message) : AppException(code, message);

public sealed class ConflictException(string code, string message) : AppException(code, message);
