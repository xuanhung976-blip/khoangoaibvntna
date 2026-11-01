import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  History,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Presentation,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
  keywords?: string;
  chiefOnly?: boolean;
  /** Mã module trong ma trận phân quyền (quyền "view"). */
  module?: string;
};

export type NavGroup = { title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Tổng quan',
    items: [{ path: '/', label: 'Trung tâm điều hành', icon: LayoutDashboard, description: 'Việc cần xử lý, kíp trực, chỉ số khoa', keywords: 'dashboard tong quan hom nay' }],
  },
  {
    title: 'Lâm sàng',
    items: [
      { path: '/clinical', module: 'clinical', label: 'Bệnh nhân', icon: Stethoscope, description: 'Tiếp nhận, theo dõi, ra viện, sơ đồ giường', keywords: 'benh nhan noi tru giuong buong' },
      { path: '/surgery-approval', module: 'surgery', label: 'Duyệt & lịch mổ', icon: Activity, description: 'Duyệt mổ, phân công ê-kíp, xếp ca', keywords: 'duyet mo lich mo ca mo ekip phau thuat' },
      { path: '/vip-patients', module: 'vip', label: 'BN cần lưu ý', icon: Star, description: 'Bệnh nhân đặc biệt cần quan tâm', keywords: 'vip luu y dac biet' },
      { path: '/surgery-stats', module: 'clinical', label: 'Thống kê PT-TT', icon: BarChart3, description: 'Số liệu phẫu thuật, thủ thuật theo tháng', keywords: 'thong ke bao cao phau thuat thu thuat rfa' },
    ],
  },
  {
    title: 'Điều dưỡng',
    items: [
      { path: '/nursing-tasks', module: 'dieu_duong', label: 'Công tác điều dưỡng', icon: HeartPulse, description: 'Phân công cá nhân / nhóm & tiến độ', keywords: 'dieu duong ca truc cham soc phan cong nhom' },
      { path: '/shifts', module: 'shifts', label: 'Lịch trực', icon: CalendarClock, description: 'Phân trực bác sĩ & điều dưỡng', keywords: 'lich truc phan ca truc' },
    ],
  },
  {
    title: 'Điều hành',
    items: [
      { path: '/daily-briefing', module: 'briefing', label: 'Giao ban', icon: ClipboardList, description: 'Sổ giao ban & phân công việc', keywords: 'giao ban hang ngay so giao ban' },
      { path: '/staff-performance', module: 'staff_performance', label: 'Công việc & Đánh giá', icon: ClipboardCheck, description: 'Theo dõi việc được giao, đánh giá nhân viên', keywords: 'cong viec danh gia nhan vien kpi' },
      { path: '/new-techniques', module: 'technique', label: 'Kỹ thuật mới', icon: Lightbulb, description: 'Triển khai kỹ thuật mới', keywords: 'ky thuat moi' },
      { path: '/communication', module: 'comms', label: 'Truyền thông', icon: Megaphone, description: 'Kế hoạch & bài đăng truyền thông', keywords: 'truyen thong facebook zalo bai viet' },
    ],
  },
  {
    title: 'Khoa học',
    items: [
      { path: '/research', module: 'research', label: 'Đề tài NCKH', icon: BookOpen, description: 'Đề tài & trích xuất mẫu nghiên cứu', keywords: 'nghien cuu khoa hoc de tai nckh' },
      { path: '/science-meetings', module: 'meetings', label: 'Sinh hoạt khoa học', icon: Presentation, description: 'Lịch sinh hoạt chuyên môn', keywords: 'sinh hoat khoa hoc shkh' },
    ],
  },
  {
    title: 'Hậu cần',
    items: [
      { path: '/inventory', module: 'inventory', label: 'Dược & thiết bị', icon: FlaskConical, description: 'Thuốc, vật tư, hạn dùng, kiểm định máy', keywords: 'kho duoc thuoc vat tu thiet bi may moc' },
      { path: '/5s', module: '5s', label: '5S', icon: Sparkles, description: 'Khu vực, đánh giá, cải tiến 5S', keywords: '5s ve sinh cai tien' },
    ],
  },
  {
    title: 'Quản trị',
    items: [
      { path: '/users', label: 'Người dùng', icon: UsersRound, description: 'Tài khoản, vai trò, mật khẩu', keywords: 'nguoi dung tai khoan user', chiefOnly: true },
      { path: '/permissions', label: 'Phân quyền', icon: ShieldCheck, description: 'Ma trận quyền theo vai trò', keywords: 'phan quyen vai tro', chiefOnly: true },
      { path: '/settings', label: 'Cấu hình', icon: Settings2, description: 'Tham số hệ thống', keywords: 'cau hinh config', chiefOnly: true },
      { path: '/audit-logs', label: 'Nhật ký hoạt động', icon: History, description: 'Ai đã làm gì, khi nào', keywords: 'nhat ky audit log lich su', chiefOnly: true },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(group => group.items);

export const findNavItem = (pathname: string): NavItem | undefined =>
  pathname === '/' ? ALL_NAV_ITEMS[0] : ALL_NAV_ITEMS.find(item => item.path !== '/' && pathname.startsWith(item.path));

export const PAGE_ICON_FALLBACK = ScrollText;
