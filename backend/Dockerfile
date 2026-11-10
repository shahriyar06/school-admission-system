# ---- build: restore + publish ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Age sudhu solution ar csproj copy, tai code bodlale restore layer cache theke asbe
COPY SchoolAdmission.slnx ./
COPY src/SchoolAdmission.Domain/SchoolAdmission.Domain.csproj src/SchoolAdmission.Domain/
COPY src/SchoolAdmission.Application/SchoolAdmission.Application.csproj src/SchoolAdmission.Application/
COPY src/SchoolAdmission.Infrastructure/SchoolAdmission.Infrastructure.csproj src/SchoolAdmission.Infrastructure/
COPY src/SchoolAdmission.Api/SchoolAdmission.Api.csproj src/SchoolAdmission.Api/
COPY tests/SchoolAdmission.Tests/SchoolAdmission.Tests.csproj tests/SchoolAdmission.Tests/
RUN dotnet restore SchoolAdmission.slnx

COPY . .
RUN dotnet publish src/SchoolAdmission.Api -c Release -o /app/publish --no-restore

# ---- test: `docker compose --profile test run --rm tests` ----
FROM build AS test
# Image build er somoy i compile kore rakhi, compile error hole build ei dhora porbe
RUN dotnet build SchoolAdmission.slnx --no-restore
# DB lage, tai test run hobe container chalu hole (TEST_DB_CONNECTION env var theke)
CMD ["dotnet", "test", "SchoolAdmission.slnx", "--no-restore", "--logger", "console;verbosity=normal"]

# ---- final: sudhu runtime, SDK chara choto image ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Root na, image er built-in non-root user diye cholbe
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]
