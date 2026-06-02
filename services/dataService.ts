
// ... existing imports ...
import {
    Patient,
    VipPatient,
    Medicine,
    MedicalEquipment,
    ResearchTopic,
    ScientificMeeting,
    DailyBriefing,
    BriefingTask,
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
// Giữ nguyên signature cũ của runGAS để không phải sửa exports bên dưới.
const runGAS = (funcName: string, ...args: any[]): Promise<any> => {
    const payload = { funcName, args };
    return callApi('/api/rpc', payload);
};

const getCurrentActor = (): Pick<User, 'username' | 'fullName' | 'role'> => {
    const userStr = localStorage.getItem('app_user');
    if (userStr) {
        const user = JSON.parse(userStr);
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

const getBriefingTaskSourceId = (task: Partial<BriefingTask>, index: number) =>
    String(task.id || `T${index + 1}`);

const buildBriefingStaffTask = (
    briefingId: string,
    briefing: Partial<DailyBriefing>,
    task: Partial<BriefingTask>,
    index: number,
    existing?: Partial<StaffTask>,
): Partial<StaffTask> => {
    const assigneeUsername = String(task.assigneeUsername || task.assignee || '');
    const assigneeName = String(task.assigneeName || task.assignee || assigneeUsername);

    return {
        ...existing,
        userId: assigneeUsername,
        tieuDe: String(task.taskName || ''),
        noiDung: String(briefing.content || ''),
        nguoiGiao: String(briefing.host || ''),
        ngayGiao: String(briefing.date || new Date().toISOString().split('T')[0]),
        hanHoanThanh: String(task.deadline || ''),
        mucDoUuTien: existing?.mucDoUuTien || 'Trung bình',
        trangThai: existing?.trangThai || 'Chưa làm',
        tienDo: existing?.tienDo ?? 0,
        ketQua: existing?.ketQua || '',
        ghiChu: existing?.ghiChu || '',
        sourceType: 'GIAO_BAN',
        sourceId: briefingId,
        sourceTaskId: getBriefingTaskSourceId(task, index),
        sourceTaskIndex: index,
        assigneeUsername,
        assigneeName,
        sourceDate: String(briefing.date || ''),
    };
};

export const syncBriefingTasksToStaffTasks = async (briefingId: string, briefing: Partial<DailyBriefing>) => {
    if (!briefingId) return;

    const briefingTasks = Array.isArray(briefing.tasks) ? briefing.tasks : [];
    const staffTasks: StaffTask[] = await runGAS('apiGet', 'CongViec_NhanVien');
    const existingFromBriefing = (Array.isArray(staffTasks) ? staffTasks : []).filter(
        task => task.sourceType === 'GIAO_BAN' && task.sourceId === briefingId
    );
    const activeSourceTaskIds = new Set<string>();
    const activeSourceTaskIndexes = new Set<string>();

    for (let index = 0; index < briefingTasks.length; index += 1) {
        const task = briefingTasks[index];
        if (!String(task.taskName || '').trim() || !String(task.assigneeUsername || task.assignee || '').trim()) continue;

        const sourceTaskId = getBriefingTaskSourceId(task, index);
        activeSourceTaskIds.add(sourceTaskId);
        activeSourceTaskIndexes.add(String(index));
        const existing = existingFromBriefing.find(item => item.sourceTaskId === sourceTaskId || String(item.sourceTaskIndex) === String(index));
        const payload = buildBriefingStaffTask(briefingId, briefing, task, index, existing);

        if (existing?.id) {
            await runGAS('apiUpdate', 'CongViec_NhanVien', existing.id, payload, getCurrentActor());
        } else {
            await runGAS('apiAdd', 'CongViec_NhanVien', payload, getCurrentActor());
        }
    }

    for (const existing of existingFromBriefing) {
        const sourceTaskId = String(existing.sourceTaskId || '');
        const stillExists = sourceTaskId ? activeSourceTaskIds.has(sourceTaskId) : activeSourceTaskIndexes.has(String(existing.sourceTaskIndex || ''));
        if (stillExists) continue;

        if (Number(existing.tienDo || 0) > 0) {
            const note = String(existing.ghiChu || '');
            await runGAS('apiUpdate', 'CongViec_NhanVien', existing.id, {
                ...existing,
                trangThai: 'Tạm dừng',
                ghiChu: note.includes('Đã bỏ khỏi giao ban') ? note : `${note ? `${note}\n` : ''}Đã bỏ khỏi giao ban`,
            }, getCurrentActor());
        } else {
            await runGAS('apiDelete', 'CongViec_NhanVien', existing.id, getCurrentActor());
        }
    }
};

export const addBriefing = async (b: DailyBriefing) => {
    const payload = { ...b, congViecJson: JSON.stringify(b.tasks || []) };
    const result = await runGAS('apiAdd', 'GiaoBan_Log', payload, getCurrentActor());
    const briefingId = String(result?.id || payload.id || '');
    await syncBriefingTasksToStaffTasks(briefingId, { ...payload, id: briefingId });
    return result;
};
export const updateBriefing = async (id: string, b: Partial<DailyBriefing>) => {
    const payload = { ...b };
    if (b.tasks) payload['congViecJson'] = JSON.stringify(b.tasks);
    const result = await runGAS('apiUpdate', 'GiaoBan_Log', id, payload, getCurrentActor());
    await syncBriefingTasksToStaffTasks(id, { ...payload, id });
    return result;
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
export const loginUser = (u: string, p: string) => runGAS('loginUser', u, p);
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
