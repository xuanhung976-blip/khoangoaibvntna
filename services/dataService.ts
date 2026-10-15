
// ... existing imports ...
import {
    Patient,
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
    LoginResult,
    StaffTask,
    NursingTask,
    AuditLog,
} from '../types';
import { callApi } from './apiClient';
import * as ClinicalApi from './clinicalApiService';

const SESSION_TOKEN_KEY = 'app_session_token';
const SESSION_EXPIRES_KEY = 'app_session_expires_at';
const CLINICAL_PROOF_KEY = 'app_clinical_session_proof';
const GAS_READ_FUNCTIONS = new Set([
    'apiGet',
    'getDoctors',
    'getPersonnelLists',
    'getBriefingBundle',
    'getDashboardOperationsData',
    'getNursingTasks',
]);
const gasReadInFlight = new Map<string, Promise<any>>();
type PersonnelLists = { doctors: string[]; nurses: string[] };
type BriefingDirectoryUser = Pick<User, 'username' | 'fullName'>;
type BriefingBundle = { briefings: DailyBriefing[]; users: BriefingDirectoryUser[] };
export type DashboardOperationsData = {
    staffTasks: StaffTask[];
    medicines: Medicine[];
    equipment: MedicalEquipment[];
    improvements: Improvement5S[];
    evaluations5S: Evaluation5S[];
    shifts: DailyOnCall[];
    meetings: ScientificMeeting[];
    research: ResearchTopic[];
    nursingTasks: NursingTask[];
};
export type ReadOptions = { bypassCache?: boolean };
// Tham số tuỳ chọn cuối cùng có khóa bypassCache sẽ được runGAS tách ra khỏi args.
const readOpts = (options?: ReadOptions): RunGasOptions[] => (options?.bypassCache ? [{ bypassCache: true }] : []);
let personnelCache: { sessionToken: string; data: PersonnelLists; expiresAt: number } | null = null;
let personnelInFlight: { sessionToken: string; promise: Promise<PersonnelLists> } | null = null;
const PERSONNEL_CACHE_MS = 5 * 60_000;

export const getSessionToken = (): string => localStorage.getItem(SESSION_TOKEN_KEY) || '';

export const setSessionToken = (token: string, expiresAt?: string, clinicalProof?: string) => {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
    if (expiresAt) localStorage.setItem(SESSION_EXPIRES_KEY, expiresAt);
    if (clinicalProof) localStorage.setItem(CLINICAL_PROOF_KEY, clinicalProof);
    else localStorage.removeItem(CLINICAL_PROOF_KEY);
};

export const clearSession = () => {
    ClinicalApi.invalidateClinicalCaches();
    ClinicalApi.clearClinicalProof();
    gasReadInFlight.clear();
    personnelCache = null;
    personnelInFlight = null;
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRES_KEY);
    localStorage.removeItem('app_user');
    sessionStorage.removeItem('cache_dashboard_data');
    sessionStorage.removeItem('cache_clinical_patients');
    sessionStorage.removeItem('cache_clinical_vip_ids');
    sessionStorage.removeItem('cache_clinical_doctors');
};

export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('app_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        // Corrupted app_user in localStorage — clear it to prevent write failures
        localStorage.removeItem('app_user');
        return null;
    }
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
    const token = getSessionToken();
    const payload = { funcName, args, sessionToken: token, bypassCache };
    const readKey = !bypassCache && GAS_READ_FUNCTIONS.has(funcName)
        ? `${token}:${funcName}:${JSON.stringify(args)}`
        : '';
    if (readKey && gasReadInFlight.has(readKey)) {
        return gasReadInFlight.get(readKey)!;
    }

    const request = callApi('/api/rpc', payload).catch((err) => {
        const message = err?.message || String(err);
        try {
            localStorage.setItem('last_gas_error', `Chức năng: ${funcName}. Chi tiết: ${message}`);
        } catch {}
        if (message.includes('AUTH_REQUIRED') || message.includes('SESSION_EXPIRED')) {
            if (token && !token.startsWith('sb_')) {
                clearSession();
                window.dispatchEvent(new Event('app_session_expired'));
            }
        }
        throw err;
    });

    if (!readKey) return request;
    const trackedRequest = request.finally(() => {
        if (gasReadInFlight.get(readKey) === trackedRequest) gasReadInFlight.delete(readKey);
    });
    gasReadInFlight.set(readKey, trackedRequest);
    return trackedRequest;
};

