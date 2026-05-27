import React, { useState, useEffect } from 'react';
import { Megaphone, Search, Plus, Trash2, Edit2, Loader2, ExternalLink } from 'lucide-react';
import { CommunicationContent, Role } from '../types';
import { getCommunication, addCommunication, updateCommunication, deleteCommunication } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface Props {
  userRole: Role;
}

export const CommunicationPage: React.FC<Props> = ({ userRole }) => {
  const [data, setData] = useState<CommunicationContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<CommunicationContent>>({});
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
      const result = await getCommunication();
      // Sort by date desc
      const sorted = result.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
      setData(sorted);
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.title) {
        showToast('Vui lòng nhập tiêu đề', 'error');
        return;
    }
    setSubmitting(true);
    try {
        if (currentItem.id) {
            await updateCommunication(currentItem.id, currentItem);
            showToast('Cập nhật thành công', 'success');
        } else {
            await addCommunication(currentItem as any);
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
        await deleteCommunication(deleteId);
        showToast('Đã xoá nội dung', 'success');
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
        status: 'Nhap',
        platform: 'Facebook',
        publishDate: new Date().toISOString().split('T')[0] 
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: CommunicationContent) => {
    setCurrentItem({ ...item });
    setIsModalOpen(true);
  };

  const getPlatformColor = (p: string) => {
      switch(p) {
          case 'Facebook': return 'bg-blue-600 text-white';
          case 'Website': return 'bg-cyan-600 text-white';
          case 'Zalo': return 'bg-blue-400 text-white';
          case 'Báo chí': return 'bg-slate-700 text-white';
          default: return 'bg-slate-500 text-white';
      }
  };

  const filtered = data.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    item.leader.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-blue-600" />
                Truyền thông Khoa
            </h2>
            <p className="text-sm text-slate-500 mt-1">Quản lý nội dung bài viết và sự kiện</p>
        </div>
        
        <button 
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
            <Plus className="h-4 w-4" />
            <span>Thêm Nội dung</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Tìm tiêu đề..." 
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
                        <th className="px-6 py-3 w-1/3">Tiêu đề / Tóm tắt</th>
                        <th className="px-6 py-3">Kênh</th>
                        <th className="px-6 py-3">Phụ trách</th>
                        <th className="px-6 py-3">Ngày đăng</th>
                        <th className="px-6 py-3">Trạng thái</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : filtered.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Chưa có nội dung nào.</td></tr>
                    ) : filtered.map(item => (
                        <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{item.title}</div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{item.content}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPlatformColor(item.platform)}`}>
                                    {item.platform}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                                {item.leader}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                                {item.publishDate}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    item.status === 'DaDang' ? 'bg-green-100 text-green-700' :
                                    item.status === 'Duyet' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {item.status === 'DaDang' ? 'Đã đăng' : 
                                     item.status === 'Duyet' ? 'Đã duyệt' : 'Nháp'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {item.link && (
                                        <a href={item.link} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600">
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}
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
        title={currentItem.id ? "Cập nhật Nội dung" : "Soạn thảo Mới"}
      >
        <form onSubmit={handleSave} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề bài viết <span className="text-red-500">*</span></label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentItem.title || ''} onChange={e => setCurrentItem({...currentItem, title: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kênh</label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentItem.platform} onChange={e => setCurrentItem({...currentItem, platform: e.target.value as any})}>
                        <option value="Facebook">Facebook</option>
                        <option value="Website">Website</option>
                        <option value="Zalo">Zalo</option>
                        <option value="Báo chí">Báo chí</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày đăng</label>
                    <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentItem.publishDate || ''} onChange={e => setCurrentItem({...currentItem, publishDate: e.target.value})} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung tóm tắt</label>
                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg h-24" value={currentItem.content || ''} onChange={e => setCurrentItem({...currentItem, content: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Người phụ trách</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentItem.leader || ''} onChange={e => setCurrentItem({...currentItem, leader: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentItem.status} onChange={e => setCurrentItem({...currentItem, status: e.target.value as any})}>
                        <option value="Nhap">Nháp</option>
                        <option value="Duyet">Đã duyệt</option>
                        <option value="DaDang">Đã đăng</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link bài viết (nếu có)</label>
                <input type="url" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentItem.link || ''} onChange={e => setCurrentItem({...currentItem, link: e.target.value})} placeholder="https://..." />
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
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xoá nội dung này?</p>
            <div className="flex gap-3 justify-center">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Hủy</button>
                <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded-lg">Xoá</button>
            </div>
        </div>
      </Modal>
    </div>
  );
};