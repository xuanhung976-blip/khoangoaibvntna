
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
    StaffTask,
    StaffEvaluation,
    Role,
    DashboardStats,
} from '../types';
import { callApi } from './apiClient';

// Transport abstraction (Phase 2 Vercel migration).
// Giá»¯ nguyÃªn signature cÅ© cá»§a runGAS Ä‘á»ƒ khÃ´ng pháº£i sá»­a exports bÃªn dÆ°á»›i.
const runGAS = (funcName: string, ...args: any[]): Promise<any> => {
    const payload = { funcName, args };
    return callApi('', payload);
};

const getCurrentRole = (): Role => {
    const userStr = localStorage.getItem('app_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        return user.role;
    }
    return Role.STAFF;
};

// ... existing API calls ...

// 12. SHIFTS
export const getDailyOnCall = () => runGAS('apiGet', 'Phan_Truc_Ngay');
export const saveDailyOnCall = (d: DailyOnCall) => {
    if (d.id) return runGAS('apiUpdate', 'Phan_Truc_Ngay', d.id, d, getCurrentRole());
    return runGAS('apiAdd', 'Phan_Truc_Ngay', d, getCurrentRole());
};
export const deleteDailyOnCall = (id: string) => runGAS('apiDelete', 'Phan_Truc_Ngay', id, getCurrentRole());
export const batchSaveDailyOnCall = (shifts: Partial<DailyOnCall>[]) => runGAS('batchSaveDailyOnCall', shifts);

export const getPersonnelLists = async () => {
    const users: User[] = await getUsers();
    return {
        doctors: users.filter(u => u.active && (u.nhomChuyenMon === 'BS' || (!u.nhomChuyenMon && (u.username.startsWith('bs') || u.fullName.toLowerCase().includes('bÃ¡c sÄ©'))))).map(u => u.fullName),
        nurses: users.filter(u => u.active && (u.nhomChuyenMon === 'DD' || (!u.nhomChuyenMon && (u.username.startsWith('dd') || u.fullName.toLowerCase().includes('Ä‘iá»u dÆ°á»¡ng'))))).map(u => u.fullName)
    };
};

// ... rest of the file ...
export const getPatients = () => runGAS('apiGet', 'DS_BenhNhan');
export const addPatient = (p: Patient) => runGAS('apiAdd', 'DS_BenhNhan', p, getCurrentRole());
export const updatePatient = (id: string, p: Partial<Patient>) => runGAS('apiUpdate', 'DS_BenhNhan', id, p, getCurrentRole());
export const deletePatient = (id: string) => runGAS('apiDelete', 'DS_BenhNhan', id, getCurrentRole());

// 2. VIP
export const getVipPatients = () => runGAS('getVipPatientsJoined');
export const addVipPatient = (idBN: string, priority: string, reason: string) => {
    return runGAS('addVipPatientSafe', { patientId: idBN, priority, reason }, getCurrentRole());
};
export const removeVipPatient = (id: string) => runGAS('apiDelete', 'BN_LuuY', id, getCurrentRole());

// 3. MEDICINES
export const getMedicines = () => runGAS('apiGet', 'Thuoc_Kho');
export const addMedicine = (m: Medicine) => runGAS('apiAdd', 'Thuoc_Kho', m, getCurrentRole());
export const updateMedicine = (id: string, m: Partial<Medicine>) => runGAS('apiUpdate', 'Thuoc_Kho', id, m, getCurrentRole());
export const deleteMedicine = (id: string) => runGAS('apiDelete', 'Thuoc_Kho', id, getCurrentRole());

// 4. EQUIPMENT
export const getEquipment = () => runGAS('apiGet', 'May_Moc');
export const addEquipment = (e: MedicalEquipment) => runGAS('apiAdd', 'May_Moc', e, getCurrentRole());
export const updateEquipment = (id: string, e: Partial<MedicalEquipment>) => runGAS('apiUpdate', 'May_Moc', id, e, getCurrentRole());
export const deleteEquipment = (id: string) => runGAS('apiDelete', 'May_Moc', id, getCurrentRole());

// 5. SURGERY
export const getSurgeryPendingPatients = async () => {
    const patients: Patient[] = await getPatients();
    return patients.filter(p => p.status === 'ChoMo');
};
export const updateSurgeryStatus = (id: string, update: any) => updatePatient(id, update);

// 6. RESEARCH
export const getResearchTopics = () => runGAS('apiGet', 'DeTai_CoSo');
export const addResearchTopic = (r: ResearchTopic) => runGAS('apiAdd', 'DeTai_CoSo', r, getCurrentRole());
export const updateResearchTopic = (id: string, r: Partial<ResearchTopic>) => runGAS('apiUpdate', 'DeTai_CoSo', id, r, getCurrentRole());
export const deleteResearchTopic = (id: string) => runGAS('apiDelete', 'DeTai_CoSo', id, getCurrentRole());

