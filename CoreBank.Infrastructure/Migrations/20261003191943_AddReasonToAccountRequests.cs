using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoreBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReasonToAccountRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Reason",
                table: "AccountRequests",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Reason",
                table: "AccountRequests");
        }
    }
}
