
// ... existing imports ...
import {
    Patient,
    VipPatient,
    Medicine,
    MedicalEquipment,
    ResearchTopic,
    ScientificMeeting,
    DailyBriefing,
    NewTechnique,
    CommunicationContent,
    Zone5S,
    Evaluation5S,
    Improvement5S,
    DailyOnCall,
    User,
    SystemConfig,
    RolePermission,
    StaffEvaluation,
    Role,
    DashboardStats,
    LoginResult,
} from '../types';
import { callApi } from './apiClient';
import { isSupabaseConfigured } from './supabaseClient';
import * as SB from './supabaseService';

const SESSION_TOKEN_KEY = 'app_session_token';
const SESSION_EXPIRES_KEY = 'app_session_expires_at';

export const getSessionToken = (): string => localStorage.getItem(SESSION_TOKEN_KEY) || '';

export const setSessionToken = (token: string, expiresAt?: string) => {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
    if (expiresAt) localStorage.setItem(SESSION_EXPIRES_KEY, expiresAt);
};

export const clearSession = () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRES_KEY);
    localStorage.removeItem('app_user');
};

export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('app_user');
    return userStr ? JSON.parse(userStr) : null;
};

type RunGasOptions = {
    bypassCache?: boolean;
};

const runGAS = (funcName: string, ...args: any[]): Promise<any> => {
    let bypassCache = false;
    const lastArg = args[args.length - 1];
    if (lastArg && typeof lastArg === 'object' && !Array.isArray(lastArg) && 'bypassCache' in lastArg) {
        const opts = args.pop() as RunGasOptions;
        bypassCache = Boolean(opts.bypassCache);
    }
    const payload = { funcName, args, sessionToken: getSessionToken(), bypassCache };
    return callApi('/api/rpc', payload).catch((err) => {
        const message = err?.message || String(err);
        if (message.includes('AUTH_REQUIRED') || message.includes('SESSION_EXPIRED')) {
            clearSession();
            window.dispatchEvent(new Event('app_session_expired'));
        }
        throw err;
    });
};

const getCurrentActor = (): Pick<User, 'username' | 'fullName' | 'role'> => {
    const user = getCurrentUser();
    if (user) {
        return {
            username: user.username || '',
            fullName: user.fullName || '',
            role: user.role || Role.STAFF,
        };
    }
    return { username: '', fullName: '', role: Role.STAFF };
};

// ─── Data router ────────────────────────────────────────────────────────────
// When Supabase is configured, all READ/WRITE operations go to Supabase
// (lightning-fast ~50ms). AUTH still goes through GAS (password hashing).
// ─────────────────────────────────────────────────────────────────────────────

// ... existing API calls ...

// 12. SHIFTS
export const getDailyOnCall = () =>
    isSupabaseConfigured ? SB.getDailyOnCall() : runGAS('apiGet', 'Phan_Truc_Ngay');

export const saveDailyOnCall = (d: DailyOnCall) => {
    if (isSupabaseConfigured) return SB.saveDailyOnCall(d);
    if (d.id) return runGAS('apiUpdate', 'Phan_Truc_Ngay', d.id, d, getCurrentActor());
    return runGAS('apiAdd', 'Phan_Truc_Ngay', d, getCurrentActor());
};

export const deleteDailyOnCall = (id: string) =>
    isSupabaseConfigured ? SB.deleteDailyOnCall(id) : runGAS('apiDelete', 'Phan_Truc_Ngay', id, getCurrentActor());

export const batchSaveDailyOnCall = (shifts: Partial<DailyOnCall>[]) =>
    isSupabaseConfigured ? SB.batchSaveDailyOnCall(shifts) : runGAS('batchSaveDailyOnCall', shifts, getCurrentActor());

