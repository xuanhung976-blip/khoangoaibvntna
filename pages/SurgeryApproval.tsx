
import React, { useState, useEffect } from 'react';
import { CheckCircle, Search, Clock, ClipboardList, PenTool, Loader2, Users2, Activity, Syringe, Printer, CalendarDays, Eye } from 'lucide-react';
import { Patient, Role, APP_LOGO_URL } from '../types';
import { getPatients, updateSurgeryStatus, getPersonnelLists } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

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
  const [scheduleDate, setScheduleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [approvalData, setApprovalData] = useState<Partial<Patient>>({});
  const [submitting, setSubmitting] = useState(false);

  const canApprove = [Role.CHIEF, Role.HEAD_NURSE].includes(userRole);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPatients, personnel] = await Promise.all([
          getPatients(),
          getPersonnelLists()
      ]);
      setPatients(allPatients);
      setDoctors(personnel.doctors);
      setNurses(personnel.nurses);
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (p: Patient) => {
    setSelectedPatient(p);
    setApprovalData({
        surgeryDate: p.surgeryDate || new Date().toISOString().split('T')[0],
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
    } catch (e) {
        showToast('Lỗi khi duyệt mổ', 'error');
    } finally {
        setSubmitting(false);
    }
  };

  const handlePrintDailySchedule = () => {
      // 1. Filter Data
      const dailyList = patients.filter(p => 
          p.status === 'DaDuyet' && 
          p.surgeryDate === scheduleDate
      );

      if (dailyList.length === 0) {
          showToast(`Không có ca mổ nào được duyệt cho ngày ${new Date(scheduleDate).toLocaleDateString('vi-VN')}`, 'info');
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
            <title>Lịch Mổ Ngày ${scheduleDate}</title>
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { font-family: 'Times New Roman', serif; padding: 20px; color: #000; }
                table { width: 100%; border-collapse: collapse; font-size: 11pt; }
                th, td { border: 1px solid #000; padding: 5px; vertical-align: top; }
                th { background-color: #f0f0f0; text-align: center; font-weight: bold; padding: 8px 5px; }
                .header-container { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 25px; }
                .hospital { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                .dept { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; }
                .title { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                .date { font-style: italic; font-size: 12pt; text-align: center; }
                .text-center { text-align: center; }
                .footer { margin-top: 40px; display: flex; justify-content: space-around; page-break-inside: avoid; }
                .sign-box { text-align: center; width: 200px; }
                .sign-title { font-weight: bold; margin-bottom: 60px; }
            </style>
        </head>
        <body>
            <div class="header-container" style="justify-content: flex-start; border-bottom: 1px solid #ccc; padding-bottom: 15px;">
                <img src="${APP_LOGO_URL}" alt="" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; background: white;" />
                <div>
                    <div class="hospital">BỆNH VIỆN NỘI TIẾT NGHỆ AN</div>
                    <div class="dept">KHOA NGOẠI TỔNG HỢP</div>
                </div>
            </div>

            <div style="text-align: center; margin-bottom: 20px;">
                <div class="title">DANH SÁCH PHẪU THUẬT TRONG NGÀY</div>
                <div class="date">Ngày ${new Date(scheduleDate).toLocaleDateString('vi-VN')}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">STT</th>
                        <th style="width: 180px;">Họ tên BN / Tuổi</th>
                        <th style="width: 90px;">Mã BN</th>
                        <th>Chẩn đoán</th>
                        <th>Phương pháp PT</th>
                        <th style="width: 120px;">PTV Chính</th>
                        <th style="width: 120px;">Phụ mổ</th>
                        <th style="width: 120px;">Gây mê</th>
                        <th style="width: 120px;">Dụng cụ</th>
                    </tr>
                </thead>
                <tbody>
                    ${dailyList.map((p, idx) => {
                        const birthYear = p.dob ? new Date(p.dob).getFullYear() : '';
                        const age = birthYear ? new Date().getFullYear() - birthYear : '';
                        const assistants = [p.assistantSurgeon1, p.assistantSurgeon2, p.assistantSurgeon3].filter(Boolean).join(', ');
                        
                        return `
                        <tr>
                            <td class="text-center">${idx + 1}</td>
                            <td>
                                <b>${p.name}</b>
                                <div>${age ? `${age}T` : ''} - ${p.gender}</div>
                            </td>
                            <td class="text-center font-mono">${p.id}</td>
                            <td>${p.diagnosis}</td>
                            <td>${p.surgeryMethod}</td>
                            <td>${p.surgeon || '-'}</td>
                            <td>${assistants || '-'}</td>
                            <td>
                                <div>${p.anesthetist || '-'}</div>
                                <div style="font-size: 9pt; font-style: italic;">${p.anesthetistAssistant || ''}</div>
                            </td>
                            <td>${p.scrubNurse || '-'}</td>
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
                window.onload = () => { window.print(); }
            </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
  };

  const filtered = patients
      .filter(p => activeTab === 'pending' ? p.status === 'ChoMo' : p.status === 'DaDuyet')
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
          if (activeTab === 'pending') {
              return new Date(a.admissionDate).getTime() - new Date(b.admissionDate).getTime();
          }
          return new Date(b.surgeryDate || '').getTime() - new Date(a.surgeryDate || '').getTime();
      });

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
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input 
                            type="date" 
                            className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={scheduleDate}
                            onChange={e => setScheduleDate(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={handlePrintDailySchedule}
                        className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                          <Printer className="h-4 w-4" />
                          <span className="hidden sm:inline">In Lịch Ngày</span>
                      </button>
                  </div>
              )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                        <th className="px-6 py-3">Bệnh nhân</th>
                        <th className="px-6 py-3">Chẩn đoán</th>
                        <th className="px-6 py-3">{activeTab==='pending' ? 'Ngày nhập' : 'Ngày mổ DK'}</th>
                        {activeTab === 'approved' && <th className="px-6 py-3">Phương pháp</th>}
                        {activeTab === 'approved' && <th className="px-6 py-3">Ê-kíp chính</th>}
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="animate-spin h-5 w-5 mx-auto text-blue-500"/></td></tr> :
                    filtered.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">{activeTab==='pending' ? "Không có bệnh nhân chờ mổ" : "Chưa có lịch mổ đã duyệt"}</td></tr> :
                    filtered.map(p => (
                        <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
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
                  <div className="grid grid-cols-1 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Ngày mổ dự kiến <span className="text-red-500">*</span></label>
                          <input disabled={!canApprove} type="date" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-600" value={approvalData.surgeryDate} onChange={e=>setApprovalData(p => ({...p, surgeryDate: e.target.value}))} />
                      </div>
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