const runClinical = async <T>(operation: (sessionToken: string) => Promise<T>): Promise<T> => {
    try {
        return await operation(getSessionToken());
    } catch (error: any) {
        if (error?.code === 'AUTH_REQUIRED' || error?.code === 'SESSION_EXPIRED') {
            clearSession();
            window.dispatchEvent(new Event('app_session_expired'));
        }
        throw error;
    }
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

// --- Dual-Write Helper ---
// Supabase là nguồn chính. Ghi GAS lỗi sẽ được đưa vào hàng đợi retry trong phiên
// và phát sự kiện gas_sync_status để UI/monitoring có thể cảnh báo.
type PendingGasWrite = {
    id: string;
    run: () => Promise<any>;
    attempts: number;
    lastError: string;
};

const pendingGasWrites = new Map<string, PendingGasWrite>();
let gasRetryTimer: ReturnType<typeof setTimeout> | null = null;
let failedGasWrites = 0;

const notifyGasSyncStatus = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('gas_sync_status', {
        detail: {
            pending: pendingGasWrites.size,
            failed: failedGasWrites,
            degraded: pendingGasWrites.size > 0 || failedGasWrites > 0,
        },
    }));
};

const flushPendingGasWrites = async () => {
    gasRetryTimer = null;
    for (const job of Array.from(pendingGasWrites.values())) {
        try {
            await job.run();
            pendingGasWrites.delete(job.id);
        } catch (error: any) {
            job.attempts += 1;
            job.lastError = error?.message || String(error);
            if (job.attempts >= 3) {
                console.error('[DualWrite] GAS sync failed after retries:', job.lastError);
                failedGasWrites += 1;
                pendingGasWrites.delete(job.id);
            }
        }
    }
    notifyGasSyncStatus();
    if (pendingGasWrites.size > 0) {
        gasRetryTimer = setTimeout(flushPendingGasWrites, 5000);
    }
};

const enqueueGasWrite = (run: () => Promise<any>, error: any) => {
    const id = `gas_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    pendingGasWrites.set(id, {
        id,
        run,
        attempts: 1,
        lastError: error?.message || String(error),
    });
    notifyGasSyncStatus();
    if (!gasRetryTimer) gasRetryTimer = setTimeout(flushPendingGasWrites, 2000);
};

export const getGasSyncStatus = () => ({
    pending: pendingGasWrites.size,
    failed: failedGasWrites,
    degraded: pendingGasWrites.size > 0 || failedGasWrites > 0,
});

const dualWrite = async <T>(sbFn: () => Promise<T>, gasFn: () => Promise<any>): Promise<T> => {
    // Supabase là nguồn chính: chỉ ghi bản sao GAS sau khi giao dịch chính thành công.
    const sbResult = await sbFn();
    try {
        await gasFn();
    } catch (error: any) {
        console.warn('[DualWrite] GAS sync queued for retry:', error?.message ?? String(error));
        enqueueGasWrite(gasFn, error);
    }
    return sbResult;
};

// --- Data Router ---

// 1. PATIENTS
export const getPatients = (_options?: { bypassCache?: boolean }) =>
    runClinical(token => ClinicalApi.getPatients(token, _options?.bypassCache === true));

export const getPatientsForStats = (_options?: { bypassCache?: boolean }) =>
    runClinical(token => ClinicalApi.getPatients(token, _options?.bypassCache === true));

export const getSurgeryApprovalPatients = (options?: { bypassCache?: boolean }) =>
    runClinical(token => ClinicalApi.getSurgeryApprovalPatients(token, options?.bypassCache === true));

export const addPatient = (p: Patient) =>
    dualWrite(
        () => runClinical(token => ClinicalApi.addPatient(p, token)),
        () => runGAS('apiAdd', 'DS_BenhNhan', p, getCurrentActor()),
    );

export const updatePatient = (id: string, p: Partial<Patient>) =>
    dualWrite(
        () => runClinical(token => ClinicalApi.updatePatient(id, p, token)),
        () => runGAS('apiUpdate', 'DS_BenhNhan', id, p, getCurrentActor()),
    );

/**
 * Lưu thứ tự ca mổ cho nhiều bệnh nhân một lúc: Supabase (nguồn chính) ghi song song,
 * bản sao Google Sheets ghi tuần tự ở nền để không tranh khóa LockService của GAS.
 */
let surgeryOrderMirror: Promise<void> = Promise.resolve();
export const saveSurgeryOrder = async (changes: Array<{ id: string; order: number }>) => {
    if (!changes.length) return;
    await runClinical(token => Promise.all(changes.map(change => ClinicalApi.updatePatient(change.id, { surgeryOrder: change.order }, token))));
    const actor = getCurrentActor();
    surgeryOrderMirror = surgeryOrderMirror.then(async () => {
        for (const change of changes) {
            const gasFn = () => runGAS('apiUpdate', 'DS_BenhNhan', change.id, { surgeryOrder: change.order }, actor);
            try {
                await gasFn();
            } catch (error) {
                enqueueGasWrite(gasFn, error);
            }
        }
    });
};

export const deletePatient = (id: string) =>
    dualWrite(
        () => runClinical(token => ClinicalApi.deletePatient(id, token)),
        () => runGAS('apiDelete', 'DS_BenhNhan', id, getCurrentActor()),
    );

// 2. VIP
export const getVipPatients = (_options?: { bypassCache?: boolean }) =>
    runClinical(token => ClinicalApi.getVipPatients(token, _options?.bypassCache === true));

export const addVipPatient = (idBN: string, priority: string, reason: string) =>
    dualWrite(
        () => runClinical(token => ClinicalApi.addVipPatient(idBN, priority, reason, token)),
        () => runGAS('addVipPatientSafe', { patientId: idBN, priority, reason }, getCurrentActor()),
    );

export const removeVipPatient = (id: string) =>
    dualWrite(
        () => runClinical(token => ClinicalApi.removeVipPatient(id, token)),
        () => runGAS('apiDelete', 'BN_LuuY', id, getCurrentActor()),
    );

// 3. MEDICINES (GAS only)
export const getMedicines = (options?: ReadOptions): Promise<Medicine[]> => runGAS('apiGet', 'Thuoc_Kho', ...readOpts(options));
export const addMedicine = (m: Medicine) => runGAS('apiAdd', 'Thuoc_Kho', m, getCurrentActor());
export const updateMedicine = (id: string, m: Partial<Medicine>) => runGAS('apiUpdate', 'Thuoc_Kho', id, m, getCurrentActor());
export const deleteMedicine = (id: string) => runGAS('apiDelete', 'Thuoc_Kho', id, getCurrentActor());

// 4. EQUIPMENT (GAS only)
export const getEquipment = (options?: ReadOptions): Promise<MedicalEquipment[]> => runGAS('apiGet', 'May_Moc', ...readOpts(options));
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
export const getResearchTopics = async (options?: ReadOptions): Promise<ResearchTopic[]> => {
    try {
        const gasData = await runGAS('apiGet', 'DeTai_CoSo', ...readOpts(options));
        return Array.isArray(gasData) ? gasData : [];
    } catch { return []; }
};
export const addResearchTopic = (r: ResearchTopic) =>
    runGAS('apiAdd', 'DeTai_CoSo', r, getCurrentActor());
export const updateResearchTopic = (id: string, r: Partial<ResearchTopic>) =>
    runGAS('apiUpdate', 'DeTai_CoSo', id, r, getCurrentActor());
export const deleteResearchTopic = (id: string) =>
    runGAS('apiDelete', 'DeTai_CoSo', id, getCurrentActor());

// 7. MEETINGS
export const getScientificMeetings = (options?: ReadOptions): Promise<ScientificMeeting[]> =>
    runGAS('apiGet', 'SinhHoat_KH', ...readOpts(options));
export const addScientificMeeting = (s: ScientificMeeting) =>
    runGAS('apiAdd', 'SinhHoat_KH', s, getCurrentActor());
export const updateScientificMeeting = (id: string, s: Partial<ScientificMeeting>) =>
    runGAS('apiUpdate', 'SinhHoat_KH', id, s, getCurrentActor());
export const deleteScientificMeeting = (id: string) =>
    runGAS('apiDelete', 'SinhHoat_KH', id, getCurrentActor());

// 8. BRIEFINGS
export const getBriefings = () =>
    runGAS('apiGet', 'GiaoBan_Log');
export const getBriefingBundle = async (options?: ReadOptions): Promise<BriefingBundle> => {
    const result = await runGAS('getBriefingBundle', ...readOpts(options));
    return {
        briefings: Array.isArray(result?.briefings) ? result.briefings : [],
        users: Array.isArray(result?.users) ? result.users : [],
    };
};
export const syncBriefingTasksToStaffTasks = async () => ({ success: true, handledBy: 'backend' });
export const addBriefing = async (b: DailyBriefing) => {
    const gasPayload = { ...b, congViecJson: JSON.stringify(b.tasks || []) };
    return runGAS('apiAdd', 'GiaoBan_Log', gasPayload, getCurrentActor());
};
export const updateBriefing = async (id: string, b: Partial<DailyBriefing>) => {
    const gasPayload: any = { ...b };
    if (b.tasks) gasPayload['congViecJson'] = JSON.stringify(b.tasks);
    return runGAS('apiUpdate', 'GiaoBan_Log', id, gasPayload, getCurrentActor());
};

// 9. TECHNIQUES
export const getTechniques = (options?: ReadOptions): Promise<NewTechnique[]> =>
    runGAS('apiGet', 'KyThuat_Moi', ...readOpts(options));
export const addTechnique = (t: NewTechnique) =>
    runGAS('apiAdd', 'KyThuat_Moi', t, getCurrentActor());
export const updateTechnique = (id: string, t: Partial<NewTechnique>) =>
    runGAS('apiUpdate', 'KyThuat_Moi', id, t, getCurrentActor());
export const deleteTechnique = (id: string) =>
    runGAS('apiDelete', 'KyThuat_Moi', id, getCurrentActor());

// 10. COMMUNICATION
export const getCommunication = (options?: ReadOptions): Promise<CommunicationContent[]> =>
    runGAS('apiGet', 'NoiDung_TT', ...readOpts(options));
export const addCommunication = (c: CommunicationContent) =>
    runGAS('apiAdd', 'NoiDung_TT', c, getCurrentActor());
export const updateCommunication = (id: string, c: Partial<CommunicationContent>) =>
    runGAS('apiUpdate', 'NoiDung_TT', id, c, getCurrentActor());
export const deleteCommunication = (id: string) =>
    runGAS('apiDelete', 'NoiDung_TT', id, getCurrentActor());

// 11. 5S
export const getZones = (options?: ReadOptions): Promise<Zone5S[]> =>
    runGAS('apiGet', 'Vung_5S', ...readOpts(options));
export const addZone = (z: Zone5S) =>
    runGAS('apiAdd', 'Vung_5S', z, getCurrentActor());
export const updateZone = (id: string, z: Partial<Zone5S>) =>
    runGAS('apiUpdate', 'Vung_5S', id, z, getCurrentActor());
export const deleteZone = (id: string) =>
    runGAS('apiDelete', 'Vung_5S', id, getCurrentActor());
export const getEvaluations = (options?: ReadOptions): Promise<Evaluation5S[]> =>
    runGAS('apiGet', 'DanhGia_5S', ...readOpts(options));
export const addEvaluation = (e: Evaluation5S) =>
    runGAS('apiAdd', 'DanhGia_5S', e, getCurrentActor());
export const getImprovements = (options?: ReadOptions): Promise<Improvement5S[]> =>
    runGAS('apiGet', 'CaiTien_5S', ...readOpts(options));
export const addImprovement = (i: Improvement5S) =>
    runGAS('apiAdd', 'CaiTien_5S', i, getCurrentActor());
export const updateImprovement = (id: string, i: Partial<Improvement5S>) =>
    runGAS('apiUpdate', 'CaiTien_5S', id, i, getCurrentActor());
export const deleteImprovement = (id: string) =>
    runGAS('apiDelete', 'CaiTien_5S', id, getCurrentActor());

// 12. SHIFTS
export const getDailyOnCall = (options?: ReadOptions): Promise<DailyOnCall[]> =>
    runGAS('apiGet', 'Phan_Truc_Ngay', ...readOpts(options));
export const saveDailyOnCall = (d: DailyOnCall) => {
    if (d.id) return runGAS('apiUpdate', 'Phan_Truc_Ngay', d.id, d, getCurrentActor());
    return runGAS('apiAdd', 'Phan_Truc_Ngay', d, getCurrentActor());
};
export const deleteDailyOnCall = (id: string) =>
    runGAS('apiDelete', 'Phan_Truc_Ngay', id, getCurrentActor());
export const batchSaveDailyOnCall = (shifts: Partial<DailyOnCall>[]) =>
    runGAS('batchSaveDailyOnCall', shifts, getCurrentActor());

export const getPersonnelLists = (options?: { bypassCache?: boolean }): Promise<PersonnelLists> => {
    const sessionToken = getSessionToken();
    if (options?.bypassCache) {
        personnelCache = null;
        personnelInFlight = null;
    }
    if (personnelCache?.sessionToken === sessionToken && personnelCache.expiresAt > Date.now()) {
        return Promise.resolve(personnelCache.data);
    }
    if (personnelInFlight?.sessionToken === sessionToken) return personnelInFlight.promise;

    const promise = runGAS('getPersonnelLists')
        .then(result => {
            const data = {
                doctors: Array.isArray(result?.doctors) ? result.doctors : [],
                nurses: Array.isArray(result?.nurses) ? result.nurses : [],
            };
            personnelCache = { sessionToken, data, expiresAt: Date.now() + PERSONNEL_CACHE_MS };
            return data;
        })
        .catch(() => ({ doctors: [], nurses: [] }))
        .finally(() => {
            if (personnelInFlight?.promise === promise) personnelInFlight = null;
        });
    personnelInFlight = { sessionToken, promise };
    return promise;
};

// 13. CONFIGS
export const getConfigs = (options?: ReadOptions): Promise<SystemConfig[]> =>
    runGAS('apiGet', 'Config', ...readOpts(options));
export const addConfig = (c: SystemConfig) =>
    runGAS('apiAdd', 'Config', c, getCurrentActor());
export const saveConfig = (c: SystemConfig) =>
    runGAS('apiUpdate', 'Config', c.key, c, getCurrentActor());
export const deleteConfig = (key: string) =>
    runGAS('apiDelete', 'Config', key, getCurrentActor());

// 14. USERS & AUTH
export const loginUser = async (u: string, p: string): Promise<User | null> => {
    const result: LoginResult | null = await runGAS('loginUser', u, p);
    if (!result) return null;
    const user = result.user || result;
    if (result.sessionToken) setSessionToken(result.sessionToken, result.expiresAt, result.clinicalProof);
    return user;
};
export const logoutUser = async () => {
    try { await runGAS('logoutUser'); } finally { clearSession(); }
};
export const changeMyPassword = (currentPassword: string, newPassword: string) =>
    runGAS('changeMyPassword', { currentPassword, newPassword }).then(result => {
        ClinicalApi.clearClinicalProof();
        return result;
    });
export const getUsers = (options?: ReadOptions): Promise<User[]> => runGAS('apiGet', 'Users', ...readOpts(options));
export const getDoctorsList = async (options?: { bypassCache?: boolean }) => {
    return runGAS('getDoctors', options);
};
export const saveUser = (u: User) => runGAS('apiAdd', 'Users', u, getCurrentActor());
export const updateUser = (username: string, u: Partial<User> & { password?: string }) =>
    runGAS('apiUpdate', 'Users', username, u, getCurrentActor());
export const deleteUser = (username: string) =>
    runGAS('apiDelete', 'Users', username, getCurrentActor());
export const toggleLockUser = (username: string, active: boolean) =>
    runGAS('apiUpdate', 'Users', username, { active }, getCurrentActor());
// GAS không có hàm resetUserPassword riêng: đặt mật khẩu tạm qua apiUpdate Users,
// backend tự băm mật khẩu và bật mustChangePassword cho lần đăng nhập kế tiếp.
export const resetUserPassword = (username: string, temporaryPassword: string) =>
    runGAS('apiUpdate', 'Users', username, { password: temporaryPassword }, getCurrentActor());

// 15. PERMISSIONS
export const getPermissions = (options?: ReadOptions): Promise<RolePermission[]> =>
    runGAS('apiGet', 'Roles_Permission', ...readOpts(options));
export const saveRolePermissions = (perms: RolePermission[]) =>
    runGAS('saveRolePermissions', perms, getCurrentActor());
export const savePermissions = saveRolePermissions;

// 16. GENERIC
export const getGenericData = (module: string, options?: ReadOptions) => runGAS('apiGet', module, ...readOpts(options));
export const saveGenericData = (module: string, item: any) => item.id ? runGAS('apiUpdate', module, item.id, item, getCurrentActor()) : runGAS('apiAdd', module, item, getCurrentActor());
export const deleteGenericData = (module: string, id: string) => runGAS('apiDelete', module, id, getCurrentActor());

export const writeActionLog = async (action: string, target: string, detail: any) => {
    try {
        const userStr = localStorage.getItem('app_user');
        const user = userStr ? JSON.parse(userStr) : null;
        await runGAS('apiAdd', 'Logs', { action, target, detail: typeof detail === 'string' ? detail : JSON.stringify(detail), username: user?.username || '', fullName: user?.fullName || '', createdAt: new Date().toISOString() }, getCurrentActor());
    } catch { /* Logging is optional */ }
};

// 17. STAFF PERFORMANCE
export const getStaffTasks = (options?: ReadOptions): Promise<StaffTask[]> =>
    getGenericData('CongViec_NhanVien', options);
export const addStaffTask = (task: StaffTask) =>
    saveGenericData('CongViec_NhanVien', task);
export const updateStaffTask = (id: string, task: Partial<StaffTask>) =>
    saveGenericData('CongViec_NhanVien', { ...task, id });
export const deleteStaffTask = (id: string) =>
    deleteGenericData('CongViec_NhanVien', id);

export const getStaffEvaluations = (options?: ReadOptions): Promise<StaffEvaluation[]> =>
    getGenericData('DanhGia_NhanVien', options);
export const addStaffEvaluation = (evaluation: StaffEvaluation) =>
    saveGenericData('DanhGia_NhanVien', evaluation);
export const updateStaffEvaluation = (id: string, evaluation: Partial<StaffEvaluation>) =>
    saveGenericData('DanhGia_NhanVien', { ...evaluation, id });
export const deleteStaffEvaluation = (id: string) =>
    deleteGenericData('DanhGia_NhanVien', id);

// DASHBOARD
export const getDashboardStats = () =>
    runClinical(token => ClinicalApi.getDashboardStats(token));

export const getDashboardOperationsData = async (options?: { bypassCache?: boolean }): Promise<DashboardOperationsData> => {
    const result = await (options
        ? runGAS('getDashboardOperationsData', options)
        : runGAS('getDashboardOperationsData'));
    return {
        staffTasks: Array.isArray(result?.staffTasks) ? result.staffTasks : [],
        medicines: Array.isArray(result?.medicines) ? result.medicines : [],
        equipment: Array.isArray(result?.equipment) ? result.equipment : [],
        improvements: Array.isArray(result?.improvements) ? result.improvements : [],
        evaluations5S: Array.isArray(result?.evaluations5S) ? result.evaluations5S : [],
        shifts: Array.isArray(result?.shifts) ? result.shifts : [],
        meetings: Array.isArray(result?.meetings) ? result.meetings : [],
        research: Array.isArray(result?.research) ? result.research : [],
        nursingTasks: Array.isArray(result?.nursingTasks) ? result.nursingTasks : [],
    };
};

// 18. NURSING TASKS (Công tác điều dưỡng)
const NURSING_SHEET = 'CongTac_DieuDuong';
export const getNursingTasks = async (fromDate: string, toDate: string, options?: ReadOptions): Promise<NursingTask[]> => {
    const result = await runGAS('getNursingTasks', fromDate, toDate, ...readOpts(options));
    return Array.isArray(result) ? result : [];
};
export const addNursingTask = (task: Partial<NursingTask>) =>
    runGAS('apiAdd', NURSING_SHEET, { ...task, createdBy: task.createdBy || getCurrentActor().fullName, updatedAt: new Date().toISOString() }, getCurrentActor());
export const updateNursingTask = (id: string, task: Partial<NursingTask>) =>
    runGAS('apiUpdate', NURSING_SHEET, id, { ...task, updatedAt: new Date().toISOString() }, getCurrentActor());
export const deleteNursingTask = (id: string) =>
    runGAS('apiDelete', NURSING_SHEET, id, getCurrentActor());
export const batchAddNursingTasks = (tasks: Partial<NursingTask>[]) => {
    const createdBy = getCurrentActor().fullName;
    const updatedAt = new Date().toISOString();
    return runGAS('batchAddNursingTasks', tasks.map(task => ({ ...task, createdBy: task.createdBy || createdBy, updatedAt })));
};

// 19. AUDIT LOGS (chỉ Trưởng khoa)
export const getRecentAuditLogs = async (limit = 300): Promise<AuditLog[]> => {
    const result = await runGAS('getRecentAuditLogs', { limit });
    return Array.isArray(result) ? result : [];
};

// 20. DANH BẠ NHÂN SỰ (mọi người dùng đã đăng nhập; không cần quyền quản trị Users)
export const getStaffDirectory = async (options?: ReadOptions): Promise<BriefingDirectoryUser[]> => {
    const bundle = await getBriefingBundle(options);
    return bundle.users;
};

// 21. QUYỀN CỦA NGƯỜI ĐANG ĐĂNG NHẬP & CÔNG TẮC KIỂM SOÁT QUYỀN CHI TIẾT
export type MyAccess = { enforced: boolean; denied: string[] };
export const getMyAccess = async (): Promise<MyAccess> => {
    const result = await runGAS('getMyAccess');
    return { enforced: result?.enforced === true, denied: Array.isArray(result?.denied) ? result.denied : [] };
};
export const setPermissionEnforcement = (enabled: boolean): Promise<{ enforced: boolean }> =>
    runGAS('setPermissionEnforcement', enabled);