export const getPersonnelLists = async () => {
    try {
        const users: User[] = await getUsers();
        if (!Array.isArray(users) || users.length === 0) {
            return { doctors: [], nurses: [] };
        }
        const activeUsers = users.filter(u => u.active !== false);
        const allNames = activeUsers.map(u => u.fullName).filter(Boolean);

        const doctors = activeUsers
            .filter(u =>
                u.nhomChuyenMon === 'BS' ||
                u.role === Role.CHIEF ||
                (u as any).chucVu?.toLowerCase().includes('bác sĩ') ||
                u.username?.startsWith('bs') ||
                u.fullName?.toLowerCase().includes('bác sĩ')
            )
            .map(u => u.fullName)
            .filter(Boolean);

        const nurses = activeUsers
            .filter(u =>
                u.nhomChuyenMon === 'DD' ||
                u.role === Role.HEAD_NURSE ||
                (u as any).chucVu?.toLowerCase().includes('điều dưỡng') ||
                u.username?.startsWith('dd') ||
                u.fullName?.toLowerCase().includes('điều dưỡng')
            )
            .map(u => u.fullName)
            .filter(Boolean);

        return {
            doctors: doctors.length > 0 ? Array.from(new Set(doctors)) : allNames,
            nurses: nurses.length > 0 ? Array.from(new Set(nurses)) : allNames
        };
    } catch {
        return { doctors: [], nurses: [] };
    }
};

// ... rest of the file ...
export const getPatients = () =>
    isSupabaseConfigured ? SB.getPatients() : runGAS('apiGet', 'DS_BenhNhan');

export const addPatient = (p: Patient) =>
    isSupabaseConfigured ? SB.addPatient(p) : runGAS('apiAdd', 'DS_BenhNhan', p, getCurrentActor());

export const updatePatient = (id: string, p: Partial<Patient>) =>
    isSupabaseConfigured ? SB.updatePatient(id, p) : runGAS('apiUpdate', 'DS_BenhNhan', id, p, getCurrentActor());

export const deletePatient = (id: string) =>
    isSupabaseConfigured ? SB.deletePatient(id) : runGAS('apiDelete', 'DS_BenhNhan', id, getCurrentActor());

// 2. VIP
export const getVipPatients = () =>
    isSupabaseConfigured ? SB.getVipPatients() : runGAS('getVipPatientsJoined');

export const addVipPatient = (idBN: string, priority: string, reason: string) => {
    if (isSupabaseConfigured) return SB.addVipPatient(idBN, priority, reason);
    return runGAS('addVipPatientSafe', { patientId: idBN, priority, reason }, getCurrentActor());
};

export const removeVipPatient = (id: string) =>
    isSupabaseConfigured ? SB.removeVipPatient(id) : runGAS('apiDelete', 'BN_LuuY', id, getCurrentActor());

// 3. MEDICINES
export const getMedicines = () => runGAS('apiGet', 'Thuoc_Kho');
export const addMedicine = (m: Medicine) => runGAS('apiAdd', 'Thuoc_Kho', m, getCurrentActor());
export const updateMedicine = (id: string, m: Partial<Medicine>) => runGAS('apiUpdate', 'Thuoc_Kho', id, m, getCurrentActor());
export const deleteMedicine = (id: string) => runGAS('apiDelete', 'Thuoc_Kho', id, getCurrentActor());

// 4. EQUIPMENT
export const getEquipment = () => runGAS('apiGet', 'May_Moc');
export const addEquipment = (e: MedicalEquipment) => runGAS('apiAdd', 'May_Moc', e, getCurrentActor());
export const updateEquipment = (id: string, e: Partial<MedicalEquipment>) => runGAS('apiUpdate', 'May_Moc', id, e, getCurrentActor());
export const deleteEquipment = (id: string) => runGAS('apiDelete', 'May_Moc', id, getCurrentActor());

// 5. SURGERY
export const getSurgeryPendingPatients = async () => {
    const patients: Patient[] = await getPatients();
    return patients.filter(p => p.status === 'ChoMo');
};
export const updateSurgeryStatus = (id: string, update: any) => updatePatient(id, update);

// 6. RESEARCH
export const getResearchTopics = async () => {
    if (isSupabaseConfigured) {
        try {
            const sbData = await SB.getResearchTopics();
            if (Array.isArray(sbData) && sbData.length > 0) return sbData;
        } catch { /* fallback to GAS */ }
    }
    try {
        const gasData = await runGAS('apiGet', 'DeTai_CoSo');
        return Array.isArray(gasData) ? gasData : [];
    } catch {
        return [];
    }
};
export const addResearchTopic = (r: ResearchTopic) =>
    isSupabaseConfigured ? SB.addResearchTopic(r) : runGAS('apiAdd', 'DeTai_CoSo', r, getCurrentActor());
