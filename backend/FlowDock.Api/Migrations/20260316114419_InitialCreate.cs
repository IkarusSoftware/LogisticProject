using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlowDock.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TargetRoleKeys = table.Column<string[]>(type: "text[]", nullable: false),
                    TargetCompanyIds = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    ShipmentRequestId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsReadBy = table.Column<Guid[]>(type: "uuid[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Permissions = table.Column<string[]>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    WorkStartHour = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    WorkEndHour = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    MaxDailyShipments = table.Column<int>(type: "integer", nullable: false),
                    DefaultVehicleType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    NotificationsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AutoAssignRamp = table.Column<bool>(type: "boolean", nullable: false),
                    MaintenanceMode = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Locations_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    RefreshToken = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RefreshTokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Users_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Ramps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LocationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ramps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ramps_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShipmentRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestNo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    RequesterCompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetLocationId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VehicleType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    LoadDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LoadTime = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    QuantityInfo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ProductInfo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CurrentStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    AssignedSupplierCompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShipmentRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShipmentRequests_Companies_AssignedSupplierCompanyId",
                        column: x => x.AssignedSupplierCompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShipmentRequests_Companies_RequesterCompanyId",
                        column: x => x.RequesterCompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShipmentRequests_Locations_TargetLocationId",
                        column: x => x.TargetLocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShipmentRequests_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ActionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OldValue = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    NewValue = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PerformedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ShipmentRequestId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_ShipmentRequests_ShipmentRequestId",
                        column: x => x.ShipmentRequestId,
                        principalTable: "ShipmentRequests",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_PerformedByUserId",
                        column: x => x.PerformedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GateOperations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShipmentRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArrivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CheckedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    AdmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RampTakenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GateOperations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GateOperations_ShipmentRequests_ShipmentRequestId",
                        column: x => x.ShipmentRequestId,
                        principalTable: "ShipmentRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LoadingOperations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShipmentRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SealNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SealedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FinalizedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ExitAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoadingOperations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoadingOperations_ShipmentRequests_ShipmentRequestId",
                        column: x => x.ShipmentRequestId,
                        principalTable: "ShipmentRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RampAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShipmentRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    RampId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RampAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RampAssignments_Ramps_RampId",
                        column: x => x.RampId,
                        principalTable: "Ramps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RampAssignments_ShipmentRequests_ShipmentRequestId",
                        column: x => x.ShipmentRequestId,
                        principalTable: "ShipmentRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StatusHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShipmentRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    OldStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    NewStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ChangedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatusHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StatusHistories_ShipmentRequests_ShipmentRequestId",
                        column: x => x.ShipmentRequestId,
                        principalTable: "ShipmentRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShipmentRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierCompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    TractorPlate = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TrailerPlate = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DriverFirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DriverLastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DriverPhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AssignmentStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AssignedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VehicleAssignments_Companies_SupplierCompanyId",
                        column: x => x.SupplierCompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VehicleAssignments_ShipmentRequests_ShipmentRequestId",
                        column: x => x.ShipmentRequestId,
                        principalTable: "ShipmentRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActionType",
                table: "AuditLogs",
                column: "ActionType");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_EntityType",
                table: "AuditLogs",
                column: "EntityType");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_PerformedAt",
                table: "AuditLogs",
                column: "PerformedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_PerformedByUserId",
                table: "AuditLogs",
                column: "PerformedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ShipmentRequestId",
                table: "AuditLogs",
                column: "ShipmentRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_GateOperations_ShipmentRequestId",
                table: "GateOperations",
                column: "ShipmentRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LoadingOperations_ShipmentRequestId",
                table: "LoadingOperations",
                column: "ShipmentRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_CompanyId",
                table: "Locations",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_RampAssignments_RampId",
                table: "RampAssignments",
                column: "RampId");

            migrationBuilder.CreateIndex(
                name: "IX_RampAssignments_ShipmentRequestId",
                table: "RampAssignments",
                column: "ShipmentRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Ramps_LocationId",
                table: "Ramps",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Key",
                table: "Roles",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentRequests_AssignedSupplierCompanyId",
                table: "ShipmentRequests",
                column: "AssignedSupplierCompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentRequests_CreatedBy",
                table: "ShipmentRequests",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentRequests_CurrentStatus",
                table: "ShipmentRequests",
                column: "CurrentStatus");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentRequests_LoadDate",
                table: "ShipmentRequests",
                column: "LoadDate");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentRequests_RequesterCompanyId",
                table: "ShipmentRequests",
                column: "RequesterCompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentRequests_RequestNo",
                table: "ShipmentRequests",
                column: "RequestNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentRequests_TargetLocationId",
                table: "ShipmentRequests",
                column: "TargetLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_StatusHistories_ChangedAt",
                table: "StatusHistories",
                column: "ChangedAt");

            migrationBuilder.CreateIndex(
                name: "IX_StatusHistories_ShipmentRequestId",
                table: "StatusHistories",
                column: "ShipmentRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_CompanyId",
                table: "Users",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                table: "Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleAssignments_ShipmentRequestId",
                table: "VehicleAssignments",
                column: "ShipmentRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleAssignments_SupplierCompanyId",
                table: "VehicleAssignments",
                column: "SupplierCompanyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "GateOperations");

            migrationBuilder.DropTable(
                name: "LoadingOperations");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "RampAssignments");

            migrationBuilder.DropTable(
                name: "StatusHistories");

            migrationBuilder.DropTable(
                name: "SystemSettings");

            migrationBuilder.DropTable(
                name: "VehicleAssignments");

            migrationBuilder.DropTable(
                name: "Ramps");

            migrationBuilder.DropTable(
                name: "ShipmentRequests");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Companies");

            migrationBuilder.DropTable(
                name: "Roles");
        }
    }
}
