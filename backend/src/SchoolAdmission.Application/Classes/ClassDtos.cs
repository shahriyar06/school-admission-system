namespace SchoolAdmission.Application.Classes;

// Nullable rakhlam, jate field na dile chupchap 0 hoye na jay, VALIDATION_ERROR dite pari
public sealed record CreateClassRequest(string? Name, int? TotalSeats);

public sealed record ClassResponse(Guid Id, string Name, int TotalSeats);

public sealed record ClassSeatsResponse(
    Guid Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats);