export const updateResearchTopic = (id: string, r: Partial<ResearchTopic>) =>
    isSupabaseConfigured ? SB.updateResearchTopic(id, r) : runGAS('apiUpdate', 'DeTai_CoSo', id, r, getCurrentActor());
export const deleteResearchTopic = (id: string) =>
    isSupabaseConfigured ? SB.deleteResearchTopic(id) : runGAS('apiDelete', 'DeTai_CoSo', id, getCurrentActor());

// 7. MEETINGS
export const getScientificMeetings = () =>
    isSupabaseConfigured ? SB.getScientificMeetings() : runGAS('apiGet', 'SinhHoat_KH');

export const addScientificMeeting = (s: ScientificMeeting) =>
    isSupabaseConfigured ? SB.addScientificMeeting(s) : runGAS('apiAdd', 'SinhHoat_KH', s, getCurrentActor());

export const updateScientificMeeting = (id: string, s: Partial<ScientificMeeting>) =>
    isSupabaseConfigured ? SB.updateScientificMeeting(id, s) : runGAS('apiUpdate', 'SinhHoat_KH', id, s, getCurrentActor());

export const deleteScientificMeeting = (id: string) =>
    isSupabaseConfigured ? SB.deleteScientificMeeting(id) : runGAS('apiDelete', 'SinhHoat_KH', id, getCurrentActor());

// 8. BRIEFINGS
export const getBriefings = () =>
    isSupabaseConfigured ? SB.getBriefings() : runGAS('apiGet', 'GiaoBan_Log');

export const syncBriefingTasksToStaffTasks = async () => ({ success: true, handledBy: 'backend' });

export const addBriefing = async (b: DailyBriefing) => {
    if (isSupabaseConfigured) return SB.addBriefing(b);
    const payload = { ...b, congViecJson: JSON.stringify(b.tasks || []) };
    return runGAS('apiAdd', 'GiaoBan_Log', payload, getCurrentActor());
};

export const updateBriefing = async (id: string, b: Partial<DailyBriefing>) => {
    if (isSupabaseConfigured) return SB.updateBriefing(id, b);
    const payload = { ...b };
    if (b.tasks) payload['congViecJson'] = JSON.stringify(b.tasks);
    return runGAS('apiUpdate', 'GiaoBan_Log', id, payload, getCurrentActor());
};

// 9. TECHNIQUES
export const getTechniques = () =>
    isSupabaseConfigured ? SB.getTechniques() : runGAS('apiGet', 'KyThuat_Moi');

export const addTechnique = (t: NewTechnique) =>
    isSupabaseConfigured ? SB.addTechnique(t) : runGAS('apiAdd', 'KyThuat_Moi', t, getCurrentActor());

export const updateTechnique = (id: string, t: Partial<NewTechnique>) =>
    isSupabaseConfigured ? SB.updateTechnique(id, t) : runGAS('apiUpdate', 'KyThuat_Moi', id, t, getCurrentActor());

export const deleteTechnique = (id: string) =>
    isSupabaseConfigured ? SB.deleteTechnique(id) : runGAS('apiDelete', 'KyThuat_Moi', id, getCurrentActor());

// 10. COMMUNICATION
export const getCommunication = () =>
    isSupabaseConfigured ? SB.getCommunication() : runGAS('apiGet', 'NoiDung_TT');

export const addCommunication = (c: CommunicationContent) =>
    isSupabaseConfigured ? SB.addCommunication(c) : runGAS('apiAdd', 'NoiDung_TT', c, getCurrentActor());

export const updateCommunication = (id: string, c: Partial<CommunicationContent>) =>
    isSupabaseConfigured ? SB.updateCommunication(id, c) : runGAS('apiUpdate', 'NoiDung_TT', id, c, getCurrentActor());

export const deleteCommunication = (id: string) =>
    isSupabaseConfigured ? SB.deleteCommunication(id) : runGAS('apiDelete', 'NoiDung_TT', id, getCurrentActor());

