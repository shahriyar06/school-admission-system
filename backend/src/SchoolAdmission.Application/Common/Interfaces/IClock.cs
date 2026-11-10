namespace SchoolAdmission.Application.Common.Interfaces;

// DateTime.UtcNow sorasori bebohar na kore eta diye nibe 
// tahole test e somoi niyontro kora jabe (exp: expiry test)।
public interface IClock
{
    DateTime UtcNow { get; }
}