// 7. MEETINGS
export const getScientificMeetings = () => runGAS('apiGet', 'SinhHoat_KH');
export const addScientificMeeting = (s: ScientificMeeting) => runGAS('apiAdd', 'SinhHoat_KH', s, getCurrentRole());
export const updateScientificMeeting = (id: string, s: Partial<ScientificMeeting>) => runGAS('apiUpdate', 'SinhHoat_KH', id, s, getCurrentRole());
export const deleteScientificMeeting = (id: string) => runGAS('apiDelete', 'SinhHoat_KH', id, getCurrentRole());

// 8. BRIEFINGS
export const getBriefings = () => runGAS('apiGet', 'GiaoBan_Log');
export const addBriefing = (b: DailyBriefing) => {
    const payload = { ...b, congViecJson: JSON.stringify(b.tasks || []) };
    return runGAS('apiAdd', 'GiaoBan_Log', payload, getCurrentRole());
};
export const updateBriefing = (id: string, b: Partial<DailyBriefing>) => {
    const payload = { ...b };
    if (b.tasks) payload['congViecJson'] = JSON.stringify(b.tasks);
    return runGAS('apiUpdate', 'GiaoBan_Log', id, payload, getCurrentRole());
};

// 9. TECHNIQUES
export const getTechniques = () => runGAS('apiGet', 'KyThuat_Moi');
export const addTechnique = (t: NewTechnique) => runGAS('apiAdd', 'KyThuat_Moi', t, getCurrentRole());
export const updateTechnique = (id: string, t: Partial<NewTechnique>) => runGAS('apiUpdate', 'KyThuat_Moi', id, t, getCurrentRole());
export const deleteTechnique = (id: string) => runGAS('apiDelete', 'KyThuat_Moi', id, getCurrentRole());

// 10. COMMUNICATION
export const getCommunication = () => runGAS('apiGet', 'NoiDung_TT');
export const addCommunication = (c: CommunicationContent) => runGAS('apiAdd', 'NoiDung_TT', c, getCurrentRole());
export const updateCommunication = (id: string, c: Partial<CommunicationContent>) => runGAS('apiUpdate', 'NoiDung_TT', id, c, getCurrentRole());
export const deleteCommunication = (id: string) => runGAS('apiDelete', 'NoiDung_TT', id, getCurrentRole());

// 11. 5S
export const getZones = () => runGAS('apiGet', 'Vung_5S');
export const addZone = (z: Zone5S) => runGAS('apiAdd', 'Vung_5S', z, getCurrentRole());
export const updateZone = (id: string, z: Partial<Zone5S>) => runGAS('apiUpdate', 'Vung_5S', id, z, getCurrentRole());
export const deleteZone = (id: string) => runGAS('apiDelete', 'Vung_5S', id, getCurrentRole());

export const getEvaluations = () => runGAS('apiGet', 'DanhGia_5S');
export const addEvaluation = (e: Evaluation5S) => runGAS('apiAdd', 'DanhGia_5S', e, getCurrentRole());

export const getImprovements = () => runGAS('apiGet', 'CaiTien_5S');
export const addImprovement = (i: Improvement5S) => runGAS('apiAdd', 'CaiTien_5S', i, getCurrentRole());
export const updateImprovement = (id: string, i: Partial<Improvement5S>) => runGAS('apiUpdate', 'CaiTien_5S', id, i, getCurrentRole());
export const deleteImprovement = (id: string) => runGAS('apiDelete', 'CaiTien_5S', id, getCurrentRole());

// 13. CONFIGS
export const getConfigs = () => runGAS('apiGet', 'Config');
export const saveConfig = (c: SystemConfig) => runGAS('apiUpdate', 'Config', c.key, c, getCurrentRole()); 
export const deleteConfig = (key: string) => runGAS('apiDelete', 'Config', key, getCurrentRole());

// 14. USERS & AUTH
export const loginUser = (u: string, p: string) => runGAS('loginUser', u, p);
export const getUsers = () => runGAS('apiGet', 'Users');
export const getDoctorsList = () => runGAS('getDoctors');
export const saveUser = (u: User) => runGAS('apiAdd', 'Users', u, getCurrentRole());
export const updateUser = (username: string, u: Partial<User> & { password?: string }) => runGAS('apiUpdate', 'Users', username, u, getCurrentRole());
export const deleteUser = (username: string) => runGAS('apiDelete', 'Users', username, getCurrentRole());
export const toggleLockUser = (username: string, active: boolean) => runGAS('apiUpdate', 'Users', username, { active }, getCurrentRole());
export const resetUserPassword = (username: string) => runGAS('apiUpdate', 'Users', username, { password: '123456' }, getCurrentRole());

// 15. PERMISSIONS
export const getPermissions = () => runGAS('apiGet', 'Roles_Permission');
export const saveRolePermissions = (perms: RolePermission[]) => runGAS('saveRolePermissions', perms, getCurrentRole());
export const savePermissions = saveRolePermissions; 

// 16. GENERIC
export const getGenericData = (module: string) => runGAS('apiGet', module);
export const saveGenericData = (module: string, item: any) => item.id ? runGAS('apiUpdate', module, item.id, item, getCurrentRole()) : runGAS('apiAdd', module, item, getCurrentRole());
export const deleteGenericData = (module: string, id: string) => runGAS('apiDelete', module, id, getCurrentRole());

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
        }, getCurrentRole());
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
