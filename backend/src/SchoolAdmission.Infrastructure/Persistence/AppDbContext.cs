using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Application.Common.Interfaces;
using SchoolAdmission.Domain.Entities;
using SchoolAdmission.Domain.Enums;

namespace SchoolAdmission.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options), IAppDbContext
{
    public DbSet<SchoolClass> Classes => Set<SchoolClass>();
    public DbSet<Hold> Holds => Set<Hold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

    // FOR UPDATE lock ta PostgreSQL nijei dhore rakhe, ei process na।
    // tai backend er ekadhik instance cholleo request gula ekta ekta kore line e cholbe
    // SingleOrDefaultAsync na diye ToListAsync use korlam, karon EF tahole SQL ke
    // subquery te wrap korbe na, FOR UPDATE thik moto kaj korbe
    public async Task<SchoolClass?> FindClassForUpdateAsync(Guid classId, CancellationToken ct)
    {
        var rows = await Classes
            .FromSql($"SELECT * FROM classes WHERE id = {classId} FOR UPDATE")
            .ToListAsync(ct);
        return rows.SingleOrDefault();
    }

    public async Task<Hold?> FindHoldForUpdateAsync(Guid holdId, CancellationToken ct)
    {
        var rows = await Holds
            .FromSql($"SELECT * FROM holds WHERE id = {holdId} FOR UPDATE")
            .ToListAsync(ct);
        return rows.SingleOrDefault();
    }

    public Task<int> ExpireStaleHoldsAsync(DateTime nowUtc, Guid? classId, CancellationToken ct)
    {
        var query = Holds.Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= nowUtc);
        if (classId is { } id)
            query = query.Where(h => h.ClassId == id);

        return query.ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.Expired), ct);
    }
}
