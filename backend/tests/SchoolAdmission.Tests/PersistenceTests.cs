using SchoolAdmission.Tests.Infrastructure;

namespace SchoolAdmission.Tests;

// Rule 6: app bondho kore abar chalu korleo data thakbe, karon sob PostgreSQL e, memory te na
public sealed class PersistenceTests
{
    [Fact]
    public async Task Rule6_DataSurvivesAppRestart_SameDatabaseNewHost()
    {
        // Duita factory i ei database use korbe, tai keu drop korbe na, sheshe nijei drop kori
        var databaseName = TestDatabase.NewName();
        try
        {
            Guid classId;
            HoldDto hold;

            await using (var first = AdmissionApiFactory.ForDatabase(databaseName))
            {
                await first.InitializeAsync();
                var client = first.CreateClient();
                classId = await client.CreateClassAsync(3, "Persistent Class");
                hold = await client.CreateHoldAsync(classId, StudentIds.Next());
                await client.ConfirmAsync(hold.HoldId, hold.StudentId);
            } // ekhane prothom app host puro bondho

            await using var second = AdmissionApiFactory.ForDatabase(databaseName);
            await second.InitializeAsync();
            var restarted = second.CreateClient();

            var seats = await restarted.GetClassAsync(classId);
            Assert.Equal("Persistent Class", seats.Name);
            Assert.Equal(1, seats.ConfirmedSeats);
            Assert.Equal(2, seats.AvailableSeats);

            var storedHold = await restarted.GetHoldAsync(hold.HoldId);
            Assert.Equal("CONFIRMED", storedHold.Status);
            Assert.Equal(hold.StudentId, storedHold.StudentId);
        }
        finally
        {
            await TestDatabase.DropAsync(databaseName);
        }
    }
}
