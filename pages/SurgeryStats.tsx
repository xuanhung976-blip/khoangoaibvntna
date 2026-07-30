
import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Filter, Activity, Zap, ShieldCheck, Scissors, CheckCircle2, Loader2 } from 'lucide-react';
import { getPatients } from '../services/dataService';
import { Patient } from '../types';
import { showToast } from '../components/Toast';

export const SurgeryStats: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [patients, setPatients] = useState<Patient[]>([]);
  
  const [stats, setStats] = useState({
      total: 0, // Grand Total
      totalSurgeries: 0, // Excludes RFA
      totalProcedures: 0, // Only RFA
      groups: {
          'TOETVA': 0,
          'KGiap': 0,
          'LanhTinh': 0,
          'Basedow': 0,
          'ETS': 0, // PTNS đốt hạch
          'Other': 0
      },
      classifications: {
          'Đặc biệt': 0,
          'Loại I': 0,
          'Loại II': 0,
          'Loại III': 0
      } as Record<string, number>
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [patients, filterDate]);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await getPatients();
        // Include ALL patients who have an actual surgery date OR surgery date.
        setPatients(data.filter((p: Patient) => {
            const dateStr = p.actualSurgeryDate || p.surgeryDate;
            return Boolean(dateStr && dateStr.trim() !== '');
        }));
    } catch (e) {
        showToast('Lỗi tải dữ liệu', 'error');
    } finally {
        setLoading(false);
    }
  };

  const parseVietnameseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const dateOnly = dateStr.split('T')[0];
    if (dateOnly.includes('/')) {
      const parts = dateOnly.split('/');
      if (parts.length >= 3) {
        const m = Number(parts[1]);
        const y = Number(parts[2].split(' ')[0]);
        if (y > 1000 && m >= 1 && m <= 12) return { year: y, month: m };
      }
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(dateOnly)) {
      const parts = dateOnly.split('-');
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      if (y > 1000 && m >= 1 && m <= 12) return { year: y, month: m };
    }
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return { year: parsedDate.getFullYear(), month: parsedDate.getMonth() + 1 };
    }
    return null;
  };

  const calculateStats = () => {
      const counts = {
          total: 0,
          totalSurgeries: 0,
          totalProcedures: 0,
          groups: { TOETVA: 0, KGiap: 0, LanhTinh: 0, Basedow: 0, ETS: 0, Other: 0 },
          classifications: { 'Đặc biệt': 0, 'Loại I': 0, 'Loại II': 0, 'Loại III': 0 }
      };

      const [filterYear, filterMonth] = filterDate.split('-').map(Number);

      const filteredPatients = patients.filter(p => {
          const surgDateStr = p.actualSurgeryDate || p.surgeryDate;
          if (!surgDateStr) return false;
          
          if (filterDate === 'ALL') return true;

          const parsed = parseVietnameseDate(surgDateStr);
          if (!parsed) return false;
          return parsed.year === filterYear && parsed.month === filterMonth;
      });

      filteredPatients.forEach(p => {
          counts.total++;

          const iType = (p.interventionType || '').trim();
          const sClass = (p.surgeryClassification || '').trim();
          const iTypeUpper = iType.toUpperCase();
          
          // === THỦ THUẬT (RFA ONLY) ===
          if (iTypeUpper === 'RFA') {
              counts.totalProcedures++;
              // RFA is NOT included in Surgery Structure or Classification
          } 
          // === PHẪU THUẬT (ALL OTHERS) ===
          else {
              counts.totalSurgeries++;

              // Grouping using explicit stored intervention type (GAS style)
              if (iTypeUpper === 'TOETVA') {
                  counts.groups.TOETVA++;
              } else if (
                  iTypeUpper === 'MỔ K TUYẾN GIÁP' ||
                  iTypeUpper === 'MỔ K' ||
                  iTypeUpper === 'K TUYẾN GIÁP' ||
                  iTypeUpper === 'UNG THƯ TUYẾN GIÁP'
              ) {
                  counts.groups.KGiap++;
              } else if (iTypeUpper === 'BASEDOW') {
                  counts.groups.Basedow++;
              } else if (
                  iTypeUpper === 'PTNS ĐỐT HẠCH GIAO CẢM' ||
                  iTypeUpper === 'ETS' ||
                  iTypeUpper === 'ĐỐT HẠCH GIAO CẢM'
              ) {
                  counts.groups.ETS++;
              } else if (
                  iTypeUpper === 'CẮT 1 THUỲ TUYẾN GIÁP' ||
                  iTypeUpper === 'CẮT TOÀN BỘ TUYẾN GIÁP' ||
                  iTypeUpper.includes('LÀNH TÍNH')
              ) {
                  counts.groups.LanhTinh++;
              } else {
                  counts.groups.Other++;
              }

              // Administrative Classification (Only for Surgeries)
              if (sClass && counts.classifications[sClass as keyof typeof counts.classifications] !== undefined) {
                  counts.classifications[sClass as keyof typeof counts.classifications]++;
              }
          }
      });

      setStats(counts);
  };

  const StatCard = ({ title, value, icon: Icon, color, subtext, pct }: any) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            {pct !== undefined && <span className="text-xs font-medium text-slate-400">({pct}%)</span>}
        </div>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );

  const GroupBar = ({ label, count, total, color }: any) => {
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return (
          <div className="mb-4 last:mb-0">
              <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="font-semibold text-slate-900">{count} <span className="text-slate-400 text-xs font-normal">({percentage}%)</span></span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full ${color} transition-all duration-700 ease-out`} style={{ width: `${percentage}%` }}></div>
              </div>
          </div>
      );
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER & FILTER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-blue-600" />
                Thống kê Phẫu thuật - Thủ thuật
            </h2>
            <p className="text-sm text-slate-500 mt-1">({stats.total} ca hồ sơ)</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <Filter className="h-4 w-4 text-slate-400 ml-2" />
            <span className="text-sm font-medium text-slate-600 mr-2">Thời gian:</span>
            <input 
                type="month" 
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
            />
            <button 
                onClick={() => setFilterDate('ALL')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterDate === 'ALL' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}`}
            >
                Tất cả
            </button>
        </div>
      </div>

      {/* KEY METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL SURGERY */}
        <StatCard 
            title="Tổng Phẫu thuật" 
            value={stats.totalSurgeries} 
            icon={TrendingUp} 
            color="bg-blue-600"
            subtext="Chưa bao gồm Thủ thuật"
        />

        {/* HIGH PRIORITY GROUPS (Pct of Surgeries) */}
        <StatCard 
            title="K Tuyến giáp" 
            value={stats.groups.KGiap} 
            pct={stats.totalSurgeries > 0 ? Math.round((stats.groups.KGiap / stats.totalSurgeries) * 100) : 0}
            icon={ShieldCheck} 
            color="bg-red-500"
            subtext="Ung thư tuyến giáp"
        />
        <StatCard 
            title="TOETVA" 
            value={stats.groups.TOETVA} 
            pct={stats.totalSurgeries > 0 ? Math.round((stats.groups.TOETVA / stats.totalSurgeries) * 100) : 0}
            icon={CheckCircle2} 
            color="bg-green-600"
            subtext="PTNS tuyến giáp"
        />
        {/* TOTAL PROCEDURES */}
        <StatCard 
            title="Tổng Thủ thuật" 
            value={stats.totalProcedures} 
            icon={Zap} 
            color="bg-purple-500"
            subtext="Can thiệp RFA"
        />
      </div>

      {/* DETAILED BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: DETAILED GROUPS CHART (SURGERIES ONLY) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 text-lg">
                <Activity className="h-5 w-5 text-blue-600" />
                Cơ cấu Mặt bệnh (Chỉ Phẫu thuật)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Nhóm Bệnh Chính</h4>
                    <GroupBar label="Mổ K Tuyến giáp" count={stats.groups.KGiap} total={stats.totalSurgeries} color="bg-red-500" />
                    <GroupBar label="TOETVA (Nội soi)" count={stats.groups.TOETVA} total={stats.totalSurgeries} color="bg-green-500" />
                    <GroupBar label="Basedow" count={stats.groups.Basedow} total={stats.totalSurgeries} color="bg-orange-500" />
                    <GroupBar label="Bướu giáp lành tính" count={stats.groups.LanhTinh} total={stats.totalSurgeries} color="bg-blue-500" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Nhóm Khác</h4>
                    <GroupBar label="PTNS Đốt hạch (ETS)" count={stats.groups.ETS} total={stats.totalSurgeries} color="bg-indigo-500" />
                    <GroupBar label="Phẫu thuật khác" count={stats.groups.Other} total={stats.totalSurgeries} color="bg-slate-400" />
                </div>
            </div>
        </div>

        {/* RIGHT: CLASSIFICATION (SURGERIES ONLY) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 text-lg">
                <Scissors className="h-5 w-5 text-blue-600" />
                Phân loại Phẫu thuật
             </h3>
             <div className="space-y-6">
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-red-800">Đặc biệt</span>
                        <span className="text-lg font-bold text-red-700">{stats.classifications['Đặc biệt']}</span>
                    </div>
                    <div className="w-full bg-red-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full" style={{ width: `${stats.totalSurgeries ? (stats.classifications['Đặc biệt'] / stats.totalSurgeries) * 100 : 0}%` }}></div>
                    </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-orange-800">Loại I</span>
                        <span className="text-lg font-bold text-orange-700">{stats.classifications['Loại I']}</span>
                    </div>
                    <div className="w-full bg-orange-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full" style={{ width: `${stats.totalSurgeries ? (stats.classifications['Loại I'] / stats.totalSurgeries) * 100 : 0}%` }}></div>
                    </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-blue-800">Loại II</span>
                        <span className="text-lg font-bold text-blue-700">{stats.classifications['Loại II']}</span>
                    </div>
                    <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${stats.totalSurgeries ? (stats.classifications['Loại II'] / stats.totalSurgeries) * 100 : 0}%` }}></div>
                    </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-green-800">Loại III</span>
                        <span className="text-lg font-bold text-green-700">{stats.classifications['Loại III']}</span>
                    </div>
                    <div className="w-full bg-green-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${stats.totalSurgeries ? (stats.classifications['Loại III'] / stats.totalSurgeries) * 100 : 0}%` }}></div>
                    </div>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};
