using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolAdmission.Domain.Entities;

namespace SchoolAdmission.Infrastructure.Persistence.Configurations;

public sealed class SchoolClassConfiguration : IEntityTypeConfiguration<SchoolClass>
{
    public void Configure(EntityTypeBuilder<SchoolClass> builder)
    {
        builder.ToTable("classes", t =>
            t.HasCheckConstraint("ck_classes_total_seats_positive", "total_seats > 0"));

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");

        builder.Property(c => c.Name)
            .HasColumnName("name")
            .HasMaxLength(SchoolClass.MaxNameLength)
            .IsRequired();

        builder.Property(c => c.TotalSeats).HasColumnName("total_seats");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");
    }
}