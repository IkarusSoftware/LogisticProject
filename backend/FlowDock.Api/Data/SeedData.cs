using FlowDock.Api.Models.Entities;
using FlowDock.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace FlowDock.Api.Data;

public static class SeedData
{
    private const string DemoPasswordHash = "$2a$11$K4nZ5Yj0U7YQ3Pv6M8j2dOqEXvG5f1w2x9z0vN8bA7cD6eF4gH3i";

    public static async Task InitializeAsync(AppDbContext context)
    {
        if (await context.Companies.AnyAsync())
            return;

        var now = DateTime.UtcNow;
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("demo123");

        // Companies
        var companies = new[]
        {
            new Company { Id = SeedIds.CompanyGratis, Name = "Gratis", Type = CompanyType.Main, Status = RecordStatus.Active, CreatedAt = now.AddDays(-240), UpdatedAt = now.AddDays(-2) },
            new Company { Id = SeedIds.CompanyAnadolu, Name = "Mars Lojistik", Type = CompanyType.Supplier, Status = RecordStatus.Active, CreatedAt = now.AddDays(-180), UpdatedAt = now.AddDays(-3) },
            new Company { Id = SeedIds.CompanyKuzey, Name = "Mevlana Lojistik", Type = CompanyType.Logistics, Status = RecordStatus.Active, CreatedAt = now.AddDays(-220), UpdatedAt = now.AddDays(-5) },
            new Company { Id = SeedIds.CompanyTrakya, Name = "Horoz Lojistik", Type = CompanyType.Supplier, Status = RecordStatus.Active, CreatedAt = now.AddDays(-110), UpdatedAt = now.AddDays(-1) },
        };
        context.Companies.AddRange(companies);

        // Roles
        var roles = new[]
        {
            new Role { Id = SeedIds.RoleRequester, Key = UserRoleKey.Requester, Name = "Talep Olusturan Firma", Permissions = new[] { "dashboard:view", "request:create", "request:view:own", "request:cancel" } },
            new Role { Id = SeedIds.RoleSupplier, Key = UserRoleKey.Supplier, Name = "Tedarikci Firma", Permissions = new[] { "dashboard:view", "assignment:view", "assignment:create", "assignment:update" } },
            new Role { Id = SeedIds.RoleControl, Key = UserRoleKey.Control, Name = "Sevkiyat Operasyon", Permissions = new[] { "dashboard:view", "shipment:view", "control:review", "ramp:view", "ramp:assign", "loading:complete" } },
            new Role { Id = SeedIds.RoleRamp, Key = UserRoleKey.Ramp, Name = "Rampa Planlama", Permissions = new[] { "dashboard:view", "ramp:view", "ramp:assign" } },
            new Role { Id = SeedIds.RoleGate, Key = UserRoleKey.Gate, Name = "Dis Guvenlik", Permissions = new[] { "dashboard:view", "gate:view", "gate:review", "gate:request-correction", "gate:register" } },
            new Role { Id = SeedIds.RoleLoading, Key = UserRoleKey.Loading, Name = "Yukleme Sonlandirma", Permissions = new[] { "dashboard:view", "loading:view", "loading:complete" } },
            new Role { Id = SeedIds.RoleAdmin, Key = UserRoleKey.Admin, Name = "Vardiya Amiri / Ekip Lideri", Permissions = new[] { "dashboard:view", "request:create", "request:view:own", "request:cancel", "shipment:view", "control:review", "ramp:view", "ramp:assign", "gate:view", "gate:review", "gate:request-correction", "gate:register", "loading:view", "loading:complete", "report:view", "admin:manage", "company:restrict", "ramp:restrict", "user:restrict" } },
            new Role { Id = SeedIds.RoleSuperadmin, Key = UserRoleKey.Superadmin, Name = "Sistem Yoneticisi", Permissions = new[] { "*" } },
        };
        context.Roles.AddRange(roles);

        // Users
        var users = new[]
        {
            new User { Id = SeedIds.UserRequesterAyse, FirstName = "Ayse", LastName = "Yildirim", Email = "ayse.yildirim@gratis.demo", Phone = "+905327770011", PasswordHash = passwordHash, RoleId = SeedIds.RoleRequester, CompanyId = SeedIds.CompanyGratis, IsActive = true, CreatedAt = now.AddDays(-210), UpdatedAt = now.AddDays(-1) },
            new User { Id = SeedIds.UserRequesterMelis, FirstName = "Melis", LastName = "Karaca", Email = "melis.karaca@gratis.demo", Phone = "+905307770022", PasswordHash = passwordHash, RoleId = SeedIds.RoleRequester, CompanyId = SeedIds.CompanyGratis, IsActive = true, CreatedAt = now.AddDays(-200), UpdatedAt = now.AddDays(-2) },
            new User { Id = SeedIds.UserSupplierMert, FirstName = "Mert", LastName = "Demir", Email = "mert.demir@mars.demo", Phone = "+905551112233", PasswordHash = passwordHash, RoleId = SeedIds.RoleSupplier, CompanyId = SeedIds.CompanyAnadolu, IsActive = true, CreatedAt = now.AddDays(-180), UpdatedAt = now.AddDays(-1) },
            new User { Id = SeedIds.UserSupplierElif, FirstName = "Elif", LastName = "Tas", Email = "elif.tas@mevlana.demo", Phone = "+905441112233", PasswordHash = passwordHash, RoleId = SeedIds.RoleSupplier, CompanyId = SeedIds.CompanyKuzey, IsActive = true, CreatedAt = now.AddDays(-165), UpdatedAt = now.AddDays(-1) },
            new User { Id = SeedIds.UserSupplierBora, FirstName = "Bora", LastName = "Yilmaz", Email = "bora.yilmaz@horoz.demo", Phone = "+905331112244", PasswordHash = passwordHash, RoleId = SeedIds.RoleSupplier, CompanyId = SeedIds.CompanyTrakya, IsActive = true, CreatedAt = now.AddDays(-150), UpdatedAt = now.AddDays(-1) },
            new User { Id = SeedIds.UserControlFevzi, FirstName = "Fevzi", LastName = "Uzun", Email = "fevzi.uzun@gratis.demo", Phone = "+905354440011", PasswordHash = passwordHash, RoleId = SeedIds.RoleControl, CompanyId = SeedIds.CompanyGratis, IsActive = true, CreatedAt = now.AddDays(-190), UpdatedAt = now.AddDays(-1) },
            new User { Id = SeedIds.UserRampEmre, FirstName = "Emre", LastName = "Kilic", Email = "emre.kilic@gratis.demo", Phone = "+905367770044", PasswordHash = passwordHash, RoleId = SeedIds.RoleRamp, CompanyId = SeedIds.CompanyGratis, IsActive = true, CreatedAt = now.AddDays(-170), UpdatedAt = now.AddDays(-2) },
            new User { Id = SeedIds.UserGateCem, FirstName = "Cem", LastName = "Sari", Email = "cem.sari@gratis.demo", Phone = "+905398880055", PasswordHash = passwordHash, RoleId = SeedIds.RoleGate, CompanyId = SeedIds.CompanyGratis, IsActive = true, CreatedAt = now.AddDays(-140), UpdatedAt = now.AddDays(-1) },
            new User { Id = SeedIds.UserLoadingDeniz, FirstName = "Deniz", LastName = "Arslan", Email = "deniz.arslan@gratis.demo", Phone = "+905376660066", PasswordHash = passwordHash, RoleId = SeedIds.RoleLoading, CompanyId = SeedIds.CompanyGratis, IsActive = true, CreatedAt = now.AddDays(-125), UpdatedAt = now.AddDays(-1) },
            new User { Id = SeedIds.UserAdminOzgur, FirstName = "Ozgur", LastName = "Caglayan", Email = "ozgur.caglayan@gratis.demo", Phone = "+905399991122", PasswordHash = passwordHash, RoleId = SeedIds.RoleAdmin, CompanyId = SeedIds.CompanyGratis, IsActive = true, CreatedAt = now.AddDays(-250), UpdatedAt = now.AddDays(-1) },
            new User { Id = SeedIds.UserSuperadminKerem, FirstName = "Kerem", LastName = "Basaran", Email = "kerem.basaran@gratis.demo", Phone = "+905301234567", PasswordHash = passwordHash, RoleId = SeedIds.RoleSuperadmin, CompanyId = SeedIds.CompanyGratis, IsActive = true, CreatedAt = now.AddDays(-300), UpdatedAt = now.AddDays(-1) },
        };
        context.Users.AddRange(users);

        // Locations
        var locations = new[]
        {
            new Location { Id = SeedIds.LocIstanbul, Name = "Avrupa", Address = "Avrupa Bolgesi Dagitim Merkezi", CompanyId = SeedIds.CompanyGratis, IsActive = true },
            new Location { Id = SeedIds.LocAnkara, Name = "Ankara", Address = "Ankara Dagitim Bolgesi", CompanyId = SeedIds.CompanyGratis, IsActive = true },
            new Location { Id = SeedIds.LocIzmir, Name = "Izmir", Address = "Izmir Dagitim Bolgesi", CompanyId = SeedIds.CompanyGratis, IsActive = true },
            new Location { Id = SeedIds.LocAdana, Name = "Adana", Address = "Adana Dagitim Bolgesi", CompanyId = SeedIds.CompanyGratis, IsActive = true },
            new Location { Id = SeedIds.LocBursa, Name = "Bursa", Address = "Bursa Dagitim Bolgesi", CompanyId = SeedIds.CompanyGratis, IsActive = true },
        };
        context.Locations.AddRange(locations);

        // Named Ramps
        var ramps = new[]
        {
            new Ramp { Id = SeedIds.RampIst01, LocationId = SeedIds.LocIstanbul, Code = "AVR-01", Name = "Avrupa Rampa 01", Status = RampStatus.Available, IsActive = true },
            new Ramp { Id = SeedIds.RampIst02, LocationId = SeedIds.LocIstanbul, Code = "AVR-02", Name = "Avrupa Rampa 02", Status = RampStatus.Busy, IsActive = true },
            new Ramp { Id = SeedIds.RampIst03, LocationId = SeedIds.LocIstanbul, Code = "AVR-03", Name = "Avrupa Rampa 03", Status = RampStatus.Available, IsActive = true },
            new Ramp { Id = SeedIds.RampAnk01, LocationId = SeedIds.LocAnkara, Code = "ANK-01", Name = "Ankara Rampa 01", Status = RampStatus.Available, IsActive = true },
            new Ramp { Id = SeedIds.RampAnk02, LocationId = SeedIds.LocAnkara, Code = "ANK-02", Name = "Ankara Rampa 02", Status = RampStatus.Available, IsActive = true },
            new Ramp { Id = SeedIds.RampIzm01, LocationId = SeedIds.LocIzmir, Code = "IZM-01", Name = "Izmir Rampa 01", Status = RampStatus.Available, IsActive = true },
            new Ramp { Id = SeedIds.RampAda01, LocationId = SeedIds.LocAdana, Code = "ADA-01", Name = "Adana Rampa 01", Status = RampStatus.Available, IsActive = true },
            new Ramp { Id = SeedIds.RampBur01, LocationId = SeedIds.LocBursa, Code = "BUR-01", Name = "Bursa Rampa 01", Status = RampStatus.Available, IsActive = true },
        };

        // Generic ramps (15)
        for (var i = 1; i <= 15; i++)
        {
            ramps = ramps.Append(new Ramp
            {
                Id = Guid.Parse($"50000000-0000-0000-0000-0000000000{i + 8:x2}"),
                LocationId = SeedIds.LocIstanbul,
                Code = $"GEN-{i:D2}",
                Name = $"Genel Rampa {i:D2}",
                Status = RampStatus.Available,
                IsActive = true,
            }).ToArray();
        }
        context.Ramps.AddRange(ramps);

        // System Settings
        context.SystemSettings.Add(new SystemSettings
        {
            Id = SeedIds.SystemSettingsId,
            CompanyName = "Gratis Lojistik",
            WorkStartHour = "08:00",
            WorkEndHour = "18:00",
            MaxDailyShipments = 50,
            DefaultVehicleType = VehicleType.Tir,
            NotificationsEnabled = true,
            AutoAssignRamp = false,
            MaintenanceMode = false,
        });

        await context.SaveChangesAsync();
    }
}