// 11. 5S
export const getZones = () =>
    isSupabaseConfigured ? SB.getZones() : runGAS('apiGet', 'Vung_5S');

export const addZone = (z: Zone5S) =>
    isSupabaseConfigured ? SB.addZone(z) : runGAS('apiAdd', 'Vung_5S', z, getCurrentActor());

export const updateZone = (id: string, z: Partial<Zone5S>) =>
    isSupabaseConfigured ? SB.updateZone(id, z) : runGAS('apiUpdate', 'Vung_5S', id, z, getCurrentActor());

export const deleteZone = (id: string) =>
    isSupabaseConfigured ? SB.deleteZone(id) : runGAS('apiDelete', 'Vung_5S', id, getCurrentActor());

export const getEvaluations = () =>
    isSupabaseConfigured ? SB.getEvaluations() : runGAS('apiGet', 'DanhGia_5S');

export const addEvaluation = (e: Evaluation5S) =>
    isSupabaseConfigured ? SB.addEvaluation(e) : runGAS('apiAdd', 'DanhGia_5S', e, getCurrentActor());

export const getImprovements = () =>
    isSupabaseConfigured ? SB.getImprovements() : runGAS('apiGet', 'CaiTien_5S');

export const addImprovement = (i: Improvement5S) =>
    isSupabaseConfigured ? SB.addImprovement(i) : runGAS('apiAdd', 'CaiTien_5S', i, getCurrentActor());

export const updateImprovement = (id: string, i: Partial<Improvement5S>) =>
    isSupabaseConfigured ? SB.updateImprovement(id, i) : runGAS('apiUpdate', 'CaiTien_5S', id, i, getCurrentActor());

export const deleteImprovement = (id: string) =>
    isSupabaseConfigured ? SB.deleteImprovement(id) : runGAS('apiDelete', 'CaiTien_5S', id, getCurrentActor());

// 13. CONFIGS
export const getConfigs = () =>
    isSupabaseConfigured ? SB.getConfigs() : runGAS('apiGet', 'Config');

export const saveConfig = (c: SystemConfig) =>
    isSupabaseConfigured ? SB.saveConfig(c) : runGAS('apiUpdate', 'Config', c.key, c, getCurrentActor());

export const deleteConfig = (key: string) =>
    isSupabaseConfigured ? SB.deleteConfig(key) : runGAS('apiDelete', 'Config', key, getCurrentActor());

// 14. USERS & AUTH
export const loginUser = async (u: string, p: string): Promise<User | null> => {
    const result: LoginResult | null = await runGAS('loginUser', u, p);
    if (!result) return null;

    const user = result.user || result;
    if (result.sessionToken) {
        setSessionToken(result.sessionToken, result.expiresAt);
    }
    return user;
};
export const logoutUser = async () => {
    try {
        await runGAS('logoutUser');
    } finally {
        clearSession();
    }
};
export const changeMyPassword = (currentPassword: string, newPassword: string) =>
    runGAS('changeMyPassword', { currentPassword, newPassword });

export const getUsers = () =>
    isSupabaseConfigured ? SB.getUsers() : runGAS('apiGet', 'Users');

export const getDoctorsList = async () => {
    if (isSupabaseConfigured) {
        try {
            const users: User[] = await SB.getUsers();
            const activeUsers = (users || []).filter(u => u.active !== false);
            // Filter for doctors: by nhomChuyenMon, role, or username prefix
            const doctors = activeUsers
                .filter(u =>
                    u.nhomChuyenMon === 'BS' ||
                    u.role === Role.CHIEF ||
                    (u as any).chucVu?.toLowerCase().includes('bác sĩ') ||
                    u.username?.startsWith('bs')
                )
                .map(u => ({ id: u.username, fullName: u.fullName }));
            // Fallback: if no doctors found by classification, return all active users
            if (doctors.length === 0) {
                return activeUsers.map(u => ({ id: u.username, fullName: u.fullName }));
            }
            return doctors;
        } catch {
            return [];
        }
    }
    return runGAS('getDoctors');
};

