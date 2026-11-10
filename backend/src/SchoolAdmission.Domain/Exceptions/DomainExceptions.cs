namespace SchoolAdmission.Domain.Exceptions;

public abstract class DomainException(string message) : Exception(message);

// Invalid input (pore 400 hobe)
public sealed class DomainValidationException(string message) : DomainException(message);

// Hold er bortoman obosthai kaj kora jabe na (pore 409 hobe)
public sealed class InvalidHoldStateException(string message) : DomainException(message);