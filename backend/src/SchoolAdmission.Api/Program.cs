using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Middleware;
using SchoolAdmission.Application;
using SchoolAdmission.Application.Common;
using SchoolAdmission.Infrastructure;
using SchoolAdmission.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

// Hold er meyad env var HOLD_DURATION_SECONDS theke, na dile 600 (10 minute)
// vul value dile startup ei app bondho hoye jabe
var holdSeconds = builder.Configuration.GetValue<int?>("HOLD_DURATION_SECONDS") ?? 600;
if (holdSeconds <= 0)
    throw new InvalidOperationException("HOLD_DURATION_SECONDS must be greater than 0.");

// Kon kon frontend origin allow, comma diye alada kora
var corsOrigins = (builder.Configuration["CORS_ORIGINS"] ?? "http://localhost:3000,http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddApplication(new HoldOptions { Duration = TimeSpan.FromSeconds(holdSeconds) });
builder.Services.AddInfrastructure(connectionString);

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
{
    // Vanga JSON, vul type ba khali body, sob ekhane ese 400 VALIDATION_ERROR hobe
    options.InvalidModelStateResponseFactory = context =>
    {
        var problem = new ValidationProblemDetails(context.ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "VALIDATION_ERROR",
            Detail = "The request is invalid.",
            Instance = context.HttpContext.Request.Path
        };
        problem.Extensions["code"] = "VALIDATION_ERROR";

        return new BadRequestObjectResult(problem)
        {
            ContentTypes = { "application/problem+json" }
        };
    };
});
builder.Services.AddOpenApi();

var app = builder.Build();

// App calu hole migration colbe, tai `docker compose up`dilei table toiri hoye jabe
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseExceptionHandler();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();
app.Run();

// Integration test e WebApplicationFactory<Program> er jonnno
public partial class Program;
