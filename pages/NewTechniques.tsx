import React, { useState, useEffect } from 'react';
import { Lightbulb, Search, Plus, Trash2, Edit2, Loader2, BarChart2 } from 'lucide-react';
import { NewTechnique, Role } from '../types';
import { getTechniques, addTechnique, updateTechnique, deleteTechnique } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface Props {
  userRole: Role;
}

export const NewTechniquesPage: React.FC<Props> = ({ userRole }) => {
  const [data, setData] = useState<NewTechnique[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<NewTechnique>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Permissions
  const canDelete = userRole === Role.CHIEF;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getTechniques();
      setData(result);
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.name || !currentItem.leader) {
        showToast('Vui lòng nhập tên kỹ thuật và người phụ trách', 'error');
        return;
    }
    setSubmitting(true);
    try {
        if (currentItem.id) {
            await updateTechnique(currentItem.id, currentItem);
            showToast('Cập nhật thành công', 'success');
        } else {
            await addTechnique(currentItem as any);
            showToast('Thêm mới thành công', 'success');
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
        await deleteTechnique(deleteId);
        showToast('Đã xoá kỹ thuật', 'success');
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
    setCurrentItem({ 
        progress: 0, 
        count: 0,
        status: 'DeXuat',
        startDate: new Date().toISOString().split('T')[0] 
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: NewTechnique) => {
    setCurrentItem({ ...item });
    setIsModalOpen(true);
  };

  const ProgressBar = ({ pct }: { pct: number }) => {
    let color = 'bg-slate-500';
    if (pct > 0) color = 'bg-blue-500';
    if (pct >= 50) color = 'bg-yellow-500';
    if (pct >= 80) color = 'bg-green-500';

    return (
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
        </div>
    );
  };

  const filtered = data.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.leader.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-blue-600" />
                Kỹ thuật Mới
            </h2>
            <p className="text-sm text-slate-500 mt-1">Theo dõi triển khai các quy trình kỹ thuật mới tại khoa</p>
        </div>
        
        <button 
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
            <Plus className="h-4 w-4" />
            <span>Thêm Kỹ thuật</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Tìm tên kỹ thuật..." 
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
                        <th className="px-6 py-3 w-1/3">Kỹ thuật / Mô tả</th>
                        <th className="px-6 py-3">Phụ trách</th>
                        <th className="px-6 py-3 w-32">Tiến độ</th>
                        <th className="px-6 py-3 text-center">Số ca</th>
                        <th className="px-6 py-3">Trạng thái</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : filtered.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Chưa có dữ liệu.</td></tr>
                    ) : filtered.map(item => (
                        <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{item.name}</div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                                {item.leader}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-xs mb-1">
                                    <span className="font-semibold">{item.progress}%</span>
                                </div>
                                <ProgressBar pct={item.progress} />
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-blue-600">
                                {item.count}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    item.status === 'HoanThanh' ? 'bg-green-100 text-green-700' :
                                    item.status === 'DangTrienKhai' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {item.status === 'HoanThanh' ? 'Hoàn thành' : 
                                     item.status === 'DangTrienKhai' ? 'Đang triển khai' : 'Đề xuất'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => openEdit(item)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    {canDelete && (
                                        <button onClick={() => { setDeleteId(item.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={currentItem.id ? "Cập nhật Kỹ thuật" : "Đề xuất Kỹ thuật mới"}
      >
        <form onSubmit={handleSave} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên kỹ thuật <span className="text-red-500">*</span></label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Người phụ trách</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentItem.leader || ''} onChange={e => setCurrentItem({...currentItem, leader: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                    <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentItem.startDate || ''} onChange={e => setCurrentItem({...currentItem, startDate: e.target.value})} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg h-20" value={currentItem.description || ''} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} />
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tiến độ (%)</label>
                    <input type="number" min="0" max="100" className="w-full px-2 py-1 border rounded" value={currentItem.progress || 0} onChange={e => setCurrentItem({...currentItem, progress: parseInt(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Số ca</label>
                    <input type="number" min="0" className="w-full px-2 py-1 border rounded" value={currentItem.count || 0} onChange={e => setCurrentItem({...currentItem, count: parseInt(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Trạng thái</label>
                    <select className="w-full px-2 py-1 border rounded text-sm" value={currentItem.status || 'DeXuat'} onChange={e => setCurrentItem({...currentItem, status: e.target.value as any})}>
                        <option value="DeXuat">Đề xuất</option>
                        <option value="DangTrienKhai">Đang triển khai</option>
                        <option value="HoanThanh">Hoàn thành</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kết quả đạt được</label>
                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg h-16" value={currentItem.results || ''} onChange={e => setCurrentItem({...currentItem, results: e.target.value})} />
            </div>

            <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Hủy</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Lưu
                </button>
            </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xác nhận xoá">
        <div className="text-center">
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xoá kỹ thuật này?</p>
            <div className="flex gap-3 justify-center">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Hủy</button>
                <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded-lg">Xoá</button>
            </div>
        </div>
      </Modal>
    </div>
  );
};