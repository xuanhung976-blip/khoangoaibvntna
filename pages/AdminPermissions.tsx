
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Save, Loader2, AlertTriangle } from 'lucide-react';
import { RolePermission, Role, MODULE_NAMES } from '../types';
import { getPermissions, savePermissions } from '../services/dataService';
import { showToast } from '../components/Toast';

const toBool = (value: unknown) =>
  value === true || value === 'TRUE' || value === 'true' || value === '1' || value === 1;

export const AdminPermissions: React.FC = () => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPermissions();
      // Ensure we have entries for all modules/roles if fresh
      // This logic is partially handled in dataService mock init, but good to be robust
      setPermissions(data.map((p: RolePermission) => ({
        ...p,
        canView: toBool(p.canView),
        canAdd: toBool(p.canAdd),
        canEdit: toBool(p.canEdit),
        canDelete: toBool(p.canDelete),
      })));
    } catch (e) {
      showToast('Lỗi tải phân quyền', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (role: Role, module: string, field: keyof RolePermission, value: boolean) => {
      setPermissions(prev => {
          const newPerms = [...prev];
          const idx = newPerms.findIndex(p => p.role === role && p.module === module);
          
          if (idx > -1) {
              newPerms[idx] = { ...newPerms[idx], [field]: value };
          } else {
              // Create if missing (rare case)
              newPerms.push({
                  role, module, canView: false, canAdd: false, canEdit: false, canDelete: false,
                  [field]: value
              });
          }
          return newPerms;
      });
  };

  const handleSave = async () => {
      setSubmitting(true);
      try {
          await savePermissions(permissions);
          showToast('Đã lưu bảng phân quyền', 'success');
      } catch(e) {
          showToast('Lỗi lưu dữ liệu', 'error');
      } finally {
          setSubmitting(false);
      }
  };

  // Helper to get permission state safely
  const getP = (role: Role, module: string) => {
      return permissions.find(p => p.role === role && p.module === module) || {
          canView: false, canAdd: false, canEdit: false, canDelete: false
      };
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                    Ma trận Phân quyền
                </h2>
                <p className="text-sm text-slate-500">Kiểm soát quyền truy cập chi tiết cho từng chức năng</p>
            </div>
            <button 
                onClick={handleSave}
                disabled={submitting || loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm disabled:bg-slate-400"
            >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu Thay đổi
            </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
                <p className="font-bold">Lưu ý quan trọng:</p>
                <ul className="list-disc ml-4 space-y-1 mt-1">
                    <li><strong>Phụ trách khoa (CHIEF)</strong> mặc định có toàn quyền (Full Access), không hiển thị ở đây.</li>
                    <li>Quyền <strong>Delete (Xoá)</strong> nên hạn chế tối đa cho Nhân viên.</li>
                    <li>Thay đổi sẽ có hiệu lực ngay lập tức.</li>
                </ul>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
                <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                            <tr>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 w-1/3 bg-slate-200">Module / Chức năng</th>
                                <th colSpan={4} className="px-2 py-2 border-r border-slate-200 text-center bg-blue-50 text-blue-700">Điều dưỡng Trưởng</th>
                                <th colSpan={4} className="px-2 py-2 text-center bg-slate-50 text-slate-700">Nhân viên (BS/ĐD)</th>
                            </tr>
                            <tr>
                                {/* Head Nurse Header */}
                                <th className="px-2 py-2 border-b text-center w-16 bg-blue-50">Xem</th>
                                <th className="px-2 py-2 border-b text-center w-16 bg-blue-50">Thêm</th>
                                <th className="px-2 py-2 border-b text-center w-16 bg-blue-50">Sửa</th>
                                <th className="px-2 py-2 border-b border-r text-center w-16 bg-blue-50">Xoá</th>
                                
                                {/* Staff Header */}
                                <th className="px-2 py-2 border-b text-center w-16">Xem</th>
                                <th className="px-2 py-2 border-b text-center w-16">Thêm</th>
                                <th className="px-2 py-2 border-b text-center w-16">Sửa</th>
                                <th className="px-2 py-2 border-b text-center w-16">Xoá</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {MODULE_NAMES.map(mod => {
                                const headP = getP(Role.HEAD_NURSE, mod.id);
                                const staffP = getP(Role.STAFF, mod.id);

                                return (
                                    <tr key={mod.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium border-r border-slate-200">{mod.label}</td>
                                        
                                        {/* Head Nurse Cells */}
                                        <td className="text-center p-2 bg-blue-50/30"><input type="checkbox" checked={headP.canView} onChange={e=>handleChange(Role.HEAD_NURSE, mod.id, 'canView', e.target.checked)} className="w-4 h-4 accent-blue-600"/></td>
                                        <td className="text-center p-2 bg-blue-50/30"><input type="checkbox" checked={headP.canAdd} onChange={e=>handleChange(Role.HEAD_NURSE, mod.id, 'canAdd', e.target.checked)} className="w-4 h-4 accent-blue-600"/></td>
                                        <td className="text-center p-2 bg-blue-50/30"><input type="checkbox" checked={headP.canEdit} onChange={e=>handleChange(Role.HEAD_NURSE, mod.id, 'canEdit', e.target.checked)} className="w-4 h-4 accent-blue-600"/></td>
                                        <td className="text-center p-2 border-r border-slate-200 bg-blue-50/30"><input type="checkbox" checked={headP.canDelete} onChange={e=>handleChange(Role.HEAD_NURSE, mod.id, 'canDelete', e.target.checked)} className="w-4 h-4 accent-red-500"/></td>

                                        {/* Staff Cells */}
                                        <td className="text-center p-2"><input type="checkbox" checked={staffP.canView} onChange={e=>handleChange(Role.STAFF, mod.id, 'canView', e.target.checked)} className="w-4 h-4 accent-slate-600"/></td>
                                        <td className="text-center p-2"><input type="checkbox" checked={staffP.canAdd} onChange={e=>handleChange(Role.STAFF, mod.id, 'canAdd', e.target.checked)} className="w-4 h-4 accent-slate-600"/></td>
                                        <td className="text-center p-2"><input type="checkbox" checked={staffP.canEdit} onChange={e=>handleChange(Role.STAFF, mod.id, 'canEdit', e.target.checked)} className="w-4 h-4 accent-slate-600"/></td>
                                        <td className="text-center p-2"><input type="checkbox" checked={staffP.canDelete} onChange={e=>handleChange(Role.STAFF, mod.id, 'canDelete', e.target.checked)} className="w-4 h-4 accent-red-500"/></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
  );
};
