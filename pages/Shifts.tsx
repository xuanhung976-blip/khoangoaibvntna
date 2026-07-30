import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, Save, User, ArrowLeft, ArrowRight, Loader2, Plus, Trash2, Wand2 } from 'lucide-react';
import { DailyOnCall, Role } from '../types';
import { getDailyOnCall, saveDailyOnCall, deleteDailyOnCall, batchSaveDailyOnCall, getPersonnelLists } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface Props {
  userRole: Role;
}

export const Shifts: React.FC<Props> = ({ userRole }) => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [shifts, setShifts] = useState<DailyOnCall[]>([]);
  const [doctors, setDoctors] = useState<string[]>([]);
  const [nurses, setNurses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Daily Mode State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentShift, setCurrentShift] = useState<Partial<DailyOnCall>>({});

  // Weekly Mode State
  const [weekStartDate, setWeekStartDate] = useState(getMonday(new Date()).toISOString().split('T')[0]);
  const [weeklyShifts, setWeeklyShifts] = useState<Partial<DailyOnCall>[]>([]);

  function getMonday(d: Date) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, pData] = await Promise.all([
          getDailyOnCall(),
          getPersonnelLists()
      ]);
      setShifts(sData);
      setDoctors(pData.doctors);
      setNurses(pData.nurses);
    } catch (e) {
      showToast('Lỗi tải dữ liệu trực', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getShiftForDate = useCallback((date: string) =>
    shifts.find(s => s.date === date) || { date, doctor: '', nurse1: '', nurse2: '' }
  , [shifts]);

  useEffect(() => {
    if (viewMode === 'daily') {
        setCurrentShift(getShiftForDate(selectedDate));
    } else {
        generateWeeklyTemplate(weekStartDate);
    }
  }, [selectedDate, weekStartDate, viewMode, shifts]);

  const generateWeeklyTemplate = (startStr: string) => {
      const start = new Date(startStr);
      const temp: Partial<DailyOnCall>[] = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const dStr = d.toISOString().split('T')[0];
          const existing = shifts.find(s => s.date === dStr);
          temp.push(existing ? { ...existing } : { date: dStr, doctor: '', nurse1: '', nurse2: '' });
      }
      setWeeklyShifts(temp);
  };

  const handleSaveDaily = async () => {
      if (!currentShift.date || !currentShift.doctor) {
          showToast('Vui lòng chọn ngày và bác sĩ trực', 'error');
          return;
      }
      setSubmitting(true);
      try {
          await saveDailyOnCall(currentShift as DailyOnCall);
          showToast('Đã lưu lịch trực', 'success');
          loadData();
      } catch (e: any) {
          showToast('Lỗi lưu: ' + (e?.message || 'Không thể lưu lịch trực'), 'error');
      } finally {
          setSubmitting(false);
      }
  };

  const handleSaveWeekly = async () => {
      setSubmitting(true);
      try {
          await batchSaveDailyOnCall(weeklyShifts);
          showToast('Đã lưu lịch tuần thành công', 'success');
          loadData();
      } catch (e: any) {
          showToast('Lỗi lưu tuần: ' + (e?.message || 'Không thể lưu lịch tuần'), 'error');
      } finally {
          setSubmitting(false);
      }
  };

  const updateWeeklyItem = (index: number, field: keyof DailyOnCall, value: string) => {
      const newShifts = [...weeklyShifts];
      newShifts[index] = { ...newShifts[index], [field]: value };
      setWeeklyShifts(newShifts);
  };
  
  const handleDeleteDaily = async () => {
      if(!currentShift.id || !confirm("Xoá lịch trực ngày này?")) return;
      setSubmitting(true);
      try {
          await deleteDailyOnCall(currentShift.id);
          showToast('Đã xoá', 'success');
          loadData();
      } catch(e) { showToast('Lỗi xoá', 'error'); } 
      finally { setSubmitting(false); }
  };

  const formatDateVN = (dStr: string) => {
      const d = new Date(dStr);
      return `${d.getDate()}/${d.getMonth()+1} (${['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]})`;
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <CalendarIcon className="h-6 w-6 text-blue-600" />
                    Phân Lịch Trực
                </h2>
                <p className="text-sm text-slate-500">Quản lý lịch trực Bác sĩ & Điều dưỡng</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('daily')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ngày</button>
                <button onClick={() => setViewMode('weekly')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tuần</button>
            </div>
        </div>

        {viewMode === 'daily' ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => {
                        const d = new Date(selectedDate); d.setDate(d.getDate() - 1);
                        setSelectedDate(d.toISOString().split('T')[0]);
                    }} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="h-5 w-5"/></button>
                    
                    <div className="text-center">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày trực</label>
                        <input type="date" className="font-bold text-lg text-slate-800 border-none focus:ring-0 p-0 text-center" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    </div>

                    <button onClick={() => {
                        const d = new Date(selectedDate); d.setDate(d.getDate() + 1);
                        setSelectedDate(d.toISOString().split('T')[0]);
                    }} className="p-2 hover:bg-slate-100 rounded-full"><ArrowRight className="h-5 w-5"/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bác sĩ trực <span className="text-red-500">*</span></label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentShift.doctor || ''} onChange={e => setCurrentShift({...currentShift, doctor: e.target.value})}>
                            <option value="">-- Chọn Bác sĩ --</option>
                            {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Điều dưỡng 1</label>
                            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentShift.nurse1 || ''} onChange={e => setCurrentShift({...currentShift, nurse1: e.target.value})}>
                                <option value="">-- Chọn ĐD --</option>
                                {nurses.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Điều dưỡng 2</label>
                            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentShift.nurse2 || ''} onChange={e => setCurrentShift({...currentShift, nurse2: e.target.value})}>
                                <option value="">-- Chọn ĐD --</option>
                                {nurses.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                        <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentShift.note || ''} onChange={e => setCurrentShift({...currentShift, note: e.target.value})} />
                    </div>
                </div>

                <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
                     {currentShift.id ? (
                         <button onClick={handleDeleteDaily} disabled={submitting} className="text-red-600 hover:text-red-700 flex items-center gap-2 text-sm font-medium px-3 py-2 hover:bg-red-50 rounded-lg transition-colors">
                             <Trash2 className="h-4 w-4" /> Xoá lịch
                         </button>
                     ) : <div></div>}
                     
                     <button onClick={handleSaveDaily} disabled={submitting} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm font-medium disabled:bg-blue-300">
                         {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                         Lưu Lịch Trực
                     </button>
                </div>
            </div>
        ) : (
            // Weekly Mode
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => {
                            const d = new Date(weekStartDate); d.setDate(d.getDate() - 7);
                            setWeekStartDate(d.toISOString().split('T')[0]);
                        }} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-300"><ArrowLeft className="h-4 w-4"/></button>
                        
                        <div className="font-bold text-slate-700">
                            Tuần từ: <input type="date" className="bg-transparent border-none focus:ring-0 p-0 font-bold text-blue-700" value={weekStartDate} onChange={e => setWeekStartDate(e.target.value)} />
                        </div>

                        <button onClick={() => {
                            const d = new Date(weekStartDate); d.setDate(d.getDate() + 7);
                            setWeekStartDate(d.toISOString().split('T')[0]);
                        }} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-300"><ArrowRight className="h-4 w-4"/></button>
                    </div>
                    
                    <button onClick={handleSaveWeekly} disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm disabled:bg-blue-300">
                         {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Lưu Tuần
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 w-32">Ngày</th>
                                <th className="px-4 py-3">Bác sĩ trực</th>
                                <th className="px-4 py-3">Điều dưỡng 1</th>
                                <th className="px-4 py-3">Điều dưỡng 2</th>
                                <th className="px-4 py-3">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {weeklyShifts.map((shift, idx) => (
                                <tr key={shift.date} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium text-slate-700 bg-slate-50/50">
                                        {shift.date ? formatDateVN(shift.date) : ''}
                                    </td>
                                    <td className="px-4 py-2">
                                        <select className="w-full border-slate-200 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={shift.doctor || ''} onChange={e => updateWeeklyItem(idx, 'doctor', e.target.value)}>
                                            <option value="">-</option>
                                            {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <select className="w-full border-slate-200 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={shift.nurse1 || ''} onChange={e => updateWeeklyItem(idx, 'nurse1', e.target.value)}>
                                            <option value="">-</option>
                                            {nurses.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <select className="w-full border-slate-200 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={shift.nurse2 || ''} onChange={e => updateWeeklyItem(idx, 'nurse2', e.target.value)}>
                                            <option value="">-</option>
                                            {nurses.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input type="text" className="w-full border-slate-200 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={shift.note || ''} onChange={e => updateWeeklyItem(idx, 'note', e.target.value)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};