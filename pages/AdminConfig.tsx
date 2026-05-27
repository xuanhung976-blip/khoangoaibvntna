import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { SystemConfig } from '../types';
import { getConfigs, saveConfig, deleteConfig } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

export const AdminConfig: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [current, setCurrent] = useState<Partial<SystemConfig>>({});
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getConfigs();
      setConfigs(data);
    } catch (e) {
      showToast('Lỗi tải cấu hình', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!current.key || !current.value) return;
    
    setSubmitting(true);
    try {
        await saveConfig(current as SystemConfig);
        showToast('Đã lưu cấu hình', 'success');
        setIsModalOpen(false);
        loadData();
    } catch(e) {
        showToast('Lỗi khi lưu', 'error');
    } finally {
        setSubmitting(false);
    }
  };

  const handleDelete = async () => {
      if(!deleteKey) return;
      setSubmitting(true);
      try {
          await deleteConfig(deleteKey);
          showToast('Đã xoá cấu hình', 'success');
          setIsDeleteOpen(false);
          loadData();
      } catch(e) {
          showToast('Lỗi xoá', 'error');
      } finally {
          setSubmitting(false); setDeleteKey(null);
      }
  };

  const openAdd = () => { setCurrent({}); setIsModalOpen(true); };
  const openEdit = (c: SystemConfig) => { setCurrent({...c}); setIsModalOpen(true); };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Settings className="h-6 w-6 text-blue-600" />
                    Cấu hình Hệ thống
                </h2>
                <p className="text-sm text-slate-500">Các tham số dùng chung cho toàn bộ ứng dụng</p>
            </div>
            <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Thêm Cấu hình
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-3">Mã Cấu hình (Key)</th>
                        <th className="px-6 py-3">Giá trị (Value)</th>
                        <th className="px-6 py-3">Mô tả</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : configs.map(c => (
                        <tr key={c.key} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-mono font-medium text-slate-700">{c.key}</td>
                            <td className="px-6 py-4 font-semibold text-blue-700">{c.value}</td>
                            <td className="px-6 py-4 text-slate-600">{c.description}</td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={()=>openEdit(c)} className="p-1.5 text-slate-500 hover:text-blue-600 rounded"><Edit2 className="h-4 w-4"/></button>
                                <button onClick={()=>{setDeleteKey(c.key); setIsDeleteOpen(true)}} className="p-1.5 text-slate-500 hover:text-red-600 rounded"><Trash2 className="h-4 w-4"/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} title={current.key ? "Sửa Cấu hình" : "Thêm Cấu hình"}>
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Mã (KEY)</label>
                    <input className="w-full border rounded px-3 py-2 bg-slate-50 font-mono" value={current.key||''} onChange={e=>setCurrent({...current, key: e.target.value.toUpperCase()})} disabled={!!current.description && !!current.value} placeholder="VD: TEN_KHOA" required />
                    <p className="text-xs text-slate-400 mt-1">Viết hoa, không dấu, nối bằng gạch dưới.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Giá trị</label>
                    <textarea className="w-full border rounded px-3 py-2" value={current.value||''} onChange={e=>setCurrent({...current, value: e.target.value})} required rows={3} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Mô tả ý nghĩa</label>
                    <input className="w-full border rounded px-3 py-2" value={current.description||''} onChange={e=>setCurrent({...current, description: e.target.value})} placeholder="Dùng để làm gì..." />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={()=>setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Huỷ</button>
                    <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Lưu
                    </button>
                </div>
            </form>
        </Modal>

        {/* Delete Confirm */}
        <Modal isOpen={isDeleteOpen} onClose={()=>setIsDeleteOpen(false)} title="Xác nhận xoá">
            <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <p>Bạn có chắc muốn xoá cấu hình <strong>{deleteKey}</strong>?</p>
                <p className="text-sm text-red-600">Việc này có thể gây lỗi hệ thống nếu mã đang được sử dụng.</p>
                <div className="flex justify-center gap-3">
                    <button onClick={()=>setIsDeleteOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Huỷ</button>
                    <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded">Xác nhận Xoá</button>
                </div>
            </div>
        </Modal>
    </div>
  );
};