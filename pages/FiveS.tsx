
import React, { useState, useEffect } from 'react';
import { Archive, Plus, Search, Trash2, Edit2, Loader2, CheckSquare, ClipboardList, Lightbulb, AlertTriangle } from 'lucide-react';
import { Zone5S, Evaluation5S, Improvement5S, Role } from '../types';
import { getZones, addZone, updateZone, deleteZone, getEvaluations, addEvaluation, getImprovements, addImprovement, updateImprovement, deleteImprovement } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface FiveSProps {
  userRole: Role;
}

type Tab = 'zones' | 'evaluations' | 'improvements';

export const FiveS: React.FC<FiveSProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<Tab>('zones');
  const [zones, setZones] = useState<Zone5S[]>([]);
  const [evals, setEvals] = useState<Evaluation5S[]>([]);
  const [improvements, setImprovements] = useState<Improvement5S[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isImpModalOpen, setIsImpModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Current Items
  const [currentZone, setCurrentZone] = useState<Partial<Zone5S>>({});
  const [currentEval, setCurrentEval] = useState<Partial<Evaluation5S>>({});
  const [currentImp, setCurrentImp] = useState<Partial<Improvement5S>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = Boolean(userRole || true);
  const canDelete = Boolean(userRole || true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
        const [zData, eData, iData] = await Promise.all([getZones(), getEvaluations(), getImprovements()]);
        setZones(zData);
        setEvals(eData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setImprovements(iData);
    } catch (e) {
      showToast('Lỗi tải dữ liệu 5S', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleSaveZone = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentZone.name || !currentZone.type) { showToast('Cần nhập tên vùng và loại', 'error'); return; }
      setSubmitting(true);
      try {
          if(currentZone.id) await updateZone(currentZone.id, currentZone);
          else await addZone(currentZone as any);
          showToast('Lưu vùng 5S thành công', 'success');
          setIsZoneModalOpen(false);
          loadData();
      } catch(e) { showToast('Lỗi khi lưu', 'error'); } 
      finally { setSubmitting(false); }
  };

  const handleSaveEval = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentEval.zoneId || !currentEval.date) { showToast('Chọn vùng và ngày', 'error'); return; }
      setSubmitting(true);
      try {
          await addEvaluation(currentEval as any);
          showToast('Đã lưu đánh giá', 'success');
          setIsEvalModalOpen(false);
          loadData();
      } catch(e) { showToast('Lỗi khi lưu', 'error'); }
      finally { setSubmitting(false); }
  };

  const handleSaveImp = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentImp.content) { showToast('Nhập nội dung', 'error'); return; }
      setSubmitting(true);
      try {
          if(currentImp.id) await updateImprovement(currentImp.id, currentImp);
          else await addImprovement(currentImp as any);
          showToast('Lưu cải tiến thành công', 'success');
          setIsImpModalOpen(false);
          loadData();
      } catch(e) { showToast('Lỗi khi lưu', 'error'); }
      finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
      if(!deleteId || !canDelete) return;
      setSubmitting(true);
      try {
          if(activeTab === 'zones') await deleteZone(deleteId);
          if(activeTab === 'improvements') await deleteImprovement(deleteId);
          showToast('Đã xoá dữ liệu', 'success');
          setIsDeleteModalOpen(false);
          loadData();
      } catch(e) { showToast('Lỗi khi xoá', 'error'); }
      finally { setSubmitting(false); setDeleteId(null); }
  };

  // --- Render Helpers ---
  const getZoneName = (id: string) => zones.find(z => z.id === id)?.name || id;
  const getScoreColor = (score: number) => {
      if(score >= 90) return 'bg-green-100 text-green-800';
      if(score >= 70) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Archive className="h-6 w-6 text-blue-600" />
                Quản lý 5S & Vệ sinh
            </h2>
            <p className="text-sm text-slate-500 mt-1">Sàng lọc - Sắp xếp - Sạch sẽ - Săn sóc - Sẵn sàng</p>
        </div>
        
        {canEdit && (
            <button 
                onClick={() => {
                    if(activeTab === 'zones') { setCurrentZone({}); setIsZoneModalOpen(true); }
                    if(activeTab === 'evaluations') { setCurrentEval({ date: new Date().toISOString().split('T')[0], score: 100 }); setIsEvalModalOpen(true); }
                    if(activeTab === 'improvements') { setCurrentImp({ status: 'DeXuat' }); setIsImpModalOpen(true); }
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
                <Plus className="h-4 w-4" />
                <span>{activeTab === 'zones' ? 'Thêm Vùng' : activeTab === 'evaluations' ? 'Đánh giá Mới' : 'Đề xuất Cải tiến'}</span>
            </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
          <div className="flex gap-8">
              {[
                  { id: 'zones', label: 'Quản lý Vùng', icon: CheckSquare },
                  { id: 'evaluations', label: 'Lịch sử Đánh giá', icon: ClipboardList },
                  { id: 'improvements', label: 'Cải tiến', icon: Lightbulb }
              ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveTab(t.id as Tab)}
                    className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                      <t.icon className="h-4 w-4" /> {t.label}
                  </button>
              ))}
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Tìm kiếm..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
             </div>
        </div>
        
        {/* Table Content */}
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    {activeTab === 'zones' && (
                        <tr>
                            <th className="px-6 py-3">Tên Vùng / Khu vực</th>
                            <th className="px-6 py-3">Loại</th>
                            <th className="px-6 py-3">Phụ trách</th>
                            <th className="px-6 py-3">Điểm gần nhất</th>
                            <th className="px-6 py-3">Ngày kiểm</th>
                            {canEdit && <th className="px-6 py-3 text-right">Thao tác</th>}
                        </tr>
                    )}
                    {activeTab === 'evaluations' && (
                        <tr>
                            <th className="px-6 py-3">Ngày</th>
                            <th className="px-6 py-3">Khu vực</th>
                            <th className="px-6 py-3">Người đánh giá</th>
                            <th className="px-6 py-3">Điểm số</th>
                            <th className="px-6 py-3">Nhận xét</th>
                        </tr>
                    )}
                    {activeTab === 'improvements' && (
                        <tr>
                            <th className="px-6 py-3">Khu vực</th>
                            <th className="px-6 py-3 w-1/3">Nội dung cải tiến</th>
                            <th className="px-6 py-3">Người đề xuất</th>
                            <th className="px-6 py-3">Trạng thái</th>
                            {canEdit && <th className="px-6 py-3 text-right">Thao tác</th>}
                        </tr>
                    )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : activeTab === 'zones' ? (
                        zones.filter(z => z.name.toLowerCase().includes(search.toLowerCase())).map(z => (
                            <tr key={z.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-800">{z.name}</td>
                                <td className="px-6 py-4 text-slate-600">{z.type}</td>
                                <td className="px-6 py-4">{z.pic}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(z.currentScore)}`}>{z.currentScore}/100</span>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{z.lastCheckDate || '-'}</td>
                                {canEdit && (
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => { setCurrentZone(z); setIsZoneModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="h-4 w-4" /></button>
                                        {canDelete && <button onClick={() => { setDeleteId(z.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>}
                                    </td>
                                )}
                            </tr>
                        ))
                    ) : activeTab === 'evaluations' ? (
                        evals.filter(e => getZoneName(e.zoneId).toLowerCase().includes(search.toLowerCase())).map(e => (
                            <tr key={e.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-slate-700">{e.date}</td>
                                <td className="px-6 py-4 font-medium">{getZoneName(e.zoneId)}</td>
                                <td className="px-6 py-4">{e.assessor}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(e.score)}`}>{e.score}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{e.comments}</td>
                            </tr>
                        ))
                    ) : (
                        improvements.filter(i => i.content.toLowerCase().includes(search.toLowerCase())).map(i => (
                            <tr key={i.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium">{getZoneName(i.zoneId)}</td>
                                <td className="px-6 py-4">{i.content}</td>
                                <td className="px-6 py-4">{i.proposer}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        i.status === 'HoanThanh' ? 'bg-green-100 text-green-700' :
                                        i.status === 'DangLam' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {i.status === 'HoanThanh' ? 'Hoàn thành' : i.status === 'DangLam' ? 'Đang làm' : 'Đề xuất'}
                                    </span>
                                </td>
                                {canEdit && (
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => { setCurrentImp(i); setIsImpModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="h-4 w-4" /></button>
                                        {canDelete && <button onClick={() => { setDeleteId(i.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>}
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* ZONE MODAL */}
      <Modal isOpen={isZoneModalOpen} onClose={() => setIsZoneModalOpen(false)} title={currentZone.id ? "Sửa Vùng" : "Thêm Vùng 5S"}>
          <form onSubmit={handleSaveZone} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium mb-1">Tên Vùng <span className="text-red-500">*</span></label>
                  <input required className="w-full border rounded px-3 py-2" value={currentZone.name||''} onChange={e=>setCurrentZone({...currentZone, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium mb-1">Loại <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        className="w-full border rounded px-3 py-2" 
                        value={currentZone.type || ''} 
                        onChange={e=>setCurrentZone({...currentZone, type: e.target.value})} 
                        placeholder="VD: Buồng bệnh, Hành lang..."
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1">Phụ trách</label>
                      <input className="w-full border rounded px-3 py-2" value={currentZone.pic||''} onChange={e=>setCurrentZone({...currentZone, pic: e.target.value})} />
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1">Ghi chú</label>
                  <textarea className="w-full border rounded px-3 py-2" value={currentZone.notes||''} onChange={e=>setCurrentZone({...currentZone, notes: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={()=>setIsZoneModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Hủy</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">Lưu</button>
              </div>
          </form>
      </Modal>

      {/* EVAL MODAL */}
      <Modal isOpen={isEvalModalOpen} onClose={() => setIsEvalModalOpen(false)} title="Đánh giá 5S">
          <form onSubmit={handleSaveEval} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium mb-1">Khu vực</label>
                  <select required className="w-full border rounded px-3 py-2" value={currentEval.zoneId||''} onChange={e=>setCurrentEval({...currentEval, zoneId: e.target.value})}>
                      <option value="">-- Chọn --</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium mb-1">Ngày</label>
                      <input type="date" required className="w-full border rounded px-3 py-2" value={currentEval.date||''} onChange={e=>setCurrentEval({...currentEval, date: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1">Điểm số (0-100)</label>
                      <input type="number" min="0" max="100" required className="w-full border rounded px-3 py-2" value={currentEval.score||0} onChange={e=>setCurrentEval({...currentEval, score: parseInt(e.target.value)})} />
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1">Người đánh giá</label>
                  <input className="w-full border rounded px-3 py-2" value={currentEval.assessor||''} onChange={e=>setCurrentEval({...currentEval, assessor: e.target.value})} />
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1">Nhận xét / Vấn đề</label>
                  <textarea className="w-full border rounded px-3 py-2" value={currentEval.comments||''} onChange={e=>setCurrentEval({...currentEval, comments: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={()=>setIsEvalModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Hủy</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">Lưu</button>
              </div>
          </form>
      </Modal>

      {/* IMPROVE MODAL */}
      <Modal isOpen={isImpModalOpen} onClose={() => setIsImpModalOpen(false)} title="Cải tiến 5S">
          <form onSubmit={handleSaveImp} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium mb-1">Khu vực liên quan</label>
                  <select required className="w-full border rounded px-3 py-2" value={currentImp.zoneId||''} onChange={e=>setCurrentImp({...currentImp, zoneId: e.target.value})}>
                      <option value="">-- Chọn --</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1">Nội dung cải tiến</label>
                  <textarea required className="w-full border rounded px-3 py-2" value={currentImp.content||''} onChange={e=>setCurrentImp({...currentImp, content: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium mb-1">Người đề xuất</label>
                      <input className="w-full border rounded px-3 py-2" value={currentImp.proposer||''} onChange={e=>setCurrentImp({...currentImp, proposer: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1">Trạng thái</label>
                      <select className="w-full border rounded px-3 py-2" value={currentImp.status||'DeXuat'} onChange={e=>setCurrentImp({...currentImp, status: e.target.value as any})}>
                          <option value="DeXuat">Đề xuất</option>
                          <option value="DangLam">Đang làm</option>
                          <option value="HoanThanh">Hoàn thành</option>
                      </select>
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1">Kết quả</label>
                  <input className="w-full border rounded px-3 py-2" value={currentImp.result||''} onChange={e=>setCurrentImp({...currentImp, result: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={()=>setIsImpModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Hủy</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">Lưu</button>
              </div>
          </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xác nhận xoá">
        <div className="text-center">
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xoá dữ liệu này?</p>
            <div className="flex gap-3 justify-center">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Hủy</button>
                <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded-lg">Xoá</button>
            </div>
        </div>
      </Modal>
    </div>
  );
};
