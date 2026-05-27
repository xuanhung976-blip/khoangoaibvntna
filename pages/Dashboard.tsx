
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, Activity, AlertTriangle, Package, CalendarDays, 
    Stethoscope, HeartPulse, ClipboardCheck, ArrowRight, 
    FlaskConical, User, Clock, CheckCircle2, AlertCircle, ChevronRight, X
} from 'lucide-react';
import { getDashboardStats } from '../services/dataService';
import { DashboardStats, DeadlineItem, APP_LOGO_URL } from '../types';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Detail Modal State
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineItem | null>(null);

  useEffect(() => {
    const loadData = async () => {
        try {
            const data = await getDashboardStats();
            setStats(data);
        } catch (e) {
            showToast('Lỗi tải dữ liệu tổng quan', 'error');
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  if (loading || !stats) {
      return (
          <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
      );
  }

  const StatCard = ({ title, value, icon: Icon, color, link, badge }: any) => (
    <div 
        onClick={() => navigate(link)}
        className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
    >
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color.replace('bg-', 'text-')}`}>
            <Icon className="h-16 w-16" />
        </div>
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
                    {badge && badge > 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                            +{badge} lưu ý
                        </span>
                    )}
                </div>
            </div>
            <div className={`p-2.5 rounded-lg ${color} text-white`}>
                <Icon className="h-5 w-5" />
            </div>
        </div>
        <div className="mt-4 flex items-center text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Xem chi tiết <ArrowRight className="h-3 w-3 ml-1" />
        </div>
    </div>
  );

  // Format Date Helper
  const getDayMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return { day: d.getDate(), month: d.getMonth() + 1 };
  };

  const handleViewDetail = (item: DeadlineItem) => {
      setSelectedDeadline(item);
  };

  return (
    <div className="space-y-6">
        {/* BRAND HEADER */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <img 
              src={APP_LOGO_URL} 
              alt="" 
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-full bg-white shadow-md border-2 border-slate-100 object-cover" 
           />
           <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-800 uppercase tracking-tight">Bệnh viện Nội tiết Nghệ An</h1>
              <p className="text-slate-500 font-medium">Khoa Ngoại Tổng Hợp</p>
           </div>
        </div>

        {/* SECTION 1: ON-CALL TODAY */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Activity className="h-32 w-32" />
            </div>
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" /> Trực hôm nay ({new Date().toLocaleDateString('vi-VN')})
                    </h2>
                    <button onClick={() => navigate('/shifts')} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">
                        Xem lịch tháng
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                        <p className="text-xs text-blue-100 uppercase tracking-wide mb-1">Bác sĩ trực</p>
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <Stethoscope className="h-5 w-5 text-yellow-300" />
                            {stats.onCall.doctor}
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                        <p className="text-xs text-blue-100 uppercase tracking-wide mb-1">Điều dưỡng 1</p>
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <HeartPulse className="h-5 w-5 text-pink-300" />
                            {stats.onCall.nurse1 || '---'}
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                        <p className="text-xs text-blue-100 uppercase tracking-wide mb-1">Điều dưỡng 2</p>
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <HeartPulse className="h-5 w-5 text-pink-300" />
                            {stats.onCall.nurse2 || '---'}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* SECTION 2: KEY METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Bệnh nhân nội trú" 
                value={stats.clinical.total} 
                icon={Users} 
                color="bg-blue-500" 
                link="/clinical"
                badge={stats.clinical.waitingSurgery} // Show waiting as badge
            />
            <StatCard 
                title="Chờ duyệt mổ" 
                value={stats.clinical.waitingSurgery} 
                icon={Activity} 
                color="bg-orange-500"
                link="/surgery-approval"
            />
             <StatCard 
                title="BN Lưu ý (VIP)" 
                value={stats.clinical.vip} 
                icon={AlertTriangle} 
                color="bg-purple-500"
                link="/vip-patients"
            />
             <StatCard 
                title="Thuốc / Vật tư" 
                value={stats.inventory.medsNearExpiry > 0 ? "Cảnh báo" : "Ổn định"}
                icon={Package} 
                color={stats.inventory.medsNearExpiry > 0 ? "bg-red-500" : "bg-emerald-500"}
                link="/inventory"
                badge={stats.inventory.medsNearExpiry}
            />
        </div>

        {/* SECTION 3: URGENT TASKS / DEADLINES (NEW) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-red-600" />
                    Việc cần xử lý & Deadline sắp tới
                </h3>
                {stats.deadlines.length > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">{stats.deadlines.length}</span>}
            </div>
            <div className="divide-y divide-slate-50">
                {stats.deadlines.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic flex flex-col items-center">
                        <CheckCircle2 className="h-8 w-8 mb-2 text-green-500 opacity-50" />
                        Không có công việc nào đến hạn trong 7 ngày tới.
                    </div>
                ) : (
                    stats.deadlines.map((item, idx) => {
                        const dm = getDayMonth(item.date);
                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleViewDetail(item)}
                                className="p-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                            >
                                {/* Date Badge */}
                                <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border shadow-sm shrink-0 ${
                                    item.status === 'overdue' ? 'bg-red-50 border-red-200 text-red-700' :
                                    item.status === 'today' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                    'bg-emerald-50 border-emerald-200 text-emerald-700'
                                }`}>
                                    <span className="text-[10px] font-bold uppercase leading-none mt-1">T{dm.month}</span>
                                    <span className="text-xl font-bold leading-none mb-1">{dm.day}</span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                                            {item.type}
                                        </span>
                                        {item.status === 'overdue' && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 rounded flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Quá hạn</span>}
                                        {item.status === 'today' && <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 rounded flex items-center gap-1"><Clock className="h-3 w-3" /> Hôm nay</span>}
                                        {item.status === 'upcoming' && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-1.5 rounded">Sắp tới</span>}
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5 max-w-md">
                                        {item.assignee ? `${item.assignee} - ` : ''} {item.description?.replace(/\n/g, ' ') || ''}
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* SECTION 4: DETAILED PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Briefing Panel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-blue-600" />
                        Nội dung Giao ban hôm nay
                    </h3>
                    <span onClick={() => navigate('/daily-briefing')} className="text-xs text-blue-600 hover:underline cursor-pointer">Chi tiết</span>
                </div>
                <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-slate-100 text-sm text-slate-700">
                    {stats.admin.briefingToday ? (
                        <p className="whitespace-pre-line">{stats.admin.briefingToday}</p>
                    ) : (
                        <p className="text-slate-400 italic text-center py-4">Chưa có nội dung giao ban hôm nay.</p>
                    )}
                </div>
            </div>

            {/* Quick Links & Status */}
            <div className="grid grid-cols-1 gap-4">
                <div 
                    onClick={() => navigate('/research')}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><FlaskConical className="h-5 w-5" /></div>
                        <div>
                            <p className="font-semibold text-slate-700">Nghiên cứu khoa học</p>
                            <p className="text-xs text-slate-500">Đang thực hiện: {stats.science.ongoing} đề tài</p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                </div>

                <div 
                    onClick={() => navigate('/users')}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 text-pink-600 rounded-lg"><User className="h-5 w-5" /></div>
                        <div>
                            <p className="font-semibold text-slate-700">Nhân sự khoa</p>
                            <p className="text-xs text-slate-500">Quản lý phân quyền và tài khoản</p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Trạng thái hệ thống</h4>
                    <div className="space-y-1 text-sm text-slate-600">
                        {stats.inventory.medsNearExpiry > 0 && (
                            <div className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-3 w-3" /> {stats.inventory.medsNearExpiry} thuốc cận hạn sử dụng</div>
                        )}
                        {stats.inventory.equipOverdue > 0 && (
                            <div className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-3 w-3" /> {stats.inventory.equipOverdue} thiết bị quá hạn kiểm định</div>
                        )}
                        {stats.inventory.medsNearExpiry === 0 && stats.inventory.equipOverdue === 0 && (
                            <span className="text-green-600 flex items-center gap-2"><ClipboardCheck className="h-3 w-3" /> Hệ thống ổn định.</span>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* DETAIL MODAL */}
        <Modal 
            isOpen={!!selectedDeadline} 
            onClose={() => setSelectedDeadline(null)} 
            title="Chi tiết Công việc"
        >
            {selectedDeadline && (
                <div className="space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {selectedDeadline.type}
                            </span>
                            {selectedDeadline.status === 'overdue' && (
                                <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Quá hạn
                                </span>
                            )}
                        </div>
                        <h4 className="text-lg font-bold text-slate-800 leading-tight">
                            {selectedDeadline.title}
                        </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Thời hạn</span>
                            <span className={`font-medium ${selectedDeadline.status === 'overdue' ? 'text-red-600' : 'text-slate-800'}`}>
                                {new Date(selectedDeadline.date).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Phụ trách</span>
                            <span className="font-medium text-slate-800 flex items-center gap-1">
                                {selectedDeadline.assignee ? (
                                    <><User className="h-3 w-3 text-blue-500" /> {selectedDeadline.assignee}</>
                                ) : '---'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                        {selectedDeadline.description || "Không có mô tả chi tiết."}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={() => setSelectedDeadline(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                        >
                            Đóng
                        </button>
                        <button 
                            onClick={() => navigate(selectedDeadline.link)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center gap-2"
                        >
                            Đến trang Quản lý <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    </div>
  );
};
