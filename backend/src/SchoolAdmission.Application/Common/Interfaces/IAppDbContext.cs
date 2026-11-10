using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using SchoolAdmission.Domain.Entities;

namespace SchoolAdmission.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<SchoolClass> Classes { get; }
    DbSet<Hold> Holds { get; }
    DatabaseFacade Database { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    // Row lock nibe (SELECT ... FOR UPDATE)। Obosshoi transaction er vitore call korte hobe
    Task<SchoolClass?> FindClassForUpdateAsync(Guid classId, CancellationToken ct);
    Task<Hold?> FindHoldForUpdateAsync(Guid holdId, CancellationToken ct);

    // Jei HELD hold er somoi par hoye geche (ExpiresAt <= now) segula EXPIRED kore dibe
    // koyta row update holo seta return korbe
    Task<int> ExpireStaleHoldsAsync(DateTime nowUtc, Guid? classId, CancellationToken ct);
}
