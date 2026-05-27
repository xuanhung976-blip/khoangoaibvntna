import React, { useState, useEffect } from 'react';
import { Users2, Search, Plus, Trash2, Edit2, Loader2, MapPin, Clock, Calendar } from 'lucide-react';
import { ScientificMeeting, Role } from '../types';
import { getScientificMeetings, addScientificMeeting, updateScientificMeeting, deleteScientificMeeting } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface Props {
  userRole: Role;
}

export const ScientificMeetings: React.FC<Props> = ({ userRole }) => {
  const [data, setData] = useState<ScientificMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ScientificMeeting>>({});
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
      const result = await getScientificMeetings();
      // Sort by date descending
      const sorted = result.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setData(sorted);
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(item => 
    item.topic.toLowerCase().includes(search.toLowerCase()) || 
    item.presenter.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.time || !currentItem.topic) {
        showToast('Vui lòng nhập thời gian và chủ đề', 'error');
        return;
    }
    setSubmitting(true);
    try {
        if (currentItem.id) {
            await updateScientificMeeting(currentItem.id, currentItem);
            showToast('Cập nhật thành công', 'success');
        } else {
            await addScientificMeeting(currentItem as any);
            showToast('Thêm buổi sinh hoạt thành công', 'success');
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
        await deleteScientificMeeting(deleteId);
        showToast('Đã xoá buổi sinh hoạt', 'success');
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
    // Default to next day 14:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const defaultTime = tomorrow.toISOString().slice(0, 16);
    
    setCurrentItem({ time: defaultTime, location: 'Hội trường Khoa Ngoại' });
    setIsModalOpen(true);
  };

  const openEdit = (item: ScientificMeeting) => {
    setCurrentItem({ ...item });
    setIsModalOpen(true);
  };

  const formatDateTime = (isoString: string) => {
      if (!isoString) return { date: '-', time: '-' };
      const dateObj = new Date(isoString);
      const date = dateObj.toLocaleDateString('vi-VN');
      const time = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return { date, time };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users2 className="h-6 w-6 text-blue-600" />
                Sinh hoạt Khoa học
            </h2>
            <p className="text-sm text-slate-500 mt-1">Lịch trình & nội dung các buổi cập nhật kiến thức</p>
        </div>
        
        <button 
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
            <Plus className="h-4 w-4" />
            <span>Thêm Lịch</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Tìm chủ đề, người trình bày..." 
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
                        <th className="px-6 py-3 w-40">Thời gian</th>
                        <th className="px-6 py-3">Chủ đề</th>
                        <th className="px-6 py-3">Người trình bày</th>
                        <th className="px-6 py-3">Địa điểm</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : filtered.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Chưa có lịch sinh hoạt nào.</td></tr>
                    ) : filtered.map(item => {
                        const { date, time } = formatDateTime(item.time);
                        const isPast = new Date(item.time) < new Date();

                        return (
                            <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isPast ? 'bg-slate-50 opacity-70' : 'bg-white'}`}>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1 font-bold text-slate-700">
                                            <Calendar className="h-3 w-3" /> {date}
                                        </div>
                                        <div className="flex items-center gap-1 text-blue-600 font-medium">
                                            <Clock className="h-3 w-3" /> {time}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-800">{item.topic}</div>
                                    {item.notes && (
                                        <a href={item.notes} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
                                            Tài liệu đính kèm ↗
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-700">
                                    {item.presenter}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> {item.location}
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

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={currentItem.id ? "Cập nhật Lịch sinh hoạt" : "Thêm Lịch sinh hoạt mới"}
      >
        <form onSubmit={handleSave} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian <span className="text-red-500">*</span></label>
                <input 
                    type="datetime-local" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentItem.time || ''}
                    onChange={e => setCurrentItem({...currentItem, time: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chủ đề sinh hoạt <span className="text-red-500">*</span></label>
                <textarea 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                    value={currentItem.topic || ''}
                    onChange={e => setCurrentItem({...currentItem, topic: e.target.value})}
                    placeholder="Nhập nội dung chuyên môn..."
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Người trình bày</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentItem.presenter || ''}
                    onChange={e => setCurrentItem({...currentItem, presenter: e.target.value})}
                    placeholder="VD: BS. Nguyễn Văn A"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Địa điểm</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentItem.location || ''}
                    onChange={e => setCurrentItem({...currentItem, location: e.target.value})}
                    placeholder="VD: Phòng Hội chẩn"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link tài liệu (nếu có)</label>
                <input 
                    type="url" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentItem.notes || ''}
                    onChange={e => setCurrentItem({...currentItem, notes: e.target.value})}
                    placeholder="https://drive.google.com/..."
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
                    Lưu lịch
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
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xoá buổi sinh hoạt này?</p>
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
                    Xoá
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};