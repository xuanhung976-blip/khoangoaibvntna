
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

// Transport abstraction (Phase 2 Vercel migration).
// Giữ nguyên signature cũ của runGAS để không phải sửa exports bên dưới.
const runGAS = (funcName: string, ...args: any[]): Promise<any> => {
    const payload = { funcName, args, sessionToken: getSessionToken() };
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

// ... existing API calls ...

// 12. SHIFTS
export const getDailyOnCall = () => runGAS('apiGet', 'Phan_Truc_Ngay');
export const saveDailyOnCall = (d: DailyOnCall) => {
    if (d.id) return runGAS('apiUpdate', 'Phan_Truc_Ngay', d.id, d, getCurrentActor());
    return runGAS('apiAdd', 'Phan_Truc_Ngay', d, getCurrentActor());
};
export const deleteDailyOnCall = (id: string) => runGAS('apiDelete', 'Phan_Truc_Ngay', id, getCurrentActor());
export const batchSaveDailyOnCall = (shifts: Partial<DailyOnCall>[]) => runGAS('batchSaveDailyOnCall', shifts, getCurrentActor());

export const getPersonnelLists = async () => {
    const users: User[] = await getUsers();
    return {
        doctors: users.filter(u => u.active && (u.nhomChuyenMon === 'BS' || (!u.nhomChuyenMon && (u.username.startsWith('bs') || u.fullName.toLowerCase().includes('bác sĩ'))))).map(u => u.fullName),
        nurses: users.filter(u => u.active && (u.nhomChuyenMon === 'DD' || (!u.nhomChuyenMon && (u.username.startsWith('dd') || u.fullName.toLowerCase().includes('điều dưỡng'))))).map(u => u.fullName)
    };
};

// ... rest of the file ...
export const getPatients = () => runGAS('apiGet', 'DS_BenhNhan');
export const addPatient = (p: Patient) => runGAS('apiAdd', 'DS_BenhNhan', p, getCurrentActor());
export const updatePatient = (id: string, p: Partial<Patient>) => runGAS('apiUpdate', 'DS_BenhNhan', id, p, getCurrentActor());
export const deletePatient = (id: string) => runGAS('apiDelete', 'DS_BenhNhan', id, getCurrentActor());

// 2. VIP
export const getVipPatients = () => runGAS('getVipPatientsJoined');
export const addVipPatient = (idBN: string, priority: string, reason: string) => {
    return runGAS('addVipPatientSafe', { patientId: idBN, priority, reason }, getCurrentActor());
};
export const removeVipPatient = (id: string) => runGAS('apiDelete', 'BN_LuuY', id, getCurrentActor());

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
export const getResearchTopics = () => runGAS('apiGet', 'DeTai_CoSo');
export const addResearchTopic = (r: ResearchTopic) => runGAS('apiAdd', 'DeTai_CoSo', r, getCurrentActor());
export const updateResearchTopic = (id: string, r: Partial<ResearchTopic>) => runGAS('apiUpdate', 'DeTai_CoSo', id, r, getCurrentActor());
export const deleteResearchTopic = (id: string) => runGAS('apiDelete', 'DeTai_CoSo', id, getCurrentActor());

// 7. MEETINGS
export const getScientificMeetings = () => runGAS('apiGet', 'SinhHoat_KH');
export const addScientificMeeting = (s: ScientificMeeting) => runGAS('apiAdd', 'SinhHoat_KH', s, getCurrentActor());
export const updateScientificMeeting = (id: string, s: Partial<ScientificMeeting>) => runGAS('apiUpdate', 'SinhHoat_KH', id, s, getCurrentActor());
export const deleteScientificMeeting = (id: string) => runGAS('apiDelete', 'SinhHoat_KH', id, getCurrentActor());

// 8. BRIEFINGS
export const getBriefings = () => runGAS('apiGet', 'GiaoBan_Log');

export const syncBriefingTasksToStaffTasks = async () => ({ success: true, handledBy: 'backend' });

export const addBriefing = async (b: DailyBriefing) => {
    const payload = { ...b, congViecJson: JSON.stringify(b.tasks || []) };
    return runGAS('apiAdd', 'GiaoBan_Log', payload, getCurrentActor());
};
export const updateBriefing = async (id: string, b: Partial<DailyBriefing>) => {
    const payload = { ...b };
    if (b.tasks) payload['congViecJson'] = JSON.stringify(b.tasks);
    return runGAS('apiUpdate', 'GiaoBan_Log', id, payload, getCurrentActor());
};

// 9. TECHNIQUES
export const getTechniques = () => runGAS('apiGet', 'KyThuat_Moi');
export const addTechnique = (t: NewTechnique) => runGAS('apiAdd', 'KyThuat_Moi', t, getCurrentActor());
export const updateTechnique = (id: string, t: Partial<NewTechnique>) => runGAS('apiUpdate', 'KyThuat_Moi', id, t, getCurrentActor());
export const deleteTechnique = (id: string) => runGAS('apiDelete', 'KyThuat_Moi', id, getCurrentActor());

// 10. COMMUNICATION
export const getCommunication = () => runGAS('apiGet', 'NoiDung_TT');
export const addCommunication = (c: CommunicationContent) => runGAS('apiAdd', 'NoiDung_TT', c, getCurrentActor());
export const updateCommunication = (id: string, c: Partial<CommunicationContent>) => runGAS('apiUpdate', 'NoiDung_TT', id, c, getCurrentActor());
export const deleteCommunication = (id: string) => runGAS('apiDelete', 'NoiDung_TT', id, getCurrentActor());

// 11. 5S
export const getZones = () => runGAS('apiGet', 'Vung_5S');
export const addZone = (z: Zone5S) => runGAS('apiAdd', 'Vung_5S', z, getCurrentActor());
export const updateZone = (id: string, z: Partial<Zone5S>) => runGAS('apiUpdate', 'Vung_5S', id, z, getCurrentActor());
export const deleteZone = (id: string) => runGAS('apiDelete', 'Vung_5S', id, getCurrentActor());

export const getEvaluations = () => runGAS('apiGet', 'DanhGia_5S');
export const addEvaluation = (e: Evaluation5S) => runGAS('apiAdd', 'DanhGia_5S', e, getCurrentActor());

export const getImprovements = () => runGAS('apiGet', 'CaiTien_5S');
export const addImprovement = (i: Improvement5S) => runGAS('apiAdd', 'CaiTien_5S', i, getCurrentActor());
export const updateImprovement = (id: string, i: Partial<Improvement5S>) => runGAS('apiUpdate', 'CaiTien_5S', id, i, getCurrentActor());
export const deleteImprovement = (id: string) => runGAS('apiDelete', 'CaiTien_5S', id, getCurrentActor());

// 13. CONFIGS
export const getConfigs = () => runGAS('apiGet', 'Config');
export const saveConfig = (c: SystemConfig) => runGAS('apiUpdate', 'Config', c.key, c, getCurrentActor());
export const deleteConfig = (key: string) => runGAS('apiDelete', 'Config', key, getCurrentActor());

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
export const getUsers = () => runGAS('apiGet', 'Users');
export const getDoctorsList = () => runGAS('getDoctors');
export const saveUser = (u: User) => runGAS('apiAdd', 'Users', u, getCurrentActor());
export const updateUser = (username: string, u: Partial<User> & { password?: string }) => runGAS('apiUpdate', 'Users', username, u, getCurrentActor());
export const deleteUser = (username: string) => runGAS('apiDelete', 'Users', username, getCurrentActor());
export const toggleLockUser = (username: string, active: boolean) => runGAS('apiUpdate', 'Users', username, { active }, getCurrentActor());
export const resetUserPassword = (username: string) => runGAS('apiUpdate', 'Users', username, { password: '123456' }, getCurrentActor());

// 15. PERMISSIONS
export const getPermissions = () => runGAS('apiGet', 'Roles_Permission');
export const saveRolePermissions = (perms: RolePermission[]) => runGAS('saveRolePermissions', perms, getCurrentActor());
export const savePermissions = saveRolePermissions; 

// 16. GENERIC
export const getGenericData = (module: string) => runGAS('apiGet', module);
export const saveGenericData = (module: string, item: any) => item.id ? runGAS('apiUpdate', module, item.id, item, getCurrentActor()) : runGAS('apiAdd', module, item, getCurrentActor());
export const deleteGenericData = (module: string, id: string) => runGAS('apiDelete', module, id, getCurrentActor());

export const writeActionLog = async (action: string, target: string, detail: any) => {
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
export const getStaffTasks = () => getGenericData('CongViec_NhanVien');
export const addStaffTask = (task: StaffTask) => saveGenericData('CongViec_NhanVien', task);
export const updateStaffTask = (id: string, task: Partial<StaffTask>) => saveGenericData('CongViec_NhanVien', { ...task, id });
export const deleteStaffTask = (id: string) => deleteGenericData('CongViec_NhanVien', id);

export const getStaffEvaluations = () => getGenericData('DanhGia_NhanVien');
export const addStaffEvaluation = (evaluation: StaffEvaluation) => saveGenericData('DanhGia_NhanVien', evaluation);
export const updateStaffEvaluation = (id: string, evaluation: Partial<StaffEvaluation>) => saveGenericData('DanhGia_NhanVien', { ...evaluation, id });
export const deleteStaffEvaluation = (id: string) => deleteGenericData('DanhGia_NhanVien', id);

// DASHBOARD
export const getDashboardStats = () => runGAS('getDashboardOverview');