export const saveUser = (u: User) =>
    isSupabaseConfigured ? SB.saveUser(u) : runGAS('apiAdd', 'Users', u, getCurrentActor());

export const updateUser = (username: string, u: Partial<User> & { password?: string }) =>
    isSupabaseConfigured ? SB.updateUser(username, u) : runGAS('apiUpdate', 'Users', username, u, getCurrentActor());

export const deleteUser = (username: string) =>
    isSupabaseConfigured ? SB.deleteUser(username) : runGAS('apiDelete', 'Users', username, getCurrentActor());

export const toggleLockUser = (username: string, active: boolean) =>
    isSupabaseConfigured ? SB.toggleLockUser(username, active) : runGAS('apiUpdate', 'Users', username, { active }, getCurrentActor());

export const resetUserPassword = (username: string) =>
    isSupabaseConfigured ? SB.resetUserPassword(username) : runGAS('apiUpdate', 'Users', username, { password: '123456' }, getCurrentActor());

// 15. PERMISSIONS
export const getPermissions = () =>
    isSupabaseConfigured ? SB.getPermissions() : runGAS('apiGet', 'Roles_Permission');

export const saveRolePermissions = (perms: RolePermission[]) =>
    isSupabaseConfigured ? SB.saveRolePermissions(perms) : runGAS('saveRolePermissions', perms, getCurrentActor());

export const savePermissions = saveRolePermissions; 

// 16. GENERIC
export const getGenericData = (module: string) => runGAS('apiGet', module);
export const saveGenericData = (module: string, item: any) => item.id ? runGAS('apiUpdate', module, item.id, item, getCurrentActor()) : runGAS('apiAdd', module, item, getCurrentActor());
export const deleteGenericData = (module: string, id: string) => runGAS('apiDelete', module, id, getCurrentActor());

export const writeActionLog = async (action: string, target: string, detail: any) => {
    if (isSupabaseConfigured) {
        return SB.writeActionLog(action, target, detail, getCurrentActor());
    }
    try {
        const userStr = localStorage.getItem('app_user');
        const user = userStr ? JSON.parse(userStr) : null;
        await runGAS('apiAdd', 'Logs', {
            action,
            target,
            detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
            username: user?.username || '',
            fullName: user?.fullName || '',
            createdAt: new Date().toISOString(),
        }, getCurrentActor());
    } catch {
        // Logging is optional; missing Logs sheet or log failures must not block CRUD.
    }
};

// 17. STAFF PERFORMANCE
export const getStaffTasks = () =>
    isSupabaseConfigured ? SB.getStaffTasks() : getGenericData('CongViec_NhanVien');

export const addStaffTask = (task: StaffTask) =>
    isSupabaseConfigured ? SB.addStaffTask(task) : saveGenericData('CongViec_NhanVien', task);

export const updateStaffTask = (id: string, task: Partial<StaffTask>) =>
    isSupabaseConfigured ? SB.updateStaffTask(id, task) : saveGenericData('CongViec_NhanVien', { ...task, id });

export const deleteStaffTask = (id: string) =>
    isSupabaseConfigured ? SB.deleteStaffTask(id) : deleteGenericData('CongViec_NhanVien', id);

export const getStaffEvaluations = () =>
    isSupabaseConfigured ? SB.getStaffEvaluations() : getGenericData('DanhGia_NhanVien');

export const addStaffEvaluation = (evaluation: StaffEvaluation) =>
    isSupabaseConfigured ? SB.addStaffEvaluation(evaluation) : saveGenericData('DanhGia_NhanVien', evaluation);

export const updateStaffEvaluation = (id: string, evaluation: Partial<StaffEvaluation>) =>
    isSupabaseConfigured ? SB.updateStaffEvaluation(id, evaluation) : saveGenericData('DanhGia_NhanVien', { ...evaluation, id });

export const deleteStaffEvaluation = (id: string) =>
    isSupabaseConfigured ? SB.deleteStaffEvaluation(id) : deleteGenericData('DanhGia_NhanVien', id);

// DASHBOARD
export const getDashboardStats = () =>
    isSupabaseConfigured ? SB.getDashboardStats() : runGAS('getDashboardOverview');
