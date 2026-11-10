using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SchoolAdmission.Application.Common.Interfaces;

namespace SchoolAdmission.Infrastructure.BackgroundJobs;

// Proti 5 second e somoi par hoye jaoa HELD hold gula DB te EXPIRED kore dey।
// Seat er hisab ei job er upor nirbhor kore na, query gula nijerai expires_at check kore।
// Ei job sudhu DB er status ta porishkar rakhe, jate DB dekhleo bujha jay
public sealed class ExpiredHoldSweeper(
    IServiceScopeFactory scopeFactory,
    IClock clock,
    ILogger<ExpiredHoldSweeper> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await SweepOnceAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // App bondho hocche, kono somossa nai
        }
    }

    private async Task SweepOnceAsync(CancellationToken ct)
    {
        try
        {
            // DbContext scoped, tai protibar notun scope nite hobe
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            var expired = await db.ExpireStaleHoldsAsync(clock.UtcNow, null, ct);
            if (expired > 0)
                logger.LogInformation("Expired {Count} stale hold(s).", expired);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            // DB kichukkhon bondho thakleo app crash korbe na, porer tick e abar try korbe
            logger.LogWarning(ex, "Expired hold sweep failed; will retry on next tick.");
        }
    }
}
