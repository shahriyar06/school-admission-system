using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolAdmission.Domain.Common;
using SchoolAdmission.Domain.Entities;
using SchoolAdmission.Domain.Enums;

namespace SchoolAdmission.Infrastructure.Persistence.Configurations;

public sealed class HoldConfiguration : IEntityTypeConfiguration<Hold>
{
    public void Configure(EntityTypeBuilder<Hold> builder)
    {
        builder.ToTable("holds", t =>
            t.HasCheckConstraint("ck_holds_status_valid",
                "status IN ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED')"));

        builder.HasKey(h => h.Id);
        builder.Property(h => h.Id).HasColumnName("id");
        builder.Property(h => h.ClassId).HasColumnName("class_id");

        builder.Property(h => h.StudentId)
            .HasColumnName("student_id")
            .HasMaxLength(StudentIdRules.Length)
            .IsFixedLength()
            .IsRequired();

        // DB te API er motoi "HELD", "CONFIRMED" likha thakbe
        builder.Property(h => h.Status)
            .HasColumnName("status")
            .HasMaxLength(16)
            .HasConversion(
                v => v.ToString().ToUpperInvariant(),
                v => Enum.Parse<HoldStatus>(v, true))
            .IsRequired();

        builder.Property(h => h.ExpiresAt).HasColumnName("expires_at");
        builder.Property(h => h.CreatedAt).HasColumnName("created_at");
        builder.Property(h => h.ConfirmedAt).HasColumnName("confirmed_at");
        builder.Property(h => h.CancelledAt).HasColumnName("cancelled_at");

        builder.HasOne(h => h.Class)
            .WithMany()
            .HasForeignKey(h => h.ClassId)
            .OnDelete(DeleteBehavior.Restrict);

        // rule ৩: ek student ek class e ektar beshi active hold rakhte parbe na
        // sudu C# e check korle race condition hote pare, tai DB leveleo guarantee dilam
        builder.HasIndex(h => new { h.ClassId, h.StudentId })
            .IsUnique()
            .HasFilter("status IN ('HELD', 'CONFIRMED')")
            .HasDatabaseName("ux_holds_active_student_per_class");

        // Seat gonar query fast korar jonno
        builder.HasIndex(h => new { h.ClassId, h.Status, h.ExpiresAt })
            .HasDatabaseName("ix_holds_class_status_expires");

        // GET /me/holds er jonno 
        builder.HasIndex(h => h.StudentId)
            .HasDatabaseName("ix_holds_student_id");
    }
}