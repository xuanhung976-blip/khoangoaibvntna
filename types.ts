
export const APP_LOGO_URL = "https://raw.githubusercontent.com/xuanhung976-blip/1/main/logo.png";

export enum Role {
  CHIEF = 'TRUONG_KHOA',
  HEAD_NURSE = 'DIEU_DUONG_TRUONG',
  STAFF = 'NHAN_VIEN'
}

export interface User {
  username: string;
  password?: string;
  fullName: string;
  role: Role;
  nhomChuyenMon?: 'BS' | 'DD'; // Updated: Professional Group (Bác sĩ / Điều dưỡng)
  active: boolean;
  createdAt?: string;
  canDeletePatient?: boolean | string; // Permission flag from DB
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  gender: 'Nam' | 'Nữ';
  phoneNumber?: string; // NEW: Phone Number
  room: string;
  bed: string;
  treatmentType: 'Noi' | 'Ngoai';
  status: 'ChoMo' | 'DaDuyet' | 'DaMo' | 'DieuTri' | 'RaVien';
  diagnosis: string;
  treatingDoctor?: string; // Bác sĩ điều trị
  admissionDate: string;
  dischargeDate?: string; // NEW: Discharge Date
  notes?: string;
  
  // Pre-op Planning (Duyệt mổ)
  surgeryDate?: string;          // NgayMoDuKien (Planned)
  approvalDate?: string;         // NgayDuyetMo
  approvalNote?: string;         // GhiChuDuyetMo
  surgeon?: string;              // BSMoChinh
  assistantSurgeon1?: string;    // BSPhu1
  assistantSurgeon2?: string;    // BSPhu2
  assistantSurgeon3?: string;    // BSPhu3
  anesthetist?: string;          // BSGayMe
  anesthetistAssistant?: string; // BSPhuMe
  scrubNurse?: string;           // DieuDuongDungCu
  
  // Post-op Actual Data (Đã mổ - For Statistics)
  actualSurgeryDate?: string;     // NgayPhauThuat (Actual)
  surgeryMethod?: string;         // CachThucPhauThuat (Free text: "TOETVA", "Mổ mở"...)
  surgeryClassification?: 'Đặc biệt' | 'Loại I' | 'Loại II' | 'Loại III'; // LoaiPhauThuat (Enum)
  interventionType?: string;      // LoaiCanThiep (Enum: Mổ K giáp, Basedow...)
  activityType?: 'Phẫu thuật' | 'Thủ thuật'; // LoaiHoatDong (Derived)
}

export interface VipPatient {
    id: string;
    patientId: string; // ID of the patient
    name: string;
    room: string;
    bed: string;
    priority: 'Cao' | 'Trung bình' | 'Thấp';
    reason: string;
}

export interface Medicine {
    id: string;
    name: string;
    content?: string;
    quantity: number;
    unit: string;
    expiryDate: string;
    notes?: string;
}

export interface MedicalEquipment {
    id: string;
    name: string;
    code: string;
    inCharge: string;
    purchaseDate?: string;
    lastMaintenanceDate: string;
    maintenanceCycle: number;
    condition: 'Normal' | 'Broken' | 'Repairing';
    notes?: string;
}

export interface ResearchTopic {
    id: string;
    topic: string;
    author: string;
    startDate: string;
    deadline: string;
    progress: number;
    notes?: string;
}

export interface ScientificMeeting {
    id: string;
    time: string;
    topic: string;
    presenter: string;
    location: string;
    notes?: string;
}

export interface BriefingTask {
    id: string;
    taskName: string;
    assignee: string;
    deadline: string;
    progress: number;
}

export interface DailyBriefing {
    id: string;
    date: string;
    host: string;
    content: string;
    tasks: BriefingTask[];
}

export interface NewTechnique {
    id: string;
    name: string;
    leader: string;
    startDate: string;
    description?: string;
    progress: number;
    count: number;
    status: 'DeXuat' | 'DangTrienKhai' | 'HoanThanh';
    results?: string;
}

