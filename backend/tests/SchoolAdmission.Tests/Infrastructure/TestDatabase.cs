using Npgsql;

namespace SchoolAdmission.Tests.Infrastructure;

// Protita factory nijer alada database pay, tai ek test er data onno test e dhuke na
public static class TestDatabase
{
    private const string DefaultBase = "Host=localhost;Port=5433;Username=admission;Password=admission";

    // CI te onno server dite chaile TEST_DB_CONNECTION env var
    public static string BaseConnectionString =>
        Environment.GetEnvironmentVariable("TEST_DB_CONNECTION") is { Length: > 0 } cs ? cs : DefaultBase;

    public static string NewName() => $"admission_test_{Guid.NewGuid():N}";

    public static string ConnectionStringFor(string databaseName) =>
        new NpgsqlConnectionStringBuilder(BaseConnectionString) { Database = databaseName }.ConnectionString;

    public static async Task DropAsync(string databaseName)
    {
        // Pool e idle connection thakle DROP atke jay, tai age pool khali kori
        NpgsqlConnection.ClearAllPools();

        var adminCs = new NpgsqlConnectionStringBuilder(BaseConnectionString)
        {
            Database = "postgres",
            Pooling = false
        }.ConnectionString;

        await using var conn = new NpgsqlConnection(adminCs);
        await conn.OpenAsync();
        // Name amra nijei banai (guid), tai quote kore dilei nirapod
        await using var cmd = new NpgsqlCommand(
            $"DROP DATABASE IF EXISTS \"{databaseName}\" WITH (FORCE)", conn);
        await cmd.ExecuteNonQueryAsync();
    }
}
