namespace FlowDock.Api.Data;

public static class SeedIds
{
    // Companies
    public static readonly Guid CompanyGratis = Guid.Parse("10000000-0000-0000-0000-000000000001");
    public static readonly Guid CompanyAnadolu = Guid.Parse("10000000-0000-0000-0000-000000000002");
    public static readonly Guid CompanyKuzey = Guid.Parse("10000000-0000-0000-0000-000000000003");
    public static readonly Guid CompanyTrakya = Guid.Parse("10000000-0000-0000-0000-000000000004");

    // Roles
    public static readonly Guid RoleRequester = Guid.Parse("20000000-0000-0000-0000-000000000001");
    public static readonly Guid RoleSupplier = Guid.Parse("20000000-0000-0000-0000-000000000002");
    public static readonly Guid RoleControl = Guid.Parse("20000000-0000-0000-0000-000000000003");
    public static readonly Guid RoleRamp = Guid.Parse("20000000-0000-0000-0000-000000000004");
    public static readonly Guid RoleGate = Guid.Parse("20000000-0000-0000-0000-000000000005");
    public static readonly Guid RoleLoading = Guid.Parse("20000000-0000-0000-0000-000000000006");
    public static readonly Guid RoleAdmin = Guid.Parse("20000000-0000-0000-0000-000000000007");
    public static readonly Guid RoleSuperadmin = Guid.Parse("20000000-0000-0000-0000-000000000008");

    // Users
    public static readonly Guid UserRequesterAyse = Guid.Parse("30000000-0000-0000-0000-000000000001");
    public static readonly Guid UserRequesterMelis = Guid.Parse("30000000-0000-0000-0000-000000000002");
    public static readonly Guid UserSupplierMert = Guid.Parse("30000000-0000-0000-0000-000000000003");
    public static readonly Guid UserSupplierElif = Guid.Parse("30000000-0000-0000-0000-000000000004");
    public static readonly Guid UserSupplierBora = Guid.Parse("30000000-0000-0000-0000-000000000005");
    public static readonly Guid UserControlFevzi = Guid.Parse("30000000-0000-0000-0000-000000000006");
    public static readonly Guid UserRampEmre = Guid.Parse("30000000-0000-0000-0000-000000000007");
    public static readonly Guid UserGateCem = Guid.Parse("30000000-0000-0000-0000-000000000008");
    public static readonly Guid UserLoadingDeniz = Guid.Parse("30000000-0000-0000-0000-000000000009");
    public static readonly Guid UserAdminOzgur = Guid.Parse("30000000-0000-0000-0000-00000000000a");
    public static readonly Guid UserSuperadminKerem = Guid.Parse("30000000-0000-0000-0000-00000000000b");

    // Locations
    public static readonly Guid LocIstanbul = Guid.Parse("40000000-0000-0000-0000-000000000001");
    public static readonly Guid LocAnkara = Guid.Parse("40000000-0000-0000-0000-000000000002");
    public static readonly Guid LocIzmir = Guid.Parse("40000000-0000-0000-0000-000000000003");
    public static readonly Guid LocAdana = Guid.Parse("40000000-0000-0000-0000-000000000004");
    public static readonly Guid LocBursa = Guid.Parse("40000000-0000-0000-0000-000000000005");

    // Named Ramps
    public static readonly Guid RampIst01 = Guid.Parse("50000000-0000-0000-0000-000000000001");
    public static readonly Guid RampIst02 = Guid.Parse("50000000-0000-0000-0000-000000000002");
    public static readonly Guid RampIst03 = Guid.Parse("50000000-0000-0000-0000-000000000003");
    public static readonly Guid RampAnk01 = Guid.Parse("50000000-0000-0000-0000-000000000004");
    public static readonly Guid RampAnk02 = Guid.Parse("50000000-0000-0000-0000-000000000005");
    public static readonly Guid RampIzm01 = Guid.Parse("50000000-0000-0000-0000-000000000006");
    public static readonly Guid RampAda01 = Guid.Parse("50000000-0000-0000-0000-000000000007");
    public static readonly Guid RampBur01 = Guid.Parse("50000000-0000-0000-0000-000000000008");

    // System Settings (singleton)
    public static readonly Guid SystemSettingsId = Guid.Parse("60000000-0000-0000-0000-000000000001");

    // String ID mapping for demo login (old TS ID → GUID)
    public static readonly Dictionary<string, Guid> UserIdMap = new()
    {
        ["user-requester-ayse"] = UserRequesterAyse,
        ["user-requester-melis"] = UserRequesterMelis,
        ["user-supplier-mert"] = UserSupplierMert,
        ["user-supplier-elif"] = UserSupplierElif,
        ["user-supplier-bora"] = UserSupplierBora,
        ["user-control-selin"] = UserControlFevzi,
        ["user-ramp-emre"] = UserRampEmre,
        ["user-gate-cem"] = UserGateCem,
        ["user-loading-deniz"] = UserLoadingDeniz,
        ["user-admin-eda"] = UserAdminOzgur,
        ["user-superadmin-kerem"] = UserSuperadminKerem,
    };
}
