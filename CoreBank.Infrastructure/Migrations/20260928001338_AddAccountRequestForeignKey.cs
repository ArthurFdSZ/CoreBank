using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoreBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountRequestForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_AccountRequests_AccountId",
                table: "AccountRequests",
                column: "AccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_AccountRequests_Accounts_AccountId",
                table: "AccountRequests",
                column: "AccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AccountRequests_Accounts_AccountId",
                table: "AccountRequests");

            migrationBuilder.DropIndex(
                name: "IX_AccountRequests_AccountId",
                table: "AccountRequests");
        }
    }
}
