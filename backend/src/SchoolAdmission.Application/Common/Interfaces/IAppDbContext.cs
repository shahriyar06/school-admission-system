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
}