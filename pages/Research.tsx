
import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Search, Plus, Trash2, Edit2, Loader2, Calendar, User, BarChart, Database, FileSpreadsheet, X, Filter, RefreshCw } from 'lucide-react';
import { ResearchTopic, Role, Patient } from '../types';
import { getResearchTopics, addResearchTopic, updateResearchTopic, deleteResearchTopic, getPatients } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface Props {
  userRole: Role;
}

// Filter State Interface
interface DataFilters {
    status: string;
    interventionType: string;
    activityType: string;
    surgeryMethod: string; // Text search
    surgeon: string;
    fromDate: string;
    toDate: string;
}

export const Research: React.FC<Props> = ({ userRole }) => {
  const [data, setData] = useState<ResearchTopic[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]); // Store clinical data
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ResearchTopic>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Data View Modal State
  const [viewDataTopic, setViewDataTopic] = useState<ResearchTopic | null>(null);
  
  // --- NEW: Filter State for Data View ---
  const [filters, setFilters] = useState<DataFilters>({
      status: 'DaMo', // Default behavior: Show Post-Op patients
      interventionType: '',
      activityType: '',
      surgeryMethod: '',
      surgeon: '',
      fromDate: '',
      toDate: ''
  });

  // Permissions
  const canDelete = userRole === Role.CHIEF;

  useEffect(() => {
    loadData();
  }, []);

  // Reset filters when opening a new topic
  useEffect(() => {
      if (viewDataTopic) {
          setFilters({
              status: 'DaMo',
              interventionType: '',
              activityType: '',
              surgeryMethod: '',
              surgeon: '',
              fromDate: '',
              toDate: ''
          });
      }
  }, [viewDataTopic]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [topicsResult, patientsResult] = await Promise.all([
          getResearchTopics(),
          getPatients()
      ]);
      setData(topicsResult);
      setPatients(patientsResult);
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(item => 
    item.topic.toLowerCase().includes(search.toLowerCase()) || 
    item.author.toLowerCase().includes(search.toLowerCase())
  );

  // --- DYNAMIC OPTIONS FOR FILTERS ---
  const uniqueInterventions = useMemo(() => {
      const types = new Set(patients.map(p => p.interventionType).filter(Boolean));
      return Array.from(types).sort();
  }, [patients]);

  const uniqueSurgeons = useMemo(() => {
      const surgeons = new Set(patients.map(p => p.surgeon).filter(Boolean));
      return Array.from(surgeons).sort();
  }, [patients]);

  // --- MAIN FILTERING LOGIC ---
  const getFilteredPatients = (): Patient[] => {
      return patients.filter(p => {
          // 1. Status Filter
          if (filters.status && filters.status !== 'All') {
              if (p.status !== filters.status) return false;
          }

          // 2. Intervention Type
          if (filters.interventionType && p.interventionType !== filters.interventionType) {
              return false;
          }

          // 3. Activity Type
          if (filters.activityType && p.activityType !== filters.activityType) {
              return false;
          }

          // 4. Surgeon
          if (filters.surgeon && p.surgeon !== filters.surgeon) {
              return false;
          }

          // 5. Surgery Method (Text Search)
          if (filters.surgeryMethod) {
              const method = (p.surgeryMethod || '').toLowerCase();
              if (!method.includes(filters.surgeryMethod.toLowerCase())) return false;
          }

          // 6. Date Range (Based on Actual Surgery Date)
          if (filters.fromDate || filters.toDate) {
              if (!p.actualSurgeryDate) return false;
              const surgDate = new Date(p.actualSurgeryDate);
              
              if (filters.fromDate) {
                  const from = new Date(filters.fromDate);
                  if (surgDate < from) return false;
              }
              if (filters.toDate) {
                  const to = new Date(filters.toDate);
                  if (surgDate > to) return false;
              }
          }

          return true;
      });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.topic) {
        showToast('Vui lòng nhập tên đề tài', 'error');
        return;
    }
    setSubmitting(true);
    try {
        if (currentItem.id) {
            await updateResearchTopic(currentItem.id, currentItem);
            showToast('Cập nhật đề tài thành công', 'success');
        } else {
            await addResearchTopic(currentItem as any);
            showToast('Thêm mới đề tài thành công', 'success');
        }
        setIsModalOpen(false);
        loadData();
    } catch (e) {
        showToast('Có lỗi xảy ra', 'error');
    } finally {
        setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !canDelete) return;
    setSubmitting(true);
    try {
        await deleteResearchTopic(deleteId);
        showToast('Đã xoá đề tài', 'success');
        setIsDeleteModalOpen(false);
        loadData();
    } catch (e) {
        showToast('Lỗi khi xoá', 'error');
    } finally {
        setSubmitting(false);
        setDeleteId(null);
    }
  };

  const openAdd = () => {
    setCurrentItem({ progress: 0, startDate: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const openEdit = (item: ResearchTopic) => {
    setCurrentItem({ ...item });
    setIsModalOpen(true);
  };

  // Helper UI Components
  const ProgressBar = ({ pct }: { pct: number }) => {
    let color = 'bg-red-500';
    if (pct >= 80) color = 'bg-green-500';
    else if (pct >= 50) color = 'bg-yellow-500';

    return (
        <div className="w-full flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}></div>
            </div>
            <span className="text-xs font-semibold text-slate-600 w-8 text-right">{pct}%</span>
        </div>
    );
  };

  const formatDate = (d: string) => {
      if (!d) return '-';
      const [y, m, dstr] = d.split('-');
      return `${dstr}/${m}/${y}`;
  };

  const getAge = (dob: string) => {
    if (!dob) return '';
    const year = new Date(dob).getFullYear();
    const currentYear = new Date().getFullYear();
    return currentYear - year;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-blue-600" />
                Đề tài Nghiên cứu Khoa học
            </h2>
            <p className="text-sm text-slate-500 mt-1">Theo dõi tiến độ & Số liệu lâm sàng</p>
        </div>
        
        <button 
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
            <Plus className="h-4 w-4" />
            <span>Đăng ký Đề tài</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Tìm tên đề tài, chủ nhiệm..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
             </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 w-1/3">Tên đề tài</th>
                        <th className="px-6 py-3">Chủ nhiệm</th>
                        <th className="px-6 py-3">Dữ liệu</th>
                        <th className="px-6 py-3 w-1/4">Tiến độ</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : filtered.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Chưa có đề tài nào.</td></tr>
                    ) : filtered.map(item => {
                        return (
                            <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-800 line-clamp-2" title={item.topic}>{item.topic}</div>
                                    {item.notes && <div className="text-xs text-slate-500 mt-1 italic">{item.notes}</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                            {item.author.charAt(0)}
                                        </div>
                                        <span className="text-slate-700">{item.author}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => setViewDataTopic(item)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border bg-white border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors shadow-sm"
                                    >
                                        <Database className="h-3 w-3" />
                                        Truy xuất số liệu
                                    </button>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                    <ProgressBar pct={item.progress} />
                                    <div className="text-[10px] text-slate-400 mt-1 text-right">
                                        KT: {formatDate(item.deadline)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => openEdit(item)}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        {canDelete && (
                                            <button 
                                                onClick={() => { setDeleteId(item.id); setIsDeleteModalOpen(true); }}
                                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* DATA VIEW MODAL */}
      {viewDataTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white z-10">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-green-600" />
                            Số liệu đề tài
                        </h3>
                        <p className="text-sm text-slate-500 truncate max-w-2xl">{viewDataTopic.topic}</p>
                    </div>
                    <button onClick={() => setViewDataTopic(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* FILTER PANEL */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 shadow-inner">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                            <Filter className="h-4 w-4 text-blue-600" /> Bộ lọc dữ liệu lâm sàng
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Trạng thái điều trị</label>
                                <select 
                                    className="w-full text-sm border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={filters.status}
                                    onChange={e => setFilters({...filters, status: e.target.value})}
                                >
                                    <option value="DaMo">Đã mổ (Hậu phẫu)</option>
                                    <option value="DaDuyet">Đã duyệt mổ</option>
                                    <option value="DieuTri">Đang điều trị</option>
                                    <option value="RaVien">Đã ra viện</option>
                                    <option value="All">Tất cả</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Loại can thiệp</label>
                                <select 
                                    className="w-full text-sm border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={filters.interventionType}
                                    onChange={e => setFilters({...filters, interventionType: e.target.value})}
                                >
                                    <option value="">-- Tất cả --</option>
                                    {uniqueInterventions.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Loại hoạt động</label>
                                <select 
                                    className="w-full text-sm border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={filters.activityType}
                                    onChange={e => setFilters({...filters, activityType: e.target.value})}
                                >
                                    <option value="">-- Tất cả --</option>
                                    <option value="Phẫu thuật">Phẫu thuật</option>
                                    <option value="Thủ thuật">Thủ thuật</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Phẫu thuật viên</label>
                                <select 
                                    className="w-full text-sm border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={filters.surgeon}
                                    onChange={e => setFilters({...filters, surgeon: e.target.value})}
                                >
                                    <option value="">-- Tất cả --</option>
                                    {uniqueSurgeons.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Phương pháp (Tìm kiếm)</label>
                                <input 
                                    type="text" 
                                    className="w-full text-sm border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="VD: TOETVA, Mổ mở..."
                                    value={filters.surgeryMethod}
                                    onChange={e => setFilters({...filters, surgeryMethod: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Từ ngày</label>
                                <input 
                                    type="date" 
                                    className="w-full text-sm border-slate-300 rounded-md"
                                    value={filters.fromDate}
                                    onChange={e => setFilters({...filters, fromDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Đến ngày</label>
                                <input 
                                    type="date" 
                                    className="w-full text-sm border-slate-300 rounded-md"
                                    value={filters.toDate}
                                    onChange={e => setFilters({...filters, toDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end mt-3">
                            <button 
                                onClick={() => setFilters({
                                    status: 'DaMo',
                                    interventionType: '',
                                    activityType: '',
                                    surgeryMethod: '',
                                    surgeon: '',
                                    fromDate: '',
                                    toDate: ''
                                })}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-medium"
                            >
                                <RefreshCw className="h-3 w-3" /> Đặt lại bộ lọc
                            </button>
                        </div>
                    </div>

                    {/* DATA TABLE */}
                    <div className="flex-1 overflow-auto p-0">
                        {(() => {
                            const matchingData = getFilteredPatients();
                            
                            if (matchingData.length === 0) {
                                return (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white">
                                        <Database className="h-12 w-12 mb-3 opacity-50 text-slate-300" />
                                        <p className="font-medium">Không có bệnh nhân phù hợp với điều kiện lọc đã chọn.</p>
                                        <p className="text-xs mt-2 text-slate-400">Vui lòng điều chỉnh bộ lọc phía trên.</p>
                                    </div>
                                );
                            }
                            return (
                                <div className="min-w-full inline-block align-middle">
                                    <div className="bg-white border-b border-slate-200">
                                        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center text-sm text-indigo-800 font-bold sticky top-0 z-20">
                                            <span>Kết quả: {matchingData.length} bệnh nhân</span>
                                        </div>
                                        <table className="min-w-full text-xs text-left">
                                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-[37px] z-20 shadow-sm">
                                                <tr>
                                                    <th className="px-4 py-3 w-24">Mã BN</th>
                                                    <th className="px-4 py-3">Họ Tên / Tuổi</th>
                                                    <th className="px-4 py-3">Chẩn đoán</th>
                                                    <th className="px-4 py-3">Can thiệp</th>
                                                    <th className="px-4 py-3">Phương pháp</th>
                                                    <th className="px-4 py-3">Ngày mổ</th>
                                                    <th className="px-4 py-3">Phẫu thuật viên</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {matchingData.map(p => (
                                                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                                                        <td className="px-4 py-3 font-mono text-blue-600 font-semibold align-top">{p.id}</td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="font-medium text-slate-800">{p.name}</div>
                                                            <div className="text-slate-400">{getAge(p.dob)}t - {p.gender}</div>
                                                        </td>
                                                        <td className="px-4 py-3 max-w-[200px] align-top text-slate-600" title={p.diagnosis}>{p.diagnosis}</td>
                                                        <td className="px-4 py-3 align-top">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium border border-slate-200">
                                                                {p.interventionType || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 align-top text-slate-600">{p.surgeryMethod || '-'}</td>
                                                        <td className="px-4 py-3 font-medium align-top text-slate-700">{p.actualSurgeryDate ? formatDate(p.actualSurgeryDate) : '-'}</td>
                                                        <td className="px-4 py-3 align-top text-slate-700">{p.surgeon || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={currentItem.id ? "Cập nhật Đề tài" : "Đăng ký Đề tài mới"}
      >
        <form onSubmit={handleSave} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên đề tài <span className="text-red-500">*</span></label>
                <textarea 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                    value={currentItem.topic || ''}
                    onChange={e => setCurrentItem({...currentItem, topic: e.target.value})}
                    placeholder="VD: Nghiên cứu ứng dụng PTNS tuyến giáp qua đường miệng (TOETVA)..."
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chủ nhiệm đề tài</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={currentItem.author || ''}
                        onChange={e => setCurrentItem({...currentItem, author: e.target.value})}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                    <input 
                        type="date" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={currentItem.startDate || ''}
                        onChange={e => setCurrentItem({...currentItem, startDate: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hạn nghiệm thu</label>
                    <input 
                        type="date" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={currentItem.deadline || ''}
                        onChange={e => setCurrentItem({...currentItem, deadline: e.target.value})}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiến độ thực hiện (%)</label>
                <div className="flex items-center gap-4">
                    <input 
                        type="range" 
                        min="0" max="100" 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        value={currentItem.progress || 0}
                        onChange={e => setCurrentItem({...currentItem, progress: parseInt(e.target.value)})}
                    />
                    <span className="font-bold text-blue-600 w-12 text-right">{currentItem.progress || 0}%</span>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentItem.notes || ''}
                    onChange={e => setCurrentItem({...currentItem, notes: e.target.value})}
                    placeholder="Giai đoạn, khó khăn, đề xuất..."
                />
            </div>

            <div className="flex gap-3 justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                    Hủy
                </button>
                <button 
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Lưu hồ sơ
                </button>
            </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)}
        title="Xác nhận xoá"
      >
        <div className="text-center">
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xoá đề tài này không?</p>
            <div className="flex gap-3 justify-center">
                <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                    Hủy
                </button>
                <button 
                    onClick={handleDelete}
                    disabled={submitting}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300"
                >
                    Xoá vĩnh viễn
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};
