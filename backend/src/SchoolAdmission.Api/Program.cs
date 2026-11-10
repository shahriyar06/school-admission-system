using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Infrastructure;
using SchoolAdmission.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

builder.Services.AddInfrastructure(connectionString);
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// App calu hole migration colbe, tai `docker compose up`dilei table toiri hoye jabe
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();
app.Run();

// Integration test e WebApplicationFactory<Program> er jonnno
public partial class Program;