export interface CommunicationContent {
    id: string;
    title: string;
    content?: string;
    platform: 'Facebook' | 'Website' | 'Zalo' | 'Báo chí';
    leader: string;
    publishDate: string;
    status: 'Nhap' | 'Duyet' | 'DaDang';
    link?: string;
}

export interface Zone5S {
    id: string;
    name: string;
    type: string; // Updated to string for free text
    pic: string;
    currentScore: number;
    lastCheckDate: string;
    notes?: string;
}

export interface Evaluation5S {
    id: string;
    zoneId: string;
    date: string;
    score: number;
    assessor: string;
    comments?: string;
}

export interface Improvement5S {
    id: string;
    zoneId: string;
    content: string;
    proposer: string;
    status: 'DeXuat' | 'DangLam' | 'HoanThanh';
    result?: string;
}

export interface DailyOnCall {
    id: string;
    date: string; // YYYY-MM-DD
    doctor: string;
    nurse1: string;
    nurse2: string;
    note?: string;
}

export interface SystemConfig {
    key: string;
    value: string;
    description?: string;
}

export interface RolePermission {
    role: Role;
    module: string;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export interface StaffTask {
    id: string;
    userId: string;
    tieuDe: string;
    noiDung?: string;
    nguoiGiao: string;
    ngayGiao: string;
    hanHoanThanh: string;
    mucDoUuTien: 'Thấp' | 'Trung bình' | 'Cao' | 'Khẩn';
    trangThai: 'Chưa làm' | 'Đang làm' | 'Hoàn thành' | 'Tạm dừng';
    tienDo: number | string;
    ketQua?: string;
    ghiChu?: string;
}

export interface StaffEvaluation {
    id: string;
    userId: string;
    loaiDanhGia: 'Quý' | 'Năm' | string;
    quy?: string;
    nam: number | string;
    diemHoanThanhCongViec: number | string;
    diemThaiDo: number | string;
    diemKyLuat: number | string;
    diemPhoiHop: number | string;
    diemSangKien: number | string;
    diemTong: number | string;
    xepLoai: string;
    nhanXet?: string;
    nguoiDanhGia: string;
    ngayDanhGia: string;
}

export const STAFF_PERFORMANCE_PERMISSION_KEY = 'staff_performance';

export const STAFF_TASK_STATUSES = ['Chưa làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'] as const;
export const STAFF_TASK_PRIORITIES = ['Thấp', 'Trung bình', 'Cao', 'Khẩn'] as const;
export const STAFF_EVALUATION_TYPES = ['Quý', 'Năm'] as const;

export interface DeadlineItem {
    id?: string;
    type: string;
    title: string;
    description?: string; // New: Full detail content
    assignee?: string;    // New: Person responsible
    date: string;
    status: 'overdue' | 'today' | 'upcoming';
    link: string;
}

export interface DashboardStats {
    clinical: {
        total: number;
        waitingSurgery: number;
        vip: number;
        discharged: number;
    };
    surgery: {
        monthTotal: number;
        approved: number;
        };
    science: {
        ongoing: number;
        meetingsMonth: number;
    };
    admin: {
        briefingToday: string | null;
        overdueTasks: number;
    };
    inventory: {
        medsNearExpiry: number;
        equipOverdue: number;
    };
    onCall: {
        doctor: string;
        nurse1: string;
        nurse2: string;
    };
    deadlines: DeadlineItem[];
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export const MODULE_NAMES = [
    { id: 'clinical', label: 'Lâm sàng' },
    { id: 'surgery', label: 'Phẫu thuật' },
    { id: 'vip', label: 'VIP' },
    { id: 'research', label: 'Nghiên cứu' },
    { id: 'meetings', label: 'SH Khoa học' },
    { id: 'briefing', label: 'Giao ban' },
    { id: 'technique', label: 'Kỹ thuật mới' },
    { id: 'comms', label: 'Truyền thông' },
    { id: 'inventory', label: 'Kho Dược/VT' },
    { id: '5s', label: '5S' },
    { id: 'shifts', label: 'Phân trực' },
    { id: 'dieu_duong', label: 'Công tác ĐD' },
    { id: STAFF_PERFORMANCE_PERMISSION_KEY, label: 'Công việc & Đánh giá' },
];
