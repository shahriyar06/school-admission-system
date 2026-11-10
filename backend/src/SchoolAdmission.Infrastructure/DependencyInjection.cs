using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Application.Common.Interfaces;
using SchoolAdmission.Infrastructure.BackgroundJobs;
using SchoolAdmission.Infrastructure.Persistence;
using SchoolAdmission.Infrastructure.Time;

namespace SchoolAdmission.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddSingleton<IClock, SystemClock>();

        // Background e expire hoye jaoa hold gula porishkar korbe
        services.AddHostedService<ExpiredHoldSweeper>();
        return services;
    }
}