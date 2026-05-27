
import React, { useState, useEffect } from 'react';
import { AlertOctagon, Search, Plus, Trash2, Loader2, Star, Activity } from 'lucide-react';
import { VipPatient, Patient, Role } from '../types';
import { getVipPatients, getPatients, addVipPatient, removeVipPatient } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface Props {
  userRole: Role;
}

export const VipPatients: React.FC<Props> = ({ userRole }) => {
  const [vipPatients, setVipPatients] = useState<any[]>([]); // Use any to allow joined fields
  const [allPatients, setAllPatients] = useState<Patient[]>([]); // For selection dropdown
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVipData, setNewVipData] = useState({
      idBN: '',
      priority: 'Cao',
      reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getVipPatients();
      setVipPatients(data);
    } catch (e) {
      showToast('Lỗi tải danh sách VIP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = async () => {
      // Load all patients to select from
      setLoading(true);
      try {
          const all = await getPatients();
          // Filter out those already in VIP list
          const existingIds = vipPatients.map(v => v.patientId); // Note: using patientId from backend join
          
          // UPDATED LOGIC: 
          // Only show patients who are NOT in VIP list AND NOT Discharged (RaVien)
          setAllPatients(all.filter(p => !existingIds.includes(p.id) && p.status !== 'RaVien'));
          
          setNewVipData({ idBN: '', priority: 'Cao', reason: '' });
          setIsModalOpen(true);
      } catch (e) {
          showToast('Lỗi tải danh sách bệnh nhân', 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVipData.idBN || !newVipData.reason) {
        showToast('Vui lòng chọn bệnh nhân và nhập lý do', 'error');
        return;
    }
    
    setSubmitting(true);
    try {
        await addVipPatient(newVipData.idBN, newVipData.priority, newVipData.reason);
        showToast('Đã thêm bệnh nhân vào danh sách lưu ý', 'success');
        setIsModalOpen(false);
        loadData();
    } catch (e) {
        showToast('Lỗi khi thêm: ' + e, 'error');
    } finally {
        setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
      if(!confirm("Bạn có chắc muốn gỡ bỏ lưu ý cho bệnh nhân này?")) return;
      
      setSubmitting(true);
      try {
          await removeVipPatient(id);
          showToast('Đã gỡ bỏ lưu ý', 'success');
          loadData();
      } catch (e) {
          showToast('Lỗi khi xoá', 'error');
      } finally {
          setSubmitting(false);
      }
  };

  const filtered = vipPatients.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.patientId && p.patientId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <AlertOctagon className="h-6 w-6 text-purple-600" />
                Bệnh nhân cần Lưu ý (VIP)
            </h2>
            <p className="text-sm text-slate-500 mt-1">Danh sách bệnh nhân đặc biệt cần quan tâm chăm sóc</p>
        </div>
        
        <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
        >
            <Plus className="h-4 w-4" />
            <span>Thêm BN Lưu ý</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Tìm tên bệnh nhân..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
             </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                        <th className="px-6 py-3">Bệnh nhân</th>
                        <th className="px-6 py-3">Chẩn đoán</th>
                        <th className="px-6 py-3">Mức độ</th>
                        <th className="px-6 py-3">Lý do lưu ý</th>
                        <th className="px-6 py-3">Buồng/Giường</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-purple-500" /></td></tr>
                    ) : filtered.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chưa có bệnh nhân nào trong danh sách</td></tr>
                    ) : filtered.map(p => (
                        <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                    {p.name}
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{p.patientId}</div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate" title={p.diagnosis}>
                                {p.diagnosis || '-'}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    p.priority === 'Cao' ? 'bg-red-100 text-red-700' :
                                    p.priority === 'Trung bình' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {p.priority}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-800">
                                {p.reason}
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-mono text-slate-600 font-semibold">{p.room || '-'} / {p.bed || '-'}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => handleRemove(p.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Gỡ khỏi danh sách VIP"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Add VIP Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Thêm Bệnh nhân vào Danh sách Lưu ý"
      >
        <form onSubmit={handleSave} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chọn Bệnh nhân</label>
                <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    value={newVipData.idBN}
                    onChange={e => setNewVipData({...newVipData, idBN: e.target.value})}
                    required
                >
                    <option value="">-- Chọn bệnh nhân --</option>
                    {allPatients.map(p => (
                        <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Chỉ hiển thị bệnh nhân đang điều trị (chưa có trong danh sách lưu ý).</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mức độ ưu tiên</label>
                <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    value={newVipData.priority}
                    onChange={e => setNewVipData({...newVipData, priority: e.target.value})}
                >
                    <option value="Cao">Cao</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Thấp">Thấp</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lý do lưu ý / Yêu cầu</label>
                <textarea 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none min-h-[80px]"
                    placeholder="VD: Người nhà ban lãnh đạo, dị ứng thuốc đặc biệt..."
                    value={newVipData.reason}
                    onChange={e => setNewVipData({...newVipData, reason: e.target.value})}
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
                    className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-2"
                >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Lưu danh sách
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
};
