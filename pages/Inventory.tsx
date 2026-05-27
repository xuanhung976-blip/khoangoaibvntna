import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, AlertTriangle, Package, Loader2, MonitorSmartphone, Wrench } from 'lucide-react';
import { Medicine, MedicalEquipment, Role } from '../types';
import { getMedicines, addMedicine, updateMedicine, deleteMedicine, getEquipment, addEquipment, updateEquipment, deleteEquipment } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface InventoryProps {
  userRole: Role;
}

type Tab = 'medicines' | 'equipment';

export const Inventory: React.FC<InventoryProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<Tab>('medicines');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [equipment, setEquipment] = useState<MedicalEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Separate states for current items to maintain type safety
  const [currentMed, setCurrentMed] = useState<Partial<Medicine>>({});
  const [currentEq, setCurrentEq] = useState<Partial<MedicalEquipment>>({});
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Permission Checks
  const canEdit = [Role.CHIEF, Role.HEAD_NURSE, Role.STAFF].includes(userRole); // Staff can edit inventory
  const canDelete = userRole === Role.CHIEF;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'medicines') {
        const data = await getMedicines();
        setMedicines(data);
      } else {
        const data = await getEquipment();
        setEquipment(data);
      }
    } catch (e) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for Medicines ---
  const handleSaveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMed.name || !currentMed.expiryDate) {
        showToast('Vui lòng điền tên thuốc và hạn dùng', 'error');
        return;
    }
    setSubmitting(true);
    try {
        if (currentMed.id) {
            await updateMedicine(currentMed.id, currentMed);
            showToast('Cập nhật thuốc thành công', 'success');
        } else {
            await addMedicine(currentMed as any);
            showToast('Thêm thuốc mới thành công', 'success');
        }
        setIsModalOpen(false);
        loadData();
    } catch (e) {
        showToast('Lỗi: ' + e, 'error');
    } finally {
        setSubmitting(false);
    }
  };

  // --- Handlers for Equipment ---
  const handleSaveEq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEq.name || !currentEq.maintenanceCycle) {
        showToast('Vui lòng điền tên và chu kỳ kiểm định', 'error');
        return;
    }
    setSubmitting(true);
    try {
        if (currentEq.id) {
            await updateEquipment(currentEq.id, currentEq);
            showToast('Cập nhật thiết bị thành công', 'success');
        } else {
            await addEquipment(currentEq as any);
            showToast('Thêm thiết bị mới thành công', 'success');
        }
        setIsModalOpen(false);
        loadData();
    } catch (e) {
        showToast('Lỗi: ' + e, 'error');
    } finally {
        setSubmitting(false);
    }
  };

  // --- Common Delete Handler ---
  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
        if (activeTab === 'medicines') {
            await deleteMedicine(deleteId);
        } else {
            await deleteEquipment(deleteId);
        }
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
    if (activeTab === 'medicines') {
        setCurrentMed({ name: '', quantity: 0, unit: 'Viên', expiryDate: '' });
    } else {
        setCurrentEq({ 
            condition: 'Normal', 
            maintenanceCycle: 12,
            lastMaintenanceDate: new Date().toISOString().split('T')[0]
        });
    }
    setIsModalOpen(true);
  };

  const openEditMed = (m: Medicine) => { setCurrentMed({ ...m }); setIsModalOpen(true); };
  const openEditEq = (e: MedicalEquipment) => { setCurrentEq({ ...e }); setIsModalOpen(true); };

  // --- Logic Helpers ---
  const getNextMaintenanceDate = (lastDate: string, cycleMonths: number) => {
      if(!lastDate || !cycleMonths) return null;
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + cycleMonths);
      return d;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                Kho Dược & Vật tư Y tế
            </h2>
            <p className="text-sm text-slate-500 mt-1">Quản lý thuốc, vật tư tiêu hao và trang thiết bị</p>
        </div>
        
        {canEdit && (
            <button 
                onClick={openAdd}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
                <Plus className="h-4 w-4" />
                <span>Thêm Mới</span>
            </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
          <div className="flex gap-8">
              <button 
                onClick={() => setActiveTab('medicines')}
                className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'medicines' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                  <Package className="h-4 w-4" /> Thuốc & Vật tư
              </button>
              <button 
                onClick={() => setActiveTab('equipment')}
                className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'equipment' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                  <MonitorSmartphone className="h-4 w-4" /> Thiết bị Y tế
              </button>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder={activeTab === 'medicines' ? "Tìm tên thuốc..." : "Tìm tên thiết bị, mã..."} 
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
                    {activeTab === 'medicines' ? (
                        <tr>
                            <th className="px-6 py-3">Tên Thuốc</th>
                            <th className="px-6 py-3">Hàm lượng</th>
                            <th className="px-6 py-3">Tồn kho</th>
                            <th className="px-6 py-3">Hạn dùng</th>
                            <th className="px-6 py-3">Trạng thái</th>
                            {canEdit && <th className="px-6 py-3 text-right">Thao tác</th>}
                        </tr>
                    ) : (
                        <tr>
                            <th className="px-6 py-3">Thiết bị</th>
                            <th className="px-6 py-3">Mã TB</th>
                            <th className="px-6 py-3">Phụ trách</th>
                            <th className="px-6 py-3">Kiểm định kế tiếp</th>
                            <th className="px-6 py-3">Trạng thái</th>
                            {canEdit && <th className="px-6 py-3 text-right">Thao tác</th>}
                        </tr>
                    )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : activeTab === 'medicines' ? (
                        // MEDICINES ROWS
                        medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                             <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chưa có dữ liệu thuốc</td></tr>
                        ) : medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).map(item => {
                            const isExpired = new Date(item.expiryDate) < new Date();
                            const isNearExpiry = !isExpired && new Date(item.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
                            const isLowStock = item.quantity < 10;

                            return (
                                <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{item.content}</td>
                                    <td className="px-6 py-4">
                                        <span className={`font-semibold ${isLowStock ? 'text-orange-600' : 'text-blue-600'}`}>{item.quantity}</span> {item.unit}
                                    </td>
                                    <td className="px-6 py-4">{item.expiryDate}</td>
                                    <td className="px-6 py-4">
                                        {isExpired ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Hết hạn
                                            </span>
                                        ) : isNearExpiry ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                Cận hạn
                                            </span>
                                        ) : isLowStock ? (
                                             <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                Sắp hết
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Bình thường
                                            </span>
                                        )}
                                    </td>
                                    {canEdit && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEditMed(item)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                                                {canDelete && <button onClick={() => { setDeleteId(item.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })
                    ) : (
                        // EQUIPMENT ROWS
                        equipment.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chưa có dữ liệu thiết bị</td></tr>
                        ) : equipment.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase())).map(item => {
                            const nextDate = getNextMaintenanceDate(item.lastMaintenanceDate, item.maintenanceCycle);
                            const nextDateStr = nextDate ? nextDate.toISOString().split('T')[0] : '';
                            
                            const isOverdue = nextDate && nextDate < new Date();
                            const isNearDue = nextDate && !isOverdue && nextDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                            const isRepairing = item.condition === 'Repairing' || item.condition === 'Broken';

                            return (
                                <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {item.name}
                                        {item.notes && <div className="text-xs text-slate-500 font-normal italic">{item.notes}</div>}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">{item.code}</td>
                                    <td className="px-6 py-4">{item.inCharge}</td>
                                    <td className="px-6 py-4">
                                        {nextDate ? nextDate.toLocaleDateString('vi-VN') : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                         {isRepairing ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                                                <Wrench className="h-3 w-3" /> Đang sửa
                                            </span>
                                        ) : isOverdue ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <AlertTriangle className="h-3 w-3" /> Quá hạn
                                            </span>
                                        ) : isNearDue ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                Sắp đến hạn
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Còn hạn
                                            </span>
                                        )}
                                    </td>
                                    {canEdit && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEditEq(item)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                                                {canDelete && <button onClick={() => { setDeleteId(item.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODAL: MEDICINE */}
      <Modal 
        isOpen={isModalOpen && activeTab === 'medicines'} 
        onClose={() => setIsModalOpen(false)}
        title={currentMed.id ? "Cập nhật Thuốc" : "Thêm Thuốc Mới"}
      >
        <form onSubmit={handleSaveMed} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên thuốc <span className="text-red-500">*</span></label>
                <input required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentMed.name || ''} onChange={e => setCurrentMed({...currentMed, name: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hàm lượng / Dạng bào chế</label>
                <input className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentMed.content || ''} onChange={e => setCurrentMed({...currentMed, content: e.target.value})} placeholder="VD: 500mg - Viên nén" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số lượng</label>
                    <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentMed.quantity || ''} onChange={e => setCurrentMed({...currentMed, quantity: Number(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị tính</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentMed.unit || ''} onChange={e => setCurrentMed({...currentMed, unit: e.target.value})} placeholder="Viên, Lọ..." />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hạn sử dụng <span className="text-red-500">*</span></label>
                <input type="date" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentMed.expiryDate || ''} onChange={e => setCurrentMed({...currentMed, expiryDate: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentMed.notes || ''} onChange={e => setCurrentMed({...currentMed, notes: e.target.value})} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Hủy</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Lưu
                </button>
            </div>
        </form>
      </Modal>

      {/* MODAL: EQUIPMENT */}
      <Modal 
        isOpen={isModalOpen && activeTab === 'equipment'} 
        onClose={() => setIsModalOpen(false)}
        title={currentEq.id ? "Cập nhật Thiết bị" : "Thêm Thiết bị Mới"}
      >
        <form onSubmit={handleSaveEq} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên thiết bị <span className="text-red-500">*</span></label>
                <input required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentEq.name || ''} onChange={e => setCurrentEq({...currentEq, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã thiết bị</label>
                    <input className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentEq.code || ''} onChange={e => setCurrentEq({...currentEq, code: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Người phụ trách</label>
                    <input className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentEq.inCharge || ''} onChange={e => setCurrentEq({...currentEq, inCharge: e.target.value})} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày mua</label>
                    <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentEq.purchaseDate || ''} onChange={e => setCurrentEq({...currentEq, purchaseDate: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kiểm định gần nhất</label>
                    <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentEq.lastMaintenanceDate || ''} onChange={e => setCurrentEq({...currentEq, lastMaintenanceDate: e.target.value})} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chu kỳ kiểm định (tháng)</label>
                    <input type="number" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentEq.maintenanceCycle || 12} onChange={e => setCurrentEq({...currentEq, maintenanceCycle: Number(e.target.value)})} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tình trạng</label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentEq.condition || 'Normal'} onChange={e => setCurrentEq({...currentEq, condition: e.target.value as any})}>
                        <option value="Normal">Bình thường</option>
                        <option value="Broken">Hỏng</option>
                        <option value="Repairing">Đang sửa</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú tình trạng</label>
                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={currentEq.notes || ''} onChange={e => setCurrentEq({...currentEq, notes: e.target.value})} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
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