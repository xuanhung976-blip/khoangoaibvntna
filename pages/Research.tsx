import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Calendar,
  User,
  Database,
  FileSpreadsheet,
  X,
  Filter,
  RefreshCw,
  Download,
  Printer,
  Sparkles,
  Users,
  CheckCircle2,
  Activity,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { ResearchTopic, Role, Patient } from '../types';
import {
  getResearchTopics,
  addResearchTopic,
  updateResearchTopic,
  deleteResearchTopic,
  getPatients,
} from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { getAge, exportToExcel } from '../utils/exportUtils';

interface Props {
  userRole: Role;
}

// Filter State Interface for Smart Clinical Query
interface DataFilters {
  status: string;
  interventionType: string;
  activityType: string;
  surgeryMethod: string;
  surgeon: string;
  fromDate: string;
  toDate: string;
  keywordSearch: string;
}

export const Research: React.FC<Props> = ({ userRole }) => {
  const [data, setData] = useState<ResearchTopic[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'>('ALL');

  // CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ResearchTopic>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Data View Modal State
  const [viewDataTopic, setViewDataTopic] = useState<ResearchTopic | null>(null);
  const [autoPresetBadge, setAutoPresetBadge] = useState<string | null>(null);

  // Filter State for Data View
  const [filters, setFilters] = useState<DataFilters>({
    status: 'All',
    interventionType: '',
    activityType: '',
    surgeryMethod: '',
    surgeon: '',
    fromDate: '',
    toDate: '',
    keywordSearch: '',
  });

  // Permissions
  const canDelete = Boolean(userRole || true);

  useEffect(() => {
    loadData();
  }, []);

  // Smart Auto-preset when opening a research topic modal
  useEffect(() => {
    if (viewDataTopic) {
      const topicTitle = (viewDataTopic.topic || '').toLowerCase();
      let matchedKeyword = '';
      let presetNote = '';

      // Extract key clinical keywords from research topic title
      if (topicTitle.includes('giao cảm') || topicTitle.includes('đốt nhánh') || topicTitle.includes('tăng mồ hôi')) {
        matchedKeyword = 'giao cảm';
        presetNote = 'Tự động lọc từ khóa: Giao cảm / Mồ hôi tay';
      } else if (topicTitle.includes('toetva')) {
        matchedKeyword = 'TOETVA';
        presetNote = 'Tự động lọc phương pháp: TOETVA';
      } else if (topicTitle.includes('tuyến giáp')) {
        matchedKeyword = 'tuyến giáp';
        presetNote = 'Tự động lọc: Tuyến giáp';
      } else if (topicTitle.includes('basedow')) {
        matchedKeyword = 'Basedow';
        presetNote = 'Tự động lọc chẩn đoán: Basedow';
      } else if (topicTitle.includes('dạ dày')) {
        matchedKeyword = 'dạ dày';
        presetNote = 'Tự động lọc: Dạ dày';
      } else if (topicTitle.includes('túi mật')) {
        matchedKeyword = 'túi mật';
        presetNote = 'Tự động lọc: Túi mật';
      } else if (topicTitle.includes('thoát vị')) {
        matchedKeyword = 'thoát vị';
        presetNote = 'Tự động lọc: Thoát vị';
      } else if (topicTitle.includes('nội soi')) {
        matchedKeyword = 'nội soi';
        presetNote = 'Tự động lọc: Nội soi';
      }

      setAutoPresetBadge(presetNote || 'Hiển thị dữ liệu bệnh nhân từ Module 1');
      setFilters({
        status: 'All',
        interventionType: '',
        activityType: '',
        surgeryMethod: '',
        surgeon: '',
        fromDate: '',
        toDate: '',
        keywordSearch: matchedKeyword,
      });
    } else {
      setAutoPresetBadge(null);
    }
  }, [viewDataTopic, patients]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [topicsResult, patientsResult] = await Promise.all([
        getResearchTopics(),
        getPatients(),
      ]);
      setData(topicsResult || []);
      setPatients(patientsResult || []);
    } catch (e) {
      showToast('Lỗi tải dữ liệu đề tài nghiên cứu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return (data || []).filter(Boolean).filter(item => {
      if (!item) return false;
      const matchText = (item.topic || '').toLowerCase().includes((search || '').toLowerCase()) ||
        (item.author || '').toLowerCase().includes((search || '').toLowerCase());
      if (!matchText) return false;

      const progress = Number(item.progress || 0);
      const isOverdue = item.deadline && new Date(item.deadline) < new Date() && progress < 100;

      if (statusFilter === 'COMPLETED') return progress >= 100;
      if (statusFilter === 'IN_PROGRESS') return progress < 100 && !isOverdue;
      if (statusFilter === 'OVERDUE') return isOverdue;
      return true;
    });
  }, [data, search, statusFilter]);

  // Dynamic Options for Filters
  const uniqueInterventions = useMemo(() => {
    const types = new Set((patients || []).filter(Boolean).map(p => p?.interventionType).filter(Boolean));
    return Array.from(types).sort();
  }, [patients]);

  const uniqueSurgeons = useMemo(() => {
    const surgeons = new Set((patients || []).filter(Boolean).map(p => p?.surgeon).filter(Boolean));
    return Array.from(surgeons).sort();
  }, [patients]);

  // Main Filtering Logic for Research Sample Selection linked with Module 1 (Clinical Patients)
  const getFilteredPatients = useCallback((): Patient[] => {
    return (patients || []).filter(Boolean).filter(p => {
      if (!p) return false;

      // 1. Status Filter (Handles aliases between Post-op, Discharged, and In-treatment)
      if (filters.status && filters.status !== 'All') {
        if (filters.status === 'DaMo') {
          // Post-op patient can be 'DaMo' or 'RaVien' or have surgeryDate/surgeryMethod
          const isPostOp = p.status === 'DaMo' || p.status === 'RaVien' || Boolean(p.surgeryDate || p.surgeryMethod);
          if (!isPostOp) return false;
        } else if (p.status !== filters.status) {
          return false;
        }
      }

      // 2. Intervention Type Filter
      if (filters.interventionType && p.interventionType !== filters.interventionType) {
        return false;
      }

      // 3. Activity Type (Handles surgery vs procedure flexible matching)
      if (filters.activityType) {
        if (filters.activityType === 'Phẫu thuật') {
          const isSurgery = p.activityType === 'Phẫu thuật' || Boolean(p.surgeryMethod || p.surgeon);
          if (!isSurgery) return false;
        } else if (filters.activityType === 'Thủ thuật') {
          const isProcedure = p.activityType === 'Thủ thuật' || (p.interventionType || '').includes('Thủ thuật');
          if (!isProcedure) return false;
        }
      }

      // 4. Surgeon Filter
      if (filters.surgeon && p.surgeon !== filters.surgeon) {
        return false;
      }

      // 5. Surgery Method Filter
      if (filters.surgeryMethod) {
        const method = (p.surgeryMethod || '').toLowerCase();
        if (!method.includes(filters.surgeryMethod.toLowerCase())) return false;
      }

      // 6. Flexible Keyword Search across Name, ID, Diagnosis, Surgery Method, Notes
      if (filters.keywordSearch) {
        const kw = filters.keywordSearch.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(kw);
        const matchId = (p.id || '').toLowerCase().includes(kw);
        const matchDiag = (p.diagnosis || '').toLowerCase().includes(kw);
        const matchMethod = (p.surgeryMethod || '').toLowerCase().includes(kw);
        const matchIntervention = (p.interventionType || '').toLowerCase().includes(kw);
        const matchNotes = (p.notes || '').toLowerCase().includes(kw);
        if (!matchName && !matchId && !matchDiag && !matchMethod && !matchIntervention && !matchNotes) {
          return false;
        }
      }

      // 7. Date Range Filter (Only when specified by user)
      if (filters.fromDate || filters.toDate) {
        const surgDateStr = p.actualSurgeryDate || p.surgeryDate || p.admissionDate;
        if (!surgDateStr) return false;
        const surgDate = new Date(surgDateStr);
        if (!Number.isNaN(surgDate.getTime())) {
          if (filters.fromDate) {
            const from = new Date(filters.fromDate);
            if (surgDate < from) return false;
          }
          if (filters.toDate) {
            const to = new Date(filters.toDate);
            if (surgDate > to) return false;
          }
        }
      }

      return true;
    });
  }, [patients, filters]);

  // Computed Analytical Metrics for Modal
  const matchingPatients = useMemo(() => getFilteredPatients(), [getFilteredPatients]);

  const sampleAnalytics = useMemo(() => {
    const total = matchingPatients.length;
    if (total === 0) return { male: 0, female: 0, malePct: 0, femalePct: 0, avgAge: 0, postOpCount: 0 };

    let male = 0;
    let female = 0;
    let totalAge = 0;
    let validAgeCount = 0;
    let postOpCount = 0;

    matchingPatients.forEach(p => {
      if (p.gender === 'Nam') male++;
      else if (p.gender === 'Nữ') female++;

      const age = Number(getAge(p.dob));
      if (Number.isFinite(age) && age > 0) {
        totalAge += age;
        validAgeCount++;
      }

      if (p.status === 'DaMo' || p.actualSurgeryDate) postOpCount++;
    });

    return {
      male,
      female,
      malePct: Math.round((male / total) * 100),
      femalePct: Math.round((female / total) * 100),
      avgAge: validAgeCount > 0 ? (totalAge / validAgeCount).toFixed(1) : 0,
      postOpCount,
    };
  }, [matchingPatients]);

  // Export Filtered Research Data to Excel
  const handleExportDataExcel = () => {
    if (!viewDataTopic) return;
    if (matchingPatients.length === 0) {
      showToast('Không có dữ liệu bệnh nhân phù hợp để xuất Excel', 'warning');
      return;
    }

    exportToExcel({
      fileName: `SoLieu_NCKH_${(viewDataTopic.topic || 'DeTai').slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`,
      sheetName: 'Số liệu mẫu NCKH',
      title: `BẢNG SỐ LIỆU LÂM SÀNG NGHIÊN CỨU KHOA HỌC`,
      subtitle: `Đề tài: ${viewDataTopic.topic} | Chủ nhiệm: ${viewDataTopic.author} | Cỡ mẫu N = ${matchingPatients.length} bệnh nhân`,
      headers: [
        'STT',
        'Mã BN',
        'Họ và tên',
        'Tuổi',
        'Giới tính',
        'Số điện thoại',
        'Phòng / Giường',
        'Chẩn đoán lâm sàng',
        'Loại can thiệp',
        'Phương pháp phẫu thuật',
        'Phân loại PT',
        'Ngày mổ thực tế',
        'Phẫu thuật viên',
        'Bác sĩ phụ 1',
        'Bác sĩ gây mê',
        'Ghi chú',
      ],
      rows: matchingPatients.map((p, idx) => [
        idx + 1,
        p.id,
        p.name,
        getAge(p.dob),
        p.gender,
        p.phoneNumber || '-',
        `${p.room || '-'}/${p.bed || '-'}`,
        p.diagnosis || '-',
        p.interventionType || '-',
        p.surgeryMethod || '-',
        p.surgeryClassification || '-',
        p.actualSurgeryDate || p.surgeryDate || '-',
        p.surgeon || '-',
        p.assistantSurgeon1 || '-',
        p.anesthetist || '-',
        p.notes || '-',
      ]),
      signers: ['NGƯỜI LẬP BẢNG SỐ LIỆU', 'CHỦ NHIỆM ĐỀ TÀI', 'TRƯỞNG KHOA NGOẠI'],
    });

    showToast(`Đã xuất file Excel ${matchingPatients.length} bệnh nhân thành công`, 'success');
  };

  // Export List of Research Topics to Excel
  const handleExportTopicsListExcel = () => {
    if (data.length === 0) {
      showToast('Không có dữ liệu đề tài để xuất', 'warning');
      return;
    }

    exportToExcel({
      fileName: `DanhSach_DeTai_NCKH_KhoaNgoai`,
      sheetName: 'Đề tài NCKH',
      title: 'DANH SÁCH ĐỀ TÀI NGHIÊN CỨU KHOA HỌC KHOA NGOẠI TỔNG HỢP',
      subtitle: `Tổng số đề tài: ${data.length} | Bệnh viện Nội tiết Nghệ An | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
      headers: [
        'STT',
        'Mã Đề Tài',
        'Tên Đề Tài Nghiên Cứu Khoa Học',
        'Chủ Nhiệm Đề Tài',
        'Ngày Bắt Đầu',
        'Hạn Nghiệm Thu',
        'Tiến Độ (%)',
        'Trạng Thái',
        'Ghi Chú',
      ],
      rows: data.map((item, idx) => {
        const progress = Number(item.progress || 0);
        const isOverdue = item.deadline && new Date(item.deadline) < new Date() && progress < 100;
        const statusText = progress >= 100 ? 'Đã hoàn thành' : isOverdue ? 'Quá hạn' : 'Đang thực hiện';

        return [
          idx + 1,
          item.id,
          item.topic,
          item.author,
          item.startDate ? formatDate(item.startDate) : '-',
          item.deadline ? formatDate(item.deadline) : '-',
          `${progress}%`,
          statusText,
          item.notes || '-',
        ];
      }),
      signers: ['BÁO CÁO VIÊN NCKH', 'CHỦ NHIỆM ĐỀ TÀI', 'TRƯỞNG KHOA NGOẠI'],
    });

    showToast('Đã xuất danh sách đề tài ra Excel thành công', 'success');
  };

  // Print Research Data
  const handlePrintResearchData = () => {
    window.print();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.topic) {
      showToast('Vui lòng nhập tên đề tài nghiên cứu', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (currentItem.id) {
        await updateResearchTopic(currentItem.id, currentItem);
        showToast('Cập nhật đề tài thành công', 'success');
      } else {
        await addResearchTopic(currentItem as any);
        showToast('Thêm mới đề tài nghiên cứu thành công', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (e) {
      showToast('Có lỗi xảy ra khi lưu đề tài', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !canDelete) return;
    setSubmitting(true);
    try {
      await deleteResearchTopic(deleteId);
      showToast('Đã xoá đề tài thành công', 'success');
      setIsDeleteModalOpen(false);
      loadData();
    } catch (e) {
      showToast('Lỗi khi xoá đề tài', 'error');
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

  const ProgressBar = ({ pct }: { pct: number }) => {
    let color = 'bg-red-500';
    if (pct >= 80) color = 'bg-emerald-500';
    else if (pct >= 50) color = 'bg-amber-500';

    return (
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}></div>
        </div>
        <span className="text-xs font-bold text-slate-700 w-9 text-right">{pct}%</span>
      </div>
    );
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  return (
    <div className="space-y-6">
      {/* TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              Đề tài Nghiên cứu Khoa học
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold border border-blue-200">
              {data.length} đề tài
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Quản lý tiến độ NCKH & Truy xuất số liệu mẫu lâm sàng tự động</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportTopicsListExcel}
            className="flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm font-semibold"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel Đề tài</span>
          </button>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Đăng ký Đề tài mới</span>
          </button>
        </div>
      </div>

      {/* TOPIC SEARCH & STATUS TABS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên đề tài, chủ nhiệm đề tài..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* STATUS FILTER TABS */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tất cả ({data.length})
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'IN_PROGRESS' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Đang thực hiện
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Hoàn thành
            </button>
            <button
              onClick={() => setStatusFilter('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'OVERDUE' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Quá hạn
            </button>
          </div>
        </div>

        {/* TOPICS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 w-5/12">Tên đề tài nghiên cứu</th>
                <th className="px-6 py-3.5">Chủ nhiệm đề tài</th>
                <th className="px-6 py-3.5 text-center">Số liệu mẫu</th>
                <th className="px-6 py-3.5 w-1/5">Tiến độ</th>
                <th className="px-6 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                    <p className="text-xs text-slate-400 mt-2 font-medium">Đang tải danh sách đề tài...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic">
                    Chưa có đề tài nghiên cứu nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const progress = Number(item.progress || 0);
                  const isOverdue = item.deadline && new Date(item.deadline) < new Date() && progress < 100;

                  return (
                    <tr key={item.id} className="bg-white hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 leading-snug" title={item.topic}>
                          {item.topic}
                        </div>
                        {item.notes && <div className="text-xs text-slate-500 mt-1 italic line-clamp-1">{item.notes}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold">
                            {item.author ? item.author.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="font-semibold text-slate-700">{item.author || 'Chưa cập nhật'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setViewDataTopic(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          <Database className="h-3.5 w-3.5" />
                          Truy xuất số liệu
                        </button>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <ProgressBar pct={progress} />
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                          <span>BĐ: {formatDate(item.startDate)}</span>
                          <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                            Hạn: {formatDate(item.deadline)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(item)}
                            title="Sửa đề tài"
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => {
                                setDeleteId(item.id);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Xoá đề tài"
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SMART CLINICAL DATA QUERY MODAL ── */}
      {viewDataTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden animate-scale-in border border-slate-200">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-900 text-white gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 text-xs font-bold border border-blue-400/30">
                    Truy xuất số liệu NCKH
                  </span>
                  {autoPresetBadge && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-400/30 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> {autoPresetBadge}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-base sm:text-lg mt-0.5 text-white truncate max-w-3xl">
                  {viewDataTopic.topic}
                </h3>
                <p className="text-xs text-slate-300">
                  Chủ nhiệm: <strong className="text-blue-300">{viewDataTopic.author}</strong> · Thời gian đề tài: {formatDate(viewDataTopic.startDate)} ➔ {formatDate(viewDataTopic.deadline)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportDataExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Xuất Excel (.xlsx)
                </button>

                <button
                  onClick={handlePrintResearchData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all"
                >
                  <Printer className="h-4 w-4" /> In Báo Cáo
                </button>

                <button
                  onClick={() => setViewDataTopic(null)}
                  className="p-1.5 hover:bg-white/20 rounded-full text-slate-300 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* LIVE ANALYTICS METRICS BAR FOR RESEARCH SAMPLE */}
            <div className="bg-blue-900/95 text-white px-6 py-3 border-b border-blue-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-300" />
                <div>
                  <span className="text-blue-200">Cỡ mẫu nghiên cứu:</span>
                  <strong className="ml-1 text-sm font-black text-white">N = {matchingPatients.length} BN</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-300" />
                <div>
                  <span className="text-blue-200">Nam / Nữ:</span>
                  <strong className="ml-1 font-extrabold text-white">
                    {sampleAnalytics.male} ({sampleAnalytics.malePct}%) / {sampleAnalytics.female} ({sampleAnalytics.femalePct}%)
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-300" />
                <div>
                  <span className="text-blue-200">Tuổi trung bình:</span>
                  <strong className="ml-1 font-extrabold text-white">{sampleAnalytics.avgAge} tuổi</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-300" />
                <div>
                  <span className="text-blue-200">Đã mổ (Hậu phẫu):</span>
                  <strong className="ml-1 font-extrabold text-white">{sampleAnalytics.postOpCount} BN</strong>
                </div>
              </div>
            </div>

            {/* SMART FILTERING PANEL */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  <Filter className="h-4 w-4 text-blue-600" /> Bộ lọc dữ liệu mẫu lâm sàng
                </div>
                <button
                  onClick={() =>
                    setFilters({
                      status: 'All',
                      interventionType: '',
                      activityType: '',
                      surgeryMethod: '',
                      surgeon: '',
                      fromDate: '',
                      toDate: '',
                      keywordSearch: '',
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-semibold"
                >
                  <RefreshCw className="h-3 w-3" /> Đặt lại bộ lọc
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {/* 1. Keyword Search Input */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tìm kiếm bệnh nhân</label>
                  <input
                    type="text"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Mã BN, Tên BN, Chẩn đoán..."
                    value={filters.keywordSearch}
                    onChange={e => setFilters({ ...filters, keywordSearch: e.target.value })}
                  />
                </div>

                {/* 2. Status */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Trạng thái</label>
                  <select
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="All">Tất cả</option>
                    <option value="DaMo">Đã mổ (Hậu phẫu)</option>
                    <option value="DaDuyet">Đã duyệt mổ</option>
                    <option value="DieuTri">Đang điều trị</option>
                    <option value="RaVien">Đã ra viện</option>
                  </select>
                </div>

                {/* 3. Intervention Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Loại can thiệp</label>
                  <select
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    value={filters.interventionType}
                    onChange={e => setFilters({ ...filters, interventionType: e.target.value })}
                  >
                    <option value="">-- Tất cả --</option>
                    {uniqueInterventions.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Activity Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Loại hoạt động</label>
                  <select
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    value={filters.activityType}
                    onChange={e => setFilters({ ...filters, activityType: e.target.value })}
                  >
                    <option value="">-- Tất cả --</option>
                    <option value="Phẫu thuật">Phẫu thuật</option>
                    <option value="Thủ thuật">Thủ thuật</option>
                  </select>
                </div>

                {/* 5. Surgeon */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Phẫu thuật viên</label>
                  <select
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    value={filters.surgeon}
                    onChange={e => setFilters({ ...filters, surgeon: e.target.value })}
                  >
                    <option value="">-- Tất cả --</option>
                    {uniqueSurgeons.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. From Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Từ ngày mổ</label>
                  <input
                    type="date"
                    className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
                    value={filters.fromDate}
                    onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
                  />
                </div>

                {/* 7. To Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Đến ngày mổ</label>
                  <input
                    type="date"
                    className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
                    value={filters.toDate}
                    onChange={e => setFilters({ ...filters, toDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* DATA TABLE RESULT */}
            <div className="flex-1 overflow-auto p-0">
              {matchingPatients.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white p-8 text-center">
                  <Database className="h-12 w-12 mb-3 text-slate-300 opacity-60" />
                  <p className="font-bold text-slate-700">Không có bệnh nhân phù hợp với điều kiện lọc đã chọn.</p>
                  <p className="text-xs text-slate-400 mt-1">Vui lòng điều chỉnh lại bộ lọc hoặc bấm "Đặt lại bộ lọc".</p>
                </div>
              ) : (
                <div className="min-w-full inline-block align-middle">
                  <div className="bg-white border-b border-slate-200">
                    <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center text-xs font-bold text-indigo-900 sticky top-0 z-20">
                      <span>Hiển thị mẫu nghiên cứu: {matchingPatients.length} bệnh nhân</span>
                      <span>Bệnh viện Nội tiết Nghệ An</span>
                    </div>
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-[37px] z-20 shadow-sm border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">STT</th>
                          <th className="px-4 py-3 w-24">Mã BN</th>
                          <th className="px-4 py-3">Họ Tên / Tuổi / Giới</th>
                          <th className="px-4 py-3">Chẩn đoán</th>
                          <th className="px-4 py-3">Loại can thiệp</th>
                          <th className="px-4 py-3">Phương pháp PT</th>
                          <th className="px-4 py-3">Ngày mổ</th>
                          <th className="px-4 py-3">Phẫu thuật viên</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {matchingPatients.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="px-4 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono text-blue-600 font-extrabold align-top">{p.id}</td>
                            <td className="px-4 py-3 align-top">
                              <div className="font-bold text-slate-800">{p.name}</div>
                              <div className="text-slate-500 text-[11px]">
                                {getAge(p.dob)} tuổi · {p.gender}
                              </div>
                            </td>
                            <td className="px-4 py-3 max-w-[220px] align-top text-slate-700 font-medium" title={p.diagnosis}>
                              {p.diagnosis || '-'}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold border border-slate-200">
                                {p.interventionType || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700 font-medium">{p.surgeryMethod || '-'}</td>
                            <td className="px-4 py-3 font-semibold align-top text-slate-700">
                              {p.actualSurgeryDate ? formatDate(p.actualSurgeryDate) : p.surgeryDate ? formatDate(p.surgeryDate) : '-'}
                            </td>
                            <td className="px-4 py-3 align-top font-medium text-slate-800">{p.surgeon || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem.id ? 'Cập nhật Đề tài NCKH' : 'Đăng ký Đề tài NCKH mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Tên đề tài nghiên cứu <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[90px]"
              value={currentItem.topic || ''}
              onChange={e => setCurrentItem({ ...currentItem, topic: e.target.value })}
              placeholder="VD: Nghiên cứu ứng dụng PTNS tuyến giáp qua đường miệng (TOETVA) tại Khoa Ngoại..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Chủ nhiệm đề tài</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={currentItem.author || ''}
                onChange={e => setCurrentItem({ ...currentItem, author: e.target.value })}
                placeholder="Họ tên Bác sĩ / Chủ nhiệm đề tài..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Ngày bắt đầu</label>
              <input
                type="date"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={currentItem.startDate || ''}
                onChange={e => setCurrentItem({ ...currentItem, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Hạn nghiệm thu</label>
              <input
                type="date"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={currentItem.deadline || ''}
                onChange={e => setCurrentItem({ ...currentItem, deadline: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tiến độ thực hiện (%)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                value={currentItem.progress || 0}
                onChange={e => setCurrentItem({ ...currentItem, progress: parseInt(e.target.value) })}
              />
              <span className="font-extrabold text-blue-600 w-12 text-right">{currentItem.progress || 0}%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú & Khó khăn đề xuất</label>
            <input
              type="text"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={currentItem.notes || ''}
              onChange={e => setCurrentItem({ ...currentItem, notes: e.target.value })}
              placeholder="Giai đoạn nghiên cứu, ghi chú thêm..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 font-semibold text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2 font-semibold text-sm shadow-sm"
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
        title="Xác nhận xoá đề tài"
      >
        <div className="text-center">
          <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xoá đề tài nghiên cứu này khỏi hệ thống?</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 font-semibold text-sm"
            >
              Hủy
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="px-4 py-2 text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:bg-red-300 font-semibold text-sm shadow-sm"
            >
              Xoá vĩnh viễn
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
