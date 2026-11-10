using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SchoolAdmission.Application.Common.Interfaces;
using SchoolAdmission.Infrastructure.Persistence;

namespace SchoolAdmission.Tests.Infrastructure;

// Asol Program.cs diye in-memory server, kintu nijer test database ar FakeClock niye
public sealed class AdmissionApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const int HoldDurationSeconds = 600;

    private readonly bool _ownsDatabase;
    private bool _dropped;

    // xUnit IClassFixture er jonno parameter chara constructor: notun database banabe
    public AdmissionApiFactory() : this(null) { }

    // Database name dile oi database e connect korbe (multi-instance / persistence test),
    // tokhon database ta ei factory er na, tai dispose e drop korbe na
    private AdmissionApiFactory(string? databaseName)
    {
        _ownsDatabase = databaseName is null;
        DatabaseName = databaseName ?? TestDatabase.NewName();
        ConnectionString = TestDatabase.ConnectionStringFor(DatabaseName);
    }

    public static AdmissionApiFactory ForDatabase(string databaseName) => new(databaseName);

    public string DatabaseName { get; }
    public string ConnectionString { get; }
    public FakeClock Clock { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", ConnectionString);
        builder.UseSetting("HOLD_DURATION_SECONDS", HoldDurationSeconds.ToString());

        builder.ConfigureTestServices(services =>
        {
            // Asol SystemClock er jaygay FakeClock, sweeper o eta-i pabe
            services.RemoveAll<IClock>();
            services.AddSingleton<IClock>(Clock);
        });
    }

    // Server chalu (Migrate() database banabe) ar check kori je asolei test database e achi
    public Task InitializeAsync()
    {
        using var scope = Services.CreateScope();
        var actual = scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.GetConnectionString();
        if (actual is null || !actual.Contains(DatabaseName))
            throw new InvalidOperationException(
                $"App test database '{DatabaseName}' e connect kore nai, connection string: '{actual}'");
        return Task.CompletedTask;
    }

    public AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConnectionString).Options);

    Task IAsyncLifetime.DisposeAsync() => DisposeAsync().AsTask();

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();

        if (_ownsDatabase && !_dropped)
        {
            _dropped = true;
            await TestDatabase.DropAsync(DatabaseName);
        }
    }
}
