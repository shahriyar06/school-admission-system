using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Application.Classes;
using SchoolAdmission.Application.Common;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, HoldOptions holdOptions)
    {
        services.AddSingleton(holdOptions);
        services.AddScoped<ClassService>();
        services.AddScoped<HoldService>();
        return services;
    }
}
