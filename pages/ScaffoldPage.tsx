import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Loader2, FileText, Filter } from 'lucide-react';
import { Role } from '../types';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { getGenericData, saveGenericData, deleteGenericData } from '../services/dataService';

export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'select' | 'textarea';
  options?: string[]; // For select type
  badgeColors?: Record<string, string>; // e.g., { 'Active': 'bg-green-100 text-green-800' }
  width?: string; // e.g., 'w-32'
}

interface ScaffoldPageProps {
  title: string;
  moduleName: string; // Used for API calls
  userRole: Role;
  columns: Column[];
  canEdit?: boolean;
}

export const ScaffoldPage: React.FC<ScaffoldPageProps> = ({ 
  title, moduleName, userRole, columns, canEdit = true 
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Permission Check
  const hasWriteAccess = canEdit && (userRole === Role.CHIEF || userRole === Role.HEAD_NURSE);

  useEffect(() => {
    loadData();
  }, [moduleName]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getGenericData(moduleName);
      setData(result);
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
        await saveGenericData(moduleName, currentItem);
        showToast(currentItem.id ? 'Cập nhật thành công' : 'Thêm mới thành công', 'success');
        setIsModalOpen(false);
        loadData();
    } catch (e) {
        showToast('Có lỗi xảy ra', 'error');
    } finally {
        setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
        await deleteGenericData(moduleName, deleteId);
        showToast('Đã xoá dữ liệu', 'success');
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
    setCurrentItem({});
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setCurrentItem({ ...item });
    setIsModalOpen(true);
  };

  const filtered = data.filter(item => 
    columns.some(col => 
      String(item[col.key] || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const renderCell = (item: any, col: Column) => {
    const value = item[col.key];
    
    if (col.badgeColors && value) {
        const colorClass = col.badgeColors[value] || 'bg-slate-100 text-slate-700';
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                {value}
            </span>
        );
    }
    
    if (col.type === 'textarea') {
        return <span className="block max-w-xs truncate" title={value}>{value}</span>;
    }

    return value;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                {title}
            </h2>
        </div>
        
        {hasWriteAccess && (
            <button 
                onClick={openAdd}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
                <Plus className="h-4 w-4" />
                <span>Thêm mới</span>
            </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                        {columns.map(col => (
                            <th key={col.key} className={`px-6 py-3 ${col.width || ''}`}>{col.label}</th>
                        ))}
                        {hasWriteAccess && <th className="px-6 py-3 text-right">Thao tác</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex justify-center items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Đang tải dữ liệu...
                                </div>
                            </td>
                        </tr>
                    ) : filtered.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-slate-500">
                                Chưa có dữ liệu
                            </td>
                        </tr>
                    ) : filtered.map((item, idx) => (
                        <tr key={item.id || idx} className="bg-white hover:bg-slate-50 transition-colors">
                            {columns.map(col => (
                                <td key={col.key} className="px-6 py-4">
                                    {renderCell(item, col)}
                                </td>
                            ))}
                            {hasWriteAccess && (
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => openEdit(item)}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setDeleteId(item.id);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Dynamic Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={currentItem.id ? `Cập nhật ${title}` : `Thêm mới ${title}`}
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            {columns.map(col => (
                <div key={col.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{col.label}</label>
                    {col.type === 'select' ? (
                        <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={currentItem[col.key] || ''}
                            onChange={e => setCurrentItem({...currentItem, [col.key]: e.target.value})}
                        >
                            <option value="">-- Chọn --</option>
                            {col.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : col.type === 'textarea' ? (
                        <textarea
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                             value={currentItem[col.key] || ''}
                             onChange={e => setCurrentItem({...currentItem, [col.key]: e.target.value})}
                             required
                        />
                    ) : (
                        <input 
                            type={col.type || 'text'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={currentItem[col.key] || ''}
                            onChange={e => setCurrentItem({...currentItem, [col.key]: e.target.value})}
                            required
                        />
                    )}
                </div>
            ))}

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
                    Lưu lại
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
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xoá dữ liệu này?</p>
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