using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoreBank.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountOpeningRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // =========================================================
            // ACCOUNT ID
            // =========================================================
            // A conta passa a ser opcional porque uma solicitação de
            // abertura pode existir antes da conta bancária ser criada.
            migrationBuilder.AlterColumn<int>(
                name: "AccountId",
                table: "AccountRequests",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            // =========================================================
            // CUSTOMER ID
            // =========================================================
            // Adiciona o cliente responsável pela solicitação.
            migrationBuilder.AddColumn<int>(
                name: "CustomerId",
                table: "AccountRequests",
                type: "int",
                nullable: true);

            // =========================================================
            // MIGRAÇÃO DOS REGISTROS ANTIGOS
            // =========================================================
            // As solicitações que já existiam possuíam somente AccountId.
            //
            // Como cada conta já pertence a um cliente, buscamos o
            // CustomerId da conta e gravamos na solicitação antiga.
            //
            // Isso evita perder ou invalidar as solicitações existentes.
            migrationBuilder.Sql(@"
                UPDATE AR
                SET AR.CustomerId = A.CustomerId
                FROM AccountRequests AR
                INNER JOIN Accounts A ON A.Id = AR.AccountId
                WHERE AR.CustomerId IS NULL;
            ");

            // =========================================================
            // ÍNDICE
            // =========================================================
            migrationBuilder.CreateIndex(
                name: "IX_AccountRequests_CustomerId",
                table: "AccountRequests",
                column: "CustomerId");

            // =========================================================
            // RELACIONAMENTO COM CUSTOMER
            // =========================================================
            migrationBuilder.AddForeignKey(
                name: "FK_AccountRequests_Customers_CustomerId",
                table: "AccountRequests",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // =========================================================
            // REMOVE O RELACIONAMENTO COM CUSTOMER
            // =========================================================
            migrationBuilder.DropForeignKey(
                name: "FK_AccountRequests_Customers_CustomerId",
                table: "AccountRequests");

            // =========================================================
            // REMOVE O ÍNDICE
            // =========================================================
            migrationBuilder.DropIndex(
                name: "IX_AccountRequests_CustomerId",
                table: "AccountRequests");

            // =========================================================
            // REMOVE CUSTOMER ID
            // =========================================================
            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "AccountRequests");

            // =========================================================
            // ACCOUNT ID VOLTA A SER OBRIGATÓRIO
            // =========================================================
            migrationBuilder.AlterColumn<int>(
                name: "AccountId",
                table: "AccountRequests",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}