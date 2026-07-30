import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Search, Clock, ClipboardList, PenTool, Loader2, Users2, Activity, Syringe, Printer, CalendarDays, Eye, FileSpreadsheet, ArrowUp, ArrowDown, Hash } from 'lucide-react';
import { Patient, Role, APP_LOGO_URL } from '../types';
import { getPatients, updatePatient, updateSurgeryStatus, getPersonnelLists } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { getAge, exportToExcel } from '../utils/exportUtils';

interface Props {
  userRole: Role;
}

type Tab = 'pending' | 'approved';

export const SurgeryApproval: React.FC<Props> = ({ userRole }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<string[]>([]);
  const [nurses, setNurses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  
  // Print Schedule State
  const [scheduleDate, setScheduleDate] = useState<string>('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [approvalData, setApprovalData] = useState<Partial<Patient>>({});
  const [submitting, setSubmitting] = useState(false);

  const canApprove = true; // Cho phép tất cả bác sĩ/nhân viên y tế xem, duyệt và cập nhật lịch mổ

  useEffect(() => {
    loadData();
  }, []);

  const safePatients = Array.isArray(patients) ? patients : [];
  const safeDoctors = Array.isArray(doctors) ? doctors : [];
  const safeNurses = Array.isArray(nurses) ? nurses : [];

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPatients, personnel] = await Promise.all([
          getPatients().catch(() => []),
          getPersonnelLists().catch(() => ({ doctors: [], nurses: [] }))
      ]);
      setPatients(Array.isArray(allPatients) ? allPatients : []);
      setDoctors(Array.isArray(personnel?.doctors) ? personnel.doctors : []);
      setNurses(Array.isArray(personnel?.nurses) ? personnel.nurses : []);
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
      setPatients([]);
      setDoctors([]);
      setNurses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (p: Patient) => {
    setSelectedPatient(p);
    const targetDate = p.surgeryDate || scheduleDate || new Date().toISOString().split('T')[0];
    
    // Find next order number if not set yet
    let defaultOrder = p.surgeryOrder;
    if (!defaultOrder) {
      const sameDatePatients = patients.filter(item => item.status === 'DaDuyet' && item.surgeryDate === targetDate);
      const maxOrder = Math.max(0, ...sameDatePatients.map(item => item.surgeryOrder || 0));
      defaultOrder = maxOrder + 1;
    }

    setApprovalData({
        surgeryDate: targetDate,
        surgeryOrder: defaultOrder,
        surgeryMethod: p.surgeryMethod || '',
        surgeon: p.surgeon || '',
        assistantSurgeon1: p.assistantSurgeon1 || '',
        assistantSurgeon2: p.assistantSurgeon2 || '',
        assistantSurgeon3: p.assistantSurgeon3 || '',
        anesthetist: p.anesthetist || '',
        anesthetistAssistant: p.anesthetistAssistant || '',
        scrubNurse: p.scrubNurse || '',
        approvalNote: p.approvalNote || ''
    });
    setIsModalOpen(true);
  };

  const handleSetSurgeryOrder = async (targetPatient: Patient, targetOrder: number) => {
    const dailyApproved = safePatients
      .filter(p => p.status === 'DaDuyet' && p.surgeryDate === scheduleDate)
      .sort((a, b) => (a.surgeryOrder || 999) - (b.surgeryOrder || 999));

    const oldIndex = dailyApproved.findIndex(p => p.id === targetPatient.id);
    if (oldIndex === -1) return;

    const newIndex = Math.max(0, Math.min(targetOrder - 1, dailyApproved.length - 1));
    if (oldIndex === newIndex) return;

    // Re-arrange array locally
    const listCopy = [...dailyApproved];
    const [movedItem] = listCopy.splice(oldIndex, 1);
    listCopy.splice(newIndex, 0, movedItem);

    // Re-assign explicit 1, 2, 3...
    const changedPatients: { id: string; newOrder: number }[] = [];
    const updatedPatientsMap = new Map<string, number>();

    listCopy.forEach((item, idx) => {
      const freshOrder = idx + 1;
      updatedPatientsMap.set(item.id, freshOrder);
      if (item.surgeryOrder !== freshOrder) {
        changedPatients.push({ id: item.id, newOrder: freshOrder });
      }
    });

    // 1. INSTANT 0ms Optimistic State Update in React
    setPatients(prev =>
      prev.map(p => {
        if (updatedPatientsMap.has(p.id)) {
          return { ...p, surgeryOrder: updatedPatientsMap.get(p.id) };
        }
        return p;
      })
    );

    showToast(`Đã xếp ${targetPatient.name} thành Ca ${newIndex + 1}`, 'success');

    // 2. Non-blocking Parallel Backend Sync
    try {
      await Promise.all(
        changedPatients.map(cp => updatePatient(cp.id, { surgeryOrder: cp.newOrder }))
      );
    } catch (e: any) {
      console.error('Lỗi lưu thứ tự mổ:', e);
    }
  };

  const validateForm = () => {
      if (!approvalData.surgeryDate) return "Vui lòng chọn Ngày mổ dự kiến";
      if (!approvalData.surgeryMethod || approvalData.surgeryMethod.trim().length === 0) return "Vui lòng nhập Phương pháp phẫu thuật";
      if (!approvalData.surgeon) return "Vui lòng chọn Bác sĩ mổ chính";
      if (!approvalData.anesthetist) return "Vui lòng chọn Bác sĩ gây mê";
      if (!approvalData.scrubNurse) return "Vui lòng chọn Điều dưỡng dụng cụ";
      return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    
    // Security check on Frontend as well
    if (!canApprove) {
        showToast("Bạn không có quyền duyệt mổ", "error");
        return;
    }

    const error = validateForm();
    if (error) {
        showToast(error, 'error');
        return;
    }

    setSubmitting(true);
    try {
        await updateSurgeryStatus(selectedPatient.id, {
            ...approvalData,
            status: 'DaDuyet',
            approvalDate: new Date().toISOString()
        });
        showToast(`Đã duyệt mổ cho BN ${selectedPatient.name}`, 'success');
        setIsModalOpen(false);
        loadData();
    } catch (e: any) {
        showToast('Lỗi khi duyệt mổ: ' + (e?.message || 'Không xác định'), 'error');
    } finally {
        setSubmitting(false);
    }
  };

  const handleExportDailyScheduleExcel = () => {
      const effectiveDate = scheduleDate || new Date().toISOString().split('T')[0];
      const dailyList = patients
          .filter(p => p.status === 'DaDuyet' && p.surgeryDate === effectiveDate)
          .sort((a, b) => (a.surgeryOrder || 999) - (b.surgeryOrder || 999));

      if (dailyList.length === 0) {
          showToast(`Không có ca mổ nào được duyệt cho ngày ${new Date(effectiveDate).toLocaleDateString('vi-VN')}`, 'info');
          return;
      }

      const headers = [
          'Ca mổ',
          'Họ tên BN / Tuổi / GT',
          'Mã BN',
          'Chẩn đoán',
          'Phương pháp phẫu thuật',
          'PTV Chính',
          'Phụ mổ',
          'Gây mê / Phụ mê',
          'Ghi chú'
      ];

      const rows = dailyList.map((p, idx) => {
          const ageVal = getAge(p.dob);
          const nameAgeStr = `${p.name || ''} (${ageVal ? `${ageVal}T` : ''} - ${p.gender || ''})`;
          const assistants = [p.assistantSurgeon1, p.assistantSurgeon2, p.assistantSurgeon3].filter(Boolean).join(', ');
          const gmeStr = [p.anesthetist, p.anesthetistAssistant ? `Phụ: ${p.anesthetistAssistant}` : ''].filter(Boolean).join(' - ');
          const caMoText = p.surgeryOrder ? `Ca ${p.surgeryOrder}` : `Ca ${idx + 1}`;

          return [
              caMoText,
              nameAgeStr,
              p.id || '',
              p.diagnosis || '',
              p.surgeryMethod || '',
              p.surgeon || '',
              assistants || '',
              gmeStr || '',
              p.approvalNote || ''
          ];
      });

      exportToExcel({
          fileName: `Lich_Phau_Thuat_${effectiveDate}.xlsx`,
          sheetName: 'Lịch Phẫu Thuật',
          title: 'DANH SÁCH PHẪU THUẬT TRONG NGÀY',
          subtitle: `Ngày ${new Date(effectiveDate).toLocaleDateString('vi-VN')} (Tổng số: ${dailyList.length} ca mổ)`,
          headers,
          rows,
          signers: ['PHỤ TRÁCH PHÒNG MỔ', 'LÃNH ĐẠO KHOA']
      });

      showToast('Đã xuất file Excel lịch mổ thành công', 'success');
  };

  const handlePrintDailySchedule = () => {
      // 1. Filter & Sort Data by Surgery Order
      const effectiveDate = scheduleDate || new Date().toISOString().split('T')[0];
      const dailyList = patients
          .filter(p => p.status === 'DaDuyet' && p.surgeryDate === effectiveDate)
          .sort((a, b) => (a.surgeryOrder || 999) - (b.surgeryOrder || 999));

      if (dailyList.length === 0) {
          showToast(`Không có ca mổ nào được duyệt cho ngày ${new Date(effectiveDate).toLocaleDateString('vi-VN')}`, 'info');
          return;
      }

      // 2. Open Print Window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          showToast('Vui lòng cho phép popup để in lịch', 'error');
          return;
      }

      // 3. Generate HTML
      const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Lịch Phẫu Thuật - Ngày ${effectiveDate}</title>
            <style>
                @page { size: A4 landscape; margin: 6mm 8mm; }
                * { box-sizing: border-box; }
                body { font-family: 'Times New Roman', serif; margin: 0; padding: 10px; color: #000; background: #fff; font-size: 10.5pt; width: 100%; }
                h1, h2, h3, h4, p { margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
                th, td { border: 1px solid #000; padding: 5px 6px; font-size: 10pt; vertical-align: middle; word-wrap: break-word; overflow-wrap: break-word; }
                th { background-color: #f2f2f2 !important; text-align: center; font-weight: bold; padding: 7px 5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
                .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
                .hospital { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
                .dept { font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #222; }
                .title { font-size: 15pt; font-weight: bold; text-transform: uppercase; text-align: center; margin-top: 8px; }
                .date { font-style: italic; font-size: 10pt; text-align: center; margin-bottom: 8px; }
                .text-center { text-align: center; }
                .footer { margin-top: 25px; display: flex; justify-content: space-around; page-break-inside: avoid; }
                .sign-box { text-align: center; width: 220px; }
                .sign-title { font-weight: bold; margin-bottom: 50px; font-size: 10.5pt; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${APP_LOGO_URL}" alt="" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" />
                    <div>
                        <div class="hospital">BỆNH VIỆN NỘI TIẾT NGHỆ AN</div>
                        <div class="dept">KHOA NGOẠI TỔNG HỢP</div>
                    </div>
                </div>
                <div style="text-align: right; font-size: 9.5pt; font-style: italic;">
                    Hệ thống Quản lý Phẫu thuật
                </div>
            </div>

            <div style="text-align: center; margin-bottom: 12px;">
                <div class="title">DANH SÁCH PHẪU THUẬT TRONG NGÀY</div>
                <div class="date">Ngày ${new Date(effectiveDate).toLocaleDateString('vi-VN')} (Tổng số: ${dailyList.length} ca mổ)</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 6%;">Ca mổ</th>
                        <th style="width: 18%;">Họ tên BN / Tuổi</th>
                        <th style="width: 8%;">Mã BN</th>
                        <th style="width: 22%;">Chẩn đoán</th>
                        <th style="width: 18%;">Phương pháp PT</th>
                        <th style="width: 11%;">PTV Chính</th>
                        <th style="width: 9%;">Phụ mổ</th>
                        <th style="width: 8%;">Gây mê</th>
                    </tr>
                </thead>
                <tbody>
                    ${dailyList.map((p, idx) => {
                        const ageVal = getAge(p.dob);
                        const assistants = [p.assistantSurgeon1, p.assistantSurgeon2, p.assistantSurgeon3].filter(Boolean).join(', ');
                        const caText = p.surgeryOrder ? `Ca ${p.surgeryOrder}` : `Ca ${idx + 1}`;
                        
                        return `
                        <tr>
                            <td class="text-center font-bold" style="background-color: #fafafa;">${caText}</td>
                            <td>
                                <b>${p.name}</b>
                                <div>${ageVal ? `${ageVal}T` : ''} - ${p.gender}</div>
                            </td>
                            <td class="text-center"><b>${p.id}</b></td>
                            <td>${p.diagnosis || '-'}</td>
                            <td>${p.surgeryMethod || '-'}</td>
                            <td>${p.surgeon || '-'}</td>
                            <td>${assistants || '-'}</td>
                            <td>
                                <div>${p.anesthetist || '-'}</div>
                                <div style="font-size: 8.5pt; font-style: italic;">${p.anesthetistAssistant ? `Phụ: ${p.anesthetistAssistant}` : ''}</div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div class="footer">
                <div class="sign-box">
                    <div class="sign-title">PHỤ TRÁCH PHÒNG MỔ</div>
                </div>
                <div class="sign-box">
                    <div style="font-style: italic; margin-bottom: 5px;">Ngày ..... tháng ..... năm .....</div>
                    <div class="sign-title">LÃNH ĐẠO KHOA</div>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
  };

  const filtered = useMemo(() => {
    const searchLower = (search || '').trim().toLowerCase();
    return safePatients
        .filter(p => {
            if (!p) return false;
            return activeTab === 'pending' ? p.status === 'ChoMo' : p.status === 'DaDuyet';
        })
        .filter(p => {
            // Pending tab: show all pending patients regardless of date
            if (activeTab === 'pending') return true;
            // Approved tab: if no date filter set, show ALL approved patients
            if (!scheduleDate) return true;
            // If date filter is set, match surgeryDate
            return p.surgeryDate === scheduleDate;
        })
        .filter(p => {
            if (!searchLower) return true;
            const pName = String(p.name || '').toLowerCase();
            const pId = String(p.id || '').toLowerCase();
            const pDiag = String(p.diagnosis || '').toLowerCase();
            return pName.includes(searchLower) || pId.includes(searchLower) || pDiag.includes(searchLower);
        })
        .sort((a, b) => {
            if (activeTab === 'pending') {
                const dateA = a.admissionDate ? new Date(a.admissionDate).getTime() : 0;
                const dateB = b.admissionDate ? new Date(b.admissionDate).getTime() : 0;
                return dateA - dateB;
            }
            // Sort by surgery date first (nearest first), then by order
            const dateA = a.surgeryDate || '9999';
            const dateB = b.surgeryDate || '9999';
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            const orderA = typeof a.surgeryOrder === 'number' ? a.surgeryOrder : 999;
            const orderB = typeof b.surgeryOrder === 'number' ? b.surgeryOrder : 999;
            if (orderA !== orderB) return orderA - orderB;
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
  }, [safePatients, activeTab, scheduleDate, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-blue-600"/> Duyệt Lịch Mổ
            </h2>
            <p className="text-sm text-slate-500 mt-1">Lập kế hoạch và phân công ê-kíp phẫu thuật</p>
          </div>
      </div>
      
      <div className="border-b border-slate-200">
          <div className="flex gap-8">
            <button onClick={()=>setActiveTab('pending')} className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab==='pending'?'border-blue-600 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <Clock className="h-4 w-4" />
                Chờ duyệt ({patients.filter(p => p.status === 'ChoMo').length})
            </button>
            <button onClick={()=>setActiveTab('approved')} className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab==='approved'?'border-blue-600 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <ClipboardList className="h-4 w-4" />
                Đã duyệt ({patients.filter(p => p.status === 'DaDuyet').length})
            </button>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm bệnh nhân..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>

              {activeTab === 'approved' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      <button
                        onClick={() => setScheduleDate('')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${!scheduleDate ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                      >
                        Tất cả
                      </button>
                      <button
                        onClick={() => setScheduleDate(new Date().toISOString().split('T')[0])}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${scheduleDate === new Date().toISOString().split('T')[0] ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                      >
                        Hôm nay
                      </button>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input 
                            type="date" 
                            className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={scheduleDate}
                            onChange={e => setScheduleDate(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                          <button 
                            onClick={handleExportDailyScheduleExcel}
                            className="flex items-center gap-2 bg-emerald-600 border border-emerald-700 text-white hover:bg-emerald-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                          >
                              <FileSpreadsheet className="h-4 w-4" />
                              <span className="hidden sm:inline">Xuất Excel</span>
                          </button>
                          <button 
                            onClick={handlePrintDailySchedule}
                            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                          >
                              <Printer className="h-4 w-4" />
                              <span className="hidden sm:inline">In Lịch Ngày</span>
                          </button>
                      </div>
                  </div>
              )}
          </div>
          
          {activeTab === 'approved' && filtered.length > 0 && (
              <div className="bg-blue-50/80 border-b border-blue-100 px-4 py-2.5 flex items-center justify-between text-xs text-blue-800">
                  <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">Mẹo</span>
                      <span>Bấm vào ô chọn <b>"Ca 1", "Ca 2"...</b> để chọn vị trí mổ tức thì 1-Click hoặc dùng nút mũi tên <b>▲ / ▼</b>.</span>
                  </div>
                  <span className="font-semibold text-blue-700 hidden md:inline">Tổng: {filtered.length} ca</span>
              </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                        {activeTab === 'approved' && <th className="px-4 py-3 text-center w-36">STT Ca mổ</th>}
                        <th className="px-6 py-3">Bệnh nhân</th>
                        <th className="px-6 py-3">Chẩn đoán</th>
                        <th className="px-6 py-3">{activeTab==='pending' ? 'Ngày nhập' : 'Ngày mổ DK'}</th>
                        {activeTab === 'approved' && <th className="px-6 py-3">Phương pháp</th>}
                        {activeTab === 'approved' && <th className="px-6 py-3">Ê-kíp chính</th>}
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? <tr><td colSpan={7} className="px-6 py-12 text-center"><Loader2 className="animate-spin h-5 w-5 mx-auto text-blue-500"/></td></tr> :
                    filtered.length === 0 ? <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">{activeTab==='pending' ? "Không có bệnh nhân chờ mổ" : "Chưa có lịch mổ đã duyệt cho ngày này"}</td></tr> :
                    filtered.map((p, idx) => (
                        <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                            {activeTab === 'approved' && (
                                <td className="px-3 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <select
                                            value={p.surgeryOrder || idx + 1}
                                            onChange={e => handleSetSurgeryOrder(p, parseInt(e.target.value, 10))}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2 py-1.5 rounded-md shadow-xs cursor-pointer outline-none transition-colors border border-blue-700"
                                            title="Bấm để chọn nhanh thứ tự ca mổ"
                                        >
                                            {filtered.map((_, orderIdx) => (
                                                <option key={orderIdx + 1} value={orderIdx + 1} className="bg-white text-slate-800 font-medium">
                                                    Ca {orderIdx + 1}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="flex flex-col gap-0.5">
                                            <button 
                                                onClick={() => handleSetSurgeryOrder(p, (p.surgeryOrder || idx + 1) - 1)}
                                                disabled={idx === 0}
                                                className="p-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded text-slate-600 disabled:opacity-20 disabled:hover:bg-slate-100 transition-colors"
                                                title="Đẩy ca mổ này lên trước"
                                            >
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleSetSurgeryOrder(p, (p.surgeryOrder || idx + 1) + 1)}
                                                disabled={idx === filtered.length - 1}
                                                className="p-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded text-slate-600 disabled:opacity-20 disabled:hover:bg-slate-100 transition-colors"
                                                title="Đẩy ca mổ này xuống sau"
                                            >
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            )}
                            <td className="px-6 py-4">
                                <div className="font-medium text-slate-800">{p.name}</div>
                                <div className="text-xs text-slate-500 font-mono">{p.id} - {p.gender}</div>
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate" title={p.diagnosis}>{p.diagnosis}</td>
                            <td className="px-6 py-4">
                                {activeTab==='pending' ? p.admissionDate : <span className="font-semibold text-blue-700">{p.surgeryDate}</span>}
                            </td>
                            {activeTab === 'approved' && <td className="px-6 py-4 max-w-xs truncate">{p.surgeryMethod}</td>}
                            {activeTab === 'approved' && (
                                <td className="px-6 py-4 text-xs">
                                    <div className="flex flex-col gap-1">
                                        <span title="Phẫu thuật viên">🔪 {p.surgeon}</span>
                                        <span title="Gây mê">💉 {p.anesthetist}</span>
                                    </div>
                                </td>
                            )}
                            <td className="px-6 py-4 text-right">
                                {activeTab === 'pending' && (
                                    canApprove ? (
                                        <button onClick={()=>handleApproveClick(p)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center gap-1">
                                            <PenTool className="h-3 w-3" /> Duyệt
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic bg-slate-100 px-2 py-1 rounded">Chờ duyệt</span>
                                    )
                                )}
                                {activeTab === 'approved' && (
                                    <button onClick={()=>handleApproveClick(p)} className="text-slate-500 hover:text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1">
                                        {canApprove ? <ClipboardList className="h-3 w-3" /> : <Eye className="h-3 w-3" />} 
                                        {canApprove ? 'Chi tiết' : 'Xem'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} title={activeTab === 'pending' ? "Duyệt Phẫu Thuật & Phân Công" : "Chi tiết Lịch Mổ"}>
          <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
              {selectedPatient && (
                  <div className="bg-blue-50 p-4 rounded-lg text-sm border border-blue-100 flex justify-between items-start">
                      <div>
                          <div className="font-bold text-blue-800 text-lg mb-1">{selectedPatient.name}</div>
                          <div className="text-blue-700">Mã BN: {selectedPatient.id}</div>
                      </div>
                      <div className="text-right text-blue-600 max-w-[200px] text-xs">
                          {selectedPatient.diagnosis}
                      </div>
                  </div>
              )}

              {/* SURGICAL TEAM */}
              <div className="space-y-4 border-b border-slate-200 pb-6">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase">
                      <Users2 className="h-4 w-4" /> Ê-kíp Phẫu thuật
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Surgeon Group */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Bác sĩ Mổ chính <span className="text-red-500">*</span></label>
                          <select disabled={!canApprove} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.surgeon} onChange={e=>setApprovalData(p => ({...p, surgeon: e.target.value}))}>
                              <option value="">-- Chọn BS --</option>
                              {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Phụ mổ 1</label>
                          <select disabled={!canApprove} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.assistantSurgeon1} onChange={e=>setApprovalData(p => ({...p, assistantSurgeon1: e.target.value}))}>
                              <option value="">-- Chọn BS --</option>
                              {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Phụ mổ 2</label>
                          <select disabled={!canApprove} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.assistantSurgeon2} onChange={e=>setApprovalData(p => ({...p, assistantSurgeon2: e.target.value}))}>
                              <option value="">-- Chọn BS --</option>
                              {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Phụ mổ 3 (nếu có)</label>
                          <select disabled={!canApprove} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.assistantSurgeon3} onChange={e=>setApprovalData(p => ({...p, assistantSurgeon3: e.target.value}))}>
                              <option value="">-- Chọn BS --</option>
                              {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                  </div>

                  {/* Anesthesia Group */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Bác sĩ Gây mê <span className="text-red-500">*</span></label>
                          <select disabled={!canApprove} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.anesthetist} onChange={e=>setApprovalData(p => ({...p, anesthetist: e.target.value}))}>
                              <option value="">-- Chọn BS --</option>
                              {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Phụ mê</label>
                          <select disabled={!canApprove} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.anesthetistAssistant} onChange={e=>setApprovalData(p => ({...p, anesthetistAssistant: e.target.value}))}>
                              <option value="">-- Chọn Điều dưỡng --</option>
                              {nurses.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                      </div>
                  </div>

                  {/* Scrub Nurse */}
                  <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Điều dưỡng dụng cụ <span className="text-red-500">*</span></label>
                      <select disabled={!canApprove} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.scrubNurse} onChange={e=>setApprovalData(p => ({...p, scrubNurse: e.target.value}))}>
                          <option value="">-- Chọn Điều dưỡng --</option>
                          {nurses.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                  </div>
              </div>

              {/* SURGERY INFO */}
              <div className="space-y-4">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase">
                      <Activity className="h-4 w-4" /> Thông tin Ca mổ
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Ngày mổ dự kiến <span className="text-red-500">*</span></label>
                          <input disabled={!canApprove} type="date" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.surgeryDate} onChange={e=>setApprovalData(p => ({...p, surgeryDate: e.target.value}))} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Hash className="h-3.5 w-3.5 text-blue-600" /> Thứ tự ca</label>
                          <input disabled={!canApprove} type="number" min="1" max="99" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600 font-bold text-blue-700" value={approvalData.surgeryOrder || 1} onChange={e=>setApprovalData(p => ({...p, surgeryOrder: parseInt(e.target.value) || 1}))} />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Phương pháp phẫu thuật (Dự kiến) <span className="text-red-500">*</span></label>
                          <input disabled={!canApprove} type="text" required placeholder="VD: PTNS cắt ruột thừa, Mổ mở..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.surgeryMethod} onChange={e=>setApprovalData(p => ({...p, surgeryMethod: e.target.value}))} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú duyệt mổ</label>
                          <textarea disabled={!canApprove} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600" placeholder="Lưu ý đặc biệt cho kíp mổ..." value={approvalData.approvalNote} onChange={e=>setApprovalData(p => ({...p, approvalNote: e.target.value}))} />
                      </div>
                  </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                  <button type="button" onClick={()=>setIsModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                      {canApprove ? 'Hủy' : 'Đóng'}
                  </button>
                  {canApprove && (
                      <button type="submit" disabled={submitting} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2">
                          {submitting && <Loader2 className="h-4 w-4 animate-spin"/>} 
                          {activeTab === 'pending' ? 'Xác nhận Duyệt' : 'Cập nhật Lịch'}
                      </button>
                  )}
              </div>
          </form>
      </Modal>
    </div>
  );
};
