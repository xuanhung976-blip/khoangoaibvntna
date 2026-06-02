
import React, { useState, useEffect } from 'react';
import { CalendarDays, Search, Plus, Edit2, Loader2, CheckSquare, Clock, User, AlertCircle, FileText, ClipboardList, BedDouble, Stethoscope, AlertTriangle, Eye } from 'lucide-react';
import { DailyBriefing, BriefingTask, Role, Patient, VipPatient, User as AppUser, APP_LOGO_URL } from '../types';
import { getBriefings, addBriefing, updateBriefing, getPatients, getVipPatients, getUsers } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface Props {
  userRole: Role;
}

type Tab = 'report' | 'log';

export const DailyBriefingPage: React.FC<Props> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<Tab>('report');
  
  // Data States
  const [briefings, setBriefings] = useState<DailyBriefing[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vipPatients, setVipPatients] = useState<VipPatient[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<DailyBriefing>>({});
  const [newTask, setNewTask] = useState<Partial<BriefingTask>>({ progress: 0 });
  const [submitting, setSubmitting] = useState(false);

  // Detail View State
  const [viewBriefing, setViewBriefing] = useState<DailyBriefing | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all required data in parallel
      const [briefingData, patientData, vipData, userData] = await Promise.all([
          getBriefings(),
          getPatients(),
          getVipPatients(),
          getUsers()
      ]);

      const safeUsers = Array.isArray(userData) ? userData.filter((u: AppUser) => u.active !== false) : [];
      const resolveUser = (value?: string) => safeUsers.find((u: AppUser) =>
          u.username === value || u.fullName === value
      );

      // Parse tasks from JSON string
      const parsedBriefings = (briefingData || []).map((b: any) => {
          let tasks: BriefingTask[] = [];
          if (b.congViecJson) {
              try {
                  tasks = JSON.parse(b.congViecJson);
              } catch (e) {
                  console.warn('Error parsing tasks for briefing', b.id, e);
              }
          } else if (b.tasks && Array.isArray(b.tasks)) {
              tasks = b.tasks;
          }
          const normalizedTasks = tasks.map((task, index) => {
              const user = resolveUser(task.assigneeUsername || task.assignee);
              return {
                  ...task,
                  id: task.id || `T${index + 1}`,
                  assigneeUsername: task.assigneeUsername || user?.username || '',
                  assigneeName: task.assigneeName || user?.fullName || task.assignee || '',
              };
          });
          return { ...b, tasks: normalizedTasks };
      });

      // Sort briefings by date desc
      const sortedBriefings = parsedBriefings.sort((a: DailyBriefing, b: DailyBriefing) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setBriefings(sortedBriefings);
      setPatients(patientData || []);
      setVipPatients(vipData || []);
      setUsers(safeUsers);
    } catch (e) {
      console.error("Error loading briefing data:", e);
      showToast('Lỗi tải dữ liệu giao ban', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.date || !currentItem.content) {
        showToast('Vui lòng nhập ngày và nội dung', 'error');
        return;
    }
    if ((currentItem.tasks || []).some(task => !String(task.taskName || '').trim() || !task.assigneeUsername)) {
        showToast('Moi cong viec phai co ten viec va nguoi lam duoc chon tu Users', 'error');
        return;
    }
    setSubmitting(true);
    try {
        if (currentItem.id) {
            await updateBriefing(currentItem.id, currentItem);
            showToast('Cập nhật giao ban thành công', 'success');
        } else {
            // New briefing, init empty tasks if not set
            await addBriefing({ ...currentItem, tasks: currentItem.tasks || [] } as any);
            showToast('Thêm giao ban ngày mới thành công', 'success');
        }
        setIsModalOpen(false);
        loadData();
    } catch (e) {
        showToast('Lỗi: ' + e, 'error');
    } finally {
        setSubmitting(false);
    }
  };

  const openAdd = () => {
    setCurrentItem({ 
        date: new Date().toISOString().split('T')[0], 
        host: '',
        content: '',
        tasks: []
    });
    setNewTask({ progress: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (item: DailyBriefing) => {
    setCurrentItem({ ...item });
    setNewTask({ progress: 0 });
    setIsModalOpen(true);
  };

  // --- Task Sub-Logic ---
  const getUserLabel = (username?: string) => {
      const user = users.find(u => u.username === username);
      return user?.fullName || username || '';
  };

  const addTask = () => {
      if(!String(newTask.taskName || '').trim()) {
          showToast('Vui long nhap ten viec can lam', 'error');
          return;
      }
      if(!newTask.assigneeUsername) {
          showToast('Vui long chon nguoi lam', 'error');
          return;
      }
      const assigneeName = getUserLabel(newTask.assigneeUsername);
      const t: BriefingTask = {
          id: 'T' + Date.now(),
          taskName: String(newTask.taskName).trim(),
          assignee: assigneeName,
          assigneeUsername: newTask.assigneeUsername,
          assigneeName,
          deadline: newTask.deadline || '',
          progress: newTask.progress || 0
      };
      const updatedTasks = [...(currentItem.tasks || []), t];
      setCurrentItem({ ...currentItem, tasks: updatedTasks });
      setNewTask({ taskName: '', assignee: '', assigneeUsername: '', assigneeName: '', deadline: '', progress: 0 });
  };

  const removeTask = (taskId: string) => {
      const updatedTasks = (currentItem.tasks || []).filter(t => t.id !== taskId);
      setCurrentItem({ ...currentItem, tasks: updatedTasks });
  };

  const updateTaskProgress = (taskId: string, newProgress: number) => {
       const updatedTasks = (currentItem.tasks || []).map(t => 
           t.id === taskId ? { ...t, progress: newProgress } : t
       );
       setCurrentItem({ ...currentItem, tasks: updatedTasks });
  };

  // Helper to check overdue
  const isOverdue = (deadline: string, progress: number) => {
      if(!deadline || progress >= 100) return false;
      const d = new Date(deadline);
      d.setHours(23, 59, 59, 999); // End of deadline day
      return d < new Date();
  };

  // --- Clinical Summary Helpers ---
  const getClinicalSummary = () => {
      const active = patients.filter(p => p.status !== 'RaVien');
      const waiting = active.filter(p => p.status === 'ChoMo');
      const postOp = active.filter(p => p.status === 'DaMo');
      const medical = active.filter(p => p.status === 'DieuTri'); // Noi khoa
      
      return { active, waiting, postOp, medical };
  };

  const filteredBriefings = briefings.filter(item => 
    item.content.toLowerCase().includes(search.toLowerCase()) || 
    item.host.toLowerCase().includes(search.toLowerCase())
  );

  const stats = getClinicalSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-blue-600" />
                Giao ban Hàng ngày
            </h2>
            <p className="text-sm text-slate-500 mt-1">Báo cáo số liệu & Sổ nhật ký điều hành</p>
        </div>
        
        <button 
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
            <Plus className="h-4 w-4" />
            <span>Thêm Giao ban</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
          <div className="flex gap-8">
              <button 
                onClick={() => setActiveTab('report')}
                className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'report' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                  <FileText className="h-4 w-4" /> 
                  Báo cáo Số liệu
              </button>
              <button 
                onClick={() => setActiveTab('log')}
                className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'log' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                  <ClipboardList className="h-4 w-4" /> 
                  Sổ Giao ban
              </button>
          </div>
      </div>

      {/* Content */}
      {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : activeTab === 'report' ? (
          // === REPORT VIEW ===
          <div className="space-y-6 animate-fade-in">
              {/* Top Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                      <div className="text-slate-500 text-xs font-bold uppercase mb-1">Tổng nội trú</div>
                      <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                          {stats.active.length} <BedDouble className="h-5 w-5 text-blue-500" />
                      </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                      <div className="text-slate-500 text-xs font-bold uppercase mb-1">Chờ mổ</div>
                      <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                          {stats.waiting.length} <Clock className="h-5 w-5" />
                      </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                      <div className="text-slate-500 text-xs font-bold uppercase mb-1">Hậu phẫu</div>
                      <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                          {stats.postOp.length} <Stethoscope className="h-5 w-5" />
                      </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                      <div className="text-slate-500 text-xs font-bold uppercase mb-1">BN Lưu ý</div>
                      <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
                          {vipPatients.length} <AlertTriangle className="h-5 w-5" />
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* VIP Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 font-bold text-purple-800 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" /> Bệnh nhân cần lưu ý
                      </div>
                      <div className="p-0 overflow-x-auto">
                          <table className="w-full text-sm">
                              <tbody className="divide-y divide-slate-100">
                                  {vipPatients.length === 0 ? (
                                      <tr><td className="p-4 text-center text-slate-500 italic">Không có bệnh nhân lưu ý.</td></tr>
                                  ) : vipPatients.map(v => (
                                      <tr key={v.id} className="hover:bg-slate-50">
                                          <td className="px-4 py-2 font-medium">{v.name}</td>
                                          <td className="px-4 py-2 text-xs">
                                              <span className={`px-2 py-0.5 rounded ${v.priority === 'Cao' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                  {v.priority}
                                              </span>
                                          </td>
                                          <td className="px-4 py-2 text-slate-500 text-xs truncate max-w-[150px]">{v.reason}</td>
                                          <td className="px-4 py-2 text-right text-xs font-mono">{v.room}/{v.bed}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  {/* Waiting Surgery Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 font-bold text-orange-800 flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Danh sách Chờ mổ
                      </div>
                      <div className="p-0 overflow-x-auto">
                          <table className="w-full text-sm">
                              <tbody className="divide-y divide-slate-100">
                                  {stats.waiting.length === 0 ? (
                                      <tr><td className="p-4 text-center text-slate-500 italic">Không có bệnh nhân chờ mổ.</td></tr>
                                  ) : stats.waiting.slice(0, 5).map(p => (
                                      <tr key={p.id} className="hover:bg-slate-50">
                                          <td className="px-4 py-2 font-medium">{p.name}</td>
                                          <td className="px-4 py-2 text-xs text-slate-500">{p.diagnosis}</td>
                                          <td className="px-4 py-2 text-right text-xs font-mono">{p.room}/{p.bed}</td>
                                      </tr>
                                  ))}
                                  {stats.waiting.length > 5 && (
                                      <tr><td colSpan={3} className="p-2 text-center text-xs text-blue-500 bg-slate-50">Xem thêm {stats.waiting.length - 5} bệnh nhân...</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      ) : (
          // === LOG VIEW ===
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Tìm nội dung giao ban..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                 </div>
            </div>

            <div className="divide-y divide-slate-100">
                {filteredBriefings.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic">Chưa có dữ liệu sổ giao ban.</div>
                ) : filteredBriefings.map(item => {
                    const overdueCount = (item.tasks || []).filter(t => isOverdue(t.deadline, t.progress)).length;
                    
                    return (
                        <div 
                            key={item.id} 
                            onClick={() => setViewBriefing(item)}
                            className="p-6 hover:bg-slate-50 transition-colors group cursor-pointer border-b last:border-0 border-slate-100"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded text-sm border border-blue-200">
                                        {new Date(item.date).toLocaleDateString('vi-VN')}
                                    </div>
                                    <div className="text-sm text-slate-600 flex items-center gap-1">
                                        <User className="h-3 w-3" /> Chủ trì: <span className="font-semibold">{item.host}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); openEdit(item); }} 
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Chỉnh sửa"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <p className="text-slate-800 whitespace-pre-line line-clamp-3">{item.content}</p>
                                {item.content.length > 200 && <span className="text-xs text-blue-500 italic hover:underline mt-1 block">Xem chi tiết...</span>}
                            </div>

                            {item.tasks && item.tasks.length > 0 && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <CheckSquare className="h-3 w-3" /> Việc được giao ({item.tasks.length})
                                        {overdueCount > 0 && <span className="text-red-500 ml-2 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> {overdueCount} quá hạn</span>}
                                    </div>
                                    <div className="space-y-2">
                                        {item.tasks.slice(0, 3).map(t => (
                                            <div key={t.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                     <div className={`w-2 h-2 rounded-full ${t.progress >= 100 ? 'bg-green-500' : isOverdue(t.deadline, t.progress) ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                                     <span className={t.progress >= 100 ? 'line-through text-slate-400' : 'text-slate-700'}>{t.taskName}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span>{t.assigneeName || t.assignee}</span>
                                                    <span className="font-mono">{t.progress}%</span>
                                                </div>
                                            </div>
                                        ))}
                                        {item.tasks.length > 3 && <div className="text-xs text-slate-400 italic pl-2">+ {item.tasks.length - 3} công việc khác</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
      )}

      {/* Edit/Add Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={currentItem.id ? "Sửa Giao ban" : "Giao ban Mới"}
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày giao ban</label>
                    <input 
                        type="date" 
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={currentItem.date || ''}
                        onChange={e => setCurrentItem({...currentItem, date: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Người chủ trì</label>
                    <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={currentItem.host || ''}
                        onChange={e => setCurrentItem({...currentItem, host: e.target.value})}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung chính / Sự vụ</label>
                <textarea 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                    value={currentItem.content || ''}
                    onChange={e => setCurrentItem({...currentItem, content: e.target.value})}
                />
            </div>

            {/* Sub-Task Manager */}
            <div className="border-t border-slate-200 pt-4 mt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Phân công công việc</label>
                
                {/* List Tasks */}
                <div className="space-y-2 mb-3">
                    {currentItem.tasks?.map(t => (
                         <div key={t.id} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                             <div className="flex-1">
                                 <div className="font-medium">{t.taskName}</div>
                                 <div className="text-xs text-slate-500">{t.assigneeName || t.assignee} | Deadline: {t.deadline}</div>
                             </div>
                             <div className="flex items-center gap-2">
                                 <input 
                                    type="number" min="0" max="100" 
                                    className="w-12 px-1 border rounded text-xs" 
                                    value={t.progress}
                                    onChange={(e) => updateTaskProgress(t.id, parseInt(e.target.value))}
                                 />
                                 <span className="text-xs">%</span>
                                 <button type="button" onClick={() => removeTask(t.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">X</button>
                             </div>
                         </div>
                    ))}
                </div>

                {/* Add Task Input */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-2">
                    <input 
                        type="text" placeholder="Tên việc cần làm..."
                        className="w-full px-2 py-1.5 text-sm border rounded"
                        value={newTask.taskName || ''}
                        onChange={e => setNewTask({...newTask, taskName: e.target.value})}
                    />
                    <div className="flex gap-2">
                        <select
                            className="flex-1 px-2 py-1.5 text-sm border rounded bg-white"
                            value={newTask.assigneeUsername || ''}
                            onChange={e => {
                                const assigneeUsername = e.target.value;
                                const assigneeName = getUserLabel(assigneeUsername);
                                setNewTask({...newTask, assigneeUsername, assigneeName, assignee: assigneeName});
                            }}
                        >
                            <option value="">Chon nguoi lam</option>
                            {users.map(user => (
                                <option key={user.username} value={user.username}>
                                    {user.fullName || user.username}
                                </option>
                            ))}
                        </select>
                        <input 
                            type="date"
                            className="w-32 px-2 py-1.5 text-sm border rounded"
                            value={newTask.deadline || ''}
                            onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                        />
                         <button 
                            type="button" onClick={addTask}
                            className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
                        >
                            Thêm
                        </button>
                    </div>
                </div>
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
                    Lưu
                </button>
            </div>
        </form>
      </Modal>

      {/* VIEW DETAIL MODAL */}
      <Modal 
        isOpen={!!viewBriefing} 
        onClose={() => setViewBriefing(null)} 
        title="Chi tiết Giao ban"
      >
        {viewBriefing && (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
                {/* LOGO HEADER IN MODAL */}
                <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-3">
                    <img 
                        src={APP_LOGO_URL} 
                        referrerPolicy="no-referrer"
                        alt=""
                        className="h-12 w-12 rounded-full object-cover border border-slate-100 shadow-sm bg-white" 
                    />
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">BỆNH VIỆN NỘI TIẾT NGHỆ AN</div>
                        <div className="text-lg font-bold text-blue-700 uppercase">KHOA NGOẠI TỔNG HỢP</div>
                    </div>
                </div>

                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">Ngày giao ban</span>
                        <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-blue-600" />
                            {new Date(viewBriefing.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">Chủ trì</span>
                        <div className="font-medium text-slate-800 flex items-center justify-end gap-1">
                            <User className="h-4 w-4 text-slate-400" />
                            {viewBriefing.host || '---'}
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" /> Nội dung / Sự vụ
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-lg text-slate-800 whitespace-pre-line leading-relaxed text-sm border border-slate-200 shadow-inner">
                        {viewBriefing.content}
                    </div>
                </div>

                {viewBriefing.tasks && viewBriefing.tasks.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-slate-700 uppercase mb-2 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-blue-600" /> Phân công công việc
                        </h4>
                        <div className="space-y-2">
                            {viewBriefing.tasks.map(t => {
                                const isComplete = t.progress >= 100;
                                const isLate = isOverdue(t.deadline, t.progress);
                                const statusLabel = isComplete ? 'Hoàn thành' : isLate ? 'Quá hạn' : 'Đang làm';
                                const statusColor = isComplete 
                                    ? 'bg-green-100 text-green-700' 
                                    : isLate 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-blue-100 text-blue-700';

                                return (
                                    <div key={t.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 text-sm shadow-sm">
                                        <div>
                                            <div className="font-medium text-slate-800">{t.taskName}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                Người làm: <span className="font-semibold text-slate-700">{t.assigneeName || t.assignee}</span>
                                                {t.deadline && <span className={isLate ? 'text-red-500 font-bold ml-1' : 'ml-1'}> | Hạn: {new Date(t.deadline).toLocaleDateString('vi-VN')}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${statusColor}`}>
                                                {statusLabel}
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">
                                                {t.progress}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => setViewBriefing(null)} 
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                        Đóng
                    </button>
                    <button 
                        onClick={() => { openEdit(viewBriefing); setViewBriefing(null); }} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                    >
                        <Edit2 className="h-4 w-4" /> Chỉnh sửa
                    </button>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};
