
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Search, Trash2, Edit2, Loader2, BedDouble, UserCheck, Syringe, Hash, Star, Activity, Printer, Phone, Filter, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import { Patient, User, APP_LOGO_URL } from '../types';
import { getPatients, addPatient, updatePatient, deletePatient, getDoctorsList, getVipPatients } from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { getAge, exportToExcel } from '../utils/exportUtils';

interface ClinicalProps {
  user: User;
}

// Sub-component for Tabs in Add/Edit Modal
const ModalTabs = ({ active, onChange }: { active: string, onChange: (t: string) => void }) => (
    <div className="flex border-b border-slate-200 mb-4">
        <button 
            type="button"
            onClick={() => onChange('general')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${active === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Hành chính
        </button>
        <button 
            type="button"
            onClick={() => onChange('clinical')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${active === 'clinical' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Lâm sàng
        </button>
        <button 
            type="button"
            onClick={() => onChange('surgery')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${active === 'surgery' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Phẫu thuật
        </button>
    </div>
);

const getSessionCache = <T,>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const Clinical: React.FC<ClinicalProps> = ({ user }) => {
  const [patients, setPatients] = useState<Patient[]>(() => getSessionCache('cache_clinical_patients', []));
  const [vipIds, setVipIds] = useState<Set<string>>(() => new Set(getSessionCache('cache_clinical_vip_ids', [])));
  const [doctors, setDoctors] = useState<{id: string, fullName: string}[]>(() => getSessionCache('cache_clinical_doctors', []));
  const [loading, setLoading] = useState<boolean>(() => getSessionCache('cache_clinical_patients', []).length === 0);
  
  // Guard: prevent concurrent fetches from creating duplicate rows
  const isFetchingRef = useRef(false);
  // Track fetch sequence to discard stale responses
  const fetchSeqRef = useRef(0);

  // --- FILTERS & SORT STATE ---
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterRoom, setFilterRoom] = useState<string>('All');
  const [filterDoctor, setFilterDoctor] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{key: 'date'|'name', dir: 'asc'|'desc'}>({ key: 'date', dir: 'desc' });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Partial<Patient>>({});
  const [modalTab, setModalTab] = useState('general'); // general | clinical | surgery
  
  // Detail View State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canAdd = true;
  const canEdit = true;
  const canDelete = true;
  const TOTAL_BEDS = 27;

  const loadData = useCallback(async (options?: { bypassCache?: boolean }) => {
    // Prevent concurrent fetches — skip if already in progress
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Increment sequence so stale responses are discarded
    const seq = ++fetchSeqRef.current;

    // Show spinner only if we don't have any cached data yet
    if (patients.length === 0 || options?.bypassCache) {
      setLoading(true);
    }

    try {
      // Load patients first (critical path), then vips lazily
      const rawData = await getPatients(options);

      // Discard if a newer fetch was triggered while awaiting
      if (seq !== fetchSeqRef.current) return;

      // Normalize IDs to string and deduplicate by ID (prevents duplicate rows)
      const seen = new Set<string>();
      const normalizedData = (rawData as Patient[])
          .filter(p => {
              if (!p || !p.id) return false; // discard blank rows
              const pid = String(p.id).trim();
              if (!pid || seen.has(pid)) return false;
              seen.add(pid);
              return true;
          })
          .map(p => ({ ...p, id: String(p.id).trim() }));

      setPatients(normalizedData);
      try {
        sessionStorage.setItem('cache_clinical_patients', JSON.stringify(normalizedData));
      } catch { /* storage full fallback */ }

      // Load VIPs asynchronously — do not block patient list rendering
      getVipPatients(options).then((vips: any[]) => {
          if (seq !== fetchSeqRef.current) return;
          const vipArray = (vips || []).map((v: any) => String(v.patientId).trim());
          setVipIds(new Set(vipArray));
          try {
            sessionStorage.setItem('cache_clinical_vip_ids', JSON.stringify(vipArray));
          } catch { /* fallback */ }
      }).catch(() => { /* VIP load failure is non-critical */ });

    } catch (e) {
      if (seq === fetchSeqRef.current) {
          showToast('Lỗi tải dữ liệu bệnh nhân', 'error');
      }
    } finally {
      if (seq === fetchSeqRef.current) {
          setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [patients.length]);

  const loadDoctors = async (options?: { bypassCache?: boolean }) => {
      try {
          const list = await getDoctorsList(options as any);
          setDoctors(list);
          try {
            sessionStorage.setItem('cache_clinical_doctors', JSON.stringify(list));
          } catch { /* fallback */ }
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadData();
    loadDoctors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString?: string) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const calculateTreatmentDays = (p: Patient) => {
    if (!p.admissionDate) return '-';
    
    // Normalize dates to noon to avoid timezone overflow issues
    const start = new Date(p.admissionDate);
    start.setHours(12, 0, 0, 0);
    
    let end = new Date(); // Default to today
    
    if (p.status === 'RaVien') {
        if (p.dischargeDate) {
            end = new Date(p.dischargeDate);
        } else {
            return '-'; // Discharged but unknown date
        }
    }
    end.setHours(12, 0, 0, 0);
    
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // Helper to normalize room strings for consistent filtering
  // Handles mixed types (number in DB vs string in filter) and whitespace
  const normalizeRoom = (val: any): string => {
      if (val === null || val === undefined) return '';
      return String(val).trim();
  };

  // --- DYNAMIC FILTER OPTIONS ---
  const uniqueRooms = useMemo(() => {
      // Normalize rooms to ensure 201 (number) and "201 " (string) are merged
      const rooms = new Set(patients.map(p => normalizeRoom(p.room)).filter(r => r !== ''));
      // Sort alphanumerically (numeric: true handles 2, 10 correctly)
      return Array.from(rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [patients]);

  const uniqueDoctors = useMemo(() => {
      // Use active treating doctors from data + fallback to system doctor list
      const activeDocs = new Set(patients.map(p => p.treatingDoctor).filter(Boolean));
      return Array.from(activeDocs).sort();
  }, [patients]);

  // --- LAYER 1: FILTER LOGIC ---
  const filteredPatients = useMemo(() => {
      let result = patients;

      // 1. Status Filter (Tabs)
      if (filterStatus === 'RaVien') {
          result = result.filter(p => p.status === 'RaVien');
      } else if (filterStatus === 'All') {
          result = result.filter(p => p.status !== 'RaVien');
      } else {
          result = result.filter(p => p.status === filterStatus);
      }

      // 2. Room Filter
      if (filterRoom !== 'All') {
          const target = normalizeRoom(filterRoom);
          result = result.filter(p => {
              const pRoom = normalizeRoom(p.room);
              // Debug log to verify normalization (Dev Only)
              // if (pRoom.includes('201')) console.log(`Comparing Room: '${p.room}' -> '${pRoom}' vs Filter: '${target}'`);
              return pRoom === target;
          });
      }

      // 3. Doctor Filter
      if (filterDoctor !== 'All') {
          result = result.filter(p => p.treatingDoctor === filterDoctor);
      }

      // 4. Search Filter
      if (search) {
          const s = search.toLowerCase();
          result = result.filter(p => 
              p.name.toLowerCase().includes(s) || 
              p.id.toLowerCase().includes(s) || 
              (p.diagnosis || '').toLowerCase().includes(s)
          );
      }

      return result;
  }, [patients, filterStatus, filterRoom, filterDoctor, search]);

  // --- LAYER 2: SORT LOGIC ---
  const sortedPatients = useMemo(() => {
      // Sort applies to the Filtered Result
      // Create a shallow copy to sort without mutating
      return [...filteredPatients].sort((a, b) => {
          // Priority 1: VIP Always on Top
          const isAVip = vipIds.has(a.id) ? 1 : 0;
          const isBVip = vipIds.has(b.id) ? 1 : 0;
          if (isAVip !== isBVip) return isBVip - isAVip;

          // Priority 2: User Selected Sort
          if (sortConfig.key === 'date') {
              // Date Sort
              const dateA = a.admissionDate ? new Date(a.admissionDate).getTime() : 0;
              const dateB = b.admissionDate ? new Date(b.admissionDate).getTime() : 0;
              return sortConfig.dir === 'asc' ? dateA - dateB : dateB - dateA;
          } else {
              // Name Sort
              return sortConfig.dir === 'asc' 
                  ? a.name.localeCompare(b.name) 
                  : b.name.localeCompare(a.name);
          }
      });
  }, [filteredPatients, sortConfig, vipIds]);

  // --- STATS ---
  const activePatientsCount = patients.filter(p => p.status !== 'RaVien').length;
  const availableBeds = TOTAL_BEDS - activePatientsCount;
  const occupancyRate = Math.round((activePatientsCount / TOTAL_BEDS) * 100);

  // --- HANDLERS ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && !canEdit) {
        showToast('Ban khong co quyen sua ho so benh nhan', 'error');
        return;
    }
    if (!isEditing && !canAdd) {
        showToast('Ban khong co quyen them benh nhan', 'error');
        return;
    }
    
    // 1. Sanitize Inputs
    const safeId = (currentPatient.id || '').trim();
    const safeName = (currentPatient.name || '').trim();
    const safeDiagnosis = (currentPatient.diagnosis || '').trim();

    // 2. Validate Required Fields
    if (!safeId) { showToast('Vui lòng nhập Mã Bệnh Nhân (ID)', 'error'); setModalTab('general'); return; }
    if (!safeName) { showToast('Vui lòng nhập Họ tên', 'error'); setModalTab('general'); return; }
    if (!currentPatient.gender) { showToast('Vui lòng chọn Giới tính', 'error'); setModalTab('general'); return; }
    if (!currentPatient.treatmentType) { showToast('Vui lòng chọn Phân loại (Nội/Ngoại)', 'error'); setModalTab('clinical'); return; }
    if (!safeDiagnosis) { showToast('Vui lòng nhập Chẩn đoán', 'error'); setModalTab('clinical'); return; }

    // 3. Prepare Payload
    const isRfa = (currentPatient.interventionType === 'RFA') || (currentPatient.surgeryMethod || '').toLowerCase().includes('rfa');
    const derivedActivityType = isRfa ? 'Thủ thuật' : (currentPatient.surgeryMethod || currentPatient.interventionType) ? 'Phẫu thuật' : currentPatient.activityType;
    const effectiveActualSurgeryDate = currentPatient.actualSurgeryDate || currentPatient.surgeryDate || '';

    const patientData = { 
        ...currentPatient, 
        id: safeId, 
        name: safeName, 
        diagnosis: safeDiagnosis,
        actualSurgeryDate: effectiveActualSurgeryDate,
        activityType: derivedActivityType,
        // Ensure critical defaults if missing
        status: currentPatient.status || 'ChoMo',
        admissionDate: currentPatient.admissionDate || new Date().toISOString().split('T')[0]
    };

    setSubmitting(true);
    try {
        if (isEditing) {
            // === UPDATE FLOW ===
            await updatePatient(safeId, patientData);
            showToast('Cập nhật hồ sơ thành công', 'success');
        } else {
            // === ADD FLOW ===
            // Optimistic duplicate check
            if (patients.some(p => p.id.toLowerCase() === safeId.toLowerCase())) {
                showToast(`Mã bệnh nhân "${safeId}" đã tồn tại!`, 'error');
                setSubmitting(false);
                return;
            }
            await addPatient(patientData as any);
            showToast('Tiếp nhận bệnh nhân thành công', 'success');
        }
        setIsModalOpen(false);
        loadData({ bypassCache: true });
    } catch (e: any) {
        showToast('Lỗi: ' + (e.message || e), 'error');
    } finally {
        setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
        await deletePatient(deleteId);
        showToast('Đã xoá hồ sơ bệnh nhân', 'success');
        setIsDeleteModalOpen(false);
        loadData({ bypassCache: true });
    } catch (e: any) {
        showToast('Lỗi xoá: ' + (e.message || e), 'error');
    } finally {
        setSubmitting(false);
        setDeleteId(null);
    }
  };

  const handleExportExcel = () => {
      if (sortedPatients.length === 0) {
          showToast('Không có dữ liệu để xuất Excel', 'warning');
          return;
      }

      const statusMap: Record<string, string> = {
          'All': 'TỔNG HỢP (NỘI TRÚ)',
          'ChoMo': 'CHỜ MỔ',
          'DaDuyet': 'ĐÃ DUYỆT MỔ',
          'DaMo': 'HẬU PHẪU',
          'DieuTri': 'ĐIỀU TRỊ NỘI KHOA',
          'RaVien': 'ĐÃ RA VIỆN'
      };
      const statusText = statusMap[filterStatus] || 'TỔNG HỢP';
      const dateStr = new Date().toLocaleDateString('vi-VN');

      const headers = [
          'STT',
          'Mã BN',
          'Họ và tên',
          'Tuổi',
          'GT',
          'Phòng / Giường',
          'Chẩn đoán',
          'BS Điều trị',
          'SĐT',
          'Ghi chú'
      ];

      const rows = sortedPatients.map((p, index) => [
          index + 1,
          p.id || '',
          p.name || '',
          getAge(p.dob),
          p.gender || '',
          `${p.room || '-'}${p.bed ? ` / ${p.bed}` : ''}`,
          p.diagnosis || '',
          p.treatingDoctor ? p.treatingDoctor.split('.').pop()?.trim() : '-',
          p.phoneNumber || '',
          p.notes || ''
      ]);

      exportToExcel({
          fileName: `Danh_Sach_Benh_Nhan_${filterStatus}_${new Date().toISOString().split('T')[0]}.xlsx`,
          sheetName: 'DS Bệnh nhân',
          title: `DANH SÁCH BỆNH NHÂN ${statusText}`,
          subtitle: `Ngày in: ${dateStr} (Tổng số: ${sortedPatients.length} bệnh nhân)`,
          headers,
          rows,
          signers: ['NGƯỜI LẬP BIỂU'],
          creatorName: user.fullName
      });

      showToast('Đã xuất file Excel thành công', 'success');
  };

  const handlePrintList = () => {
      // Use sortedPatients for Print
      if (sortedPatients.length === 0) {
          showToast('Không có dữ liệu để in', 'warning');
          return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          showToast('Vui lòng cho phép popup để in danh sách', 'error');
          return;
      }

      const statusMap: Record<string, string> = {
          'All': 'TỔNG HỢP (NỘI TRÚ)',
          'ChoMo': 'CHỜ MỔ',
          'DaDuyet': 'ĐÃ DUYỆT MỔ',
          'DaMo': 'HẬU PHẪU',
          'DieuTri': 'ĐIỀU TRỊ NỘI KHOA',
          'RaVien': 'ĐÃ RA VIỆN'
      };
      const statusText = statusMap[filterStatus] || 'TỔNG HỢP';
      const dateStr = new Date().toLocaleDateString('vi-VN');

      const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Danh sách Bệnh nhân - Khoa Ngoại</title>
            <style>
                @page { size: A4 landscape; margin: 6mm 8mm; }
                * { box-sizing: border-box; }
                body { font-family: 'Times New Roman', serif; margin: 0; padding: 10px; font-size: 10.5pt; color: #000; background: #fff; width: 100%; }
                h1, h2, h3, h4, p { margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
                th, td { border: 1px solid #000; padding: 5px 6px; font-size: 10pt; vertical-align: middle; word-wrap: break-word; overflow-wrap: break-word; }
                th { background-color: #f2f2f2 !important; font-weight: bold; text-align: center; padding: 7px 5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
                .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
                .hospital { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
                .dept { font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #222; }
                .title { font-size: 15pt; font-weight: bold; text-transform: uppercase; text-align: center; margin-top: 8px; }
                .date { font-style: italic; font-size: 10pt; text-align: center; margin-bottom: 8px; }
                .text-center { text-align: center; }
                .footer { margin-top: 25px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
                .sign-box { text-align: center; min-width: 220px; }
                .sign-title { font-weight: bold; margin-bottom: 50px; font-size: 10.5pt; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${APP_LOGO_URL}" alt="" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" />
                    <div>
                        <div class="hospital">BỆNH VIỆN NỘI TIẾT NGHỆ AN</div>
                        <div class="dept">KHOA NGOẠI TỔNG HỢP</div>
                    </div>
                </div>
                <div style="text-align: right; font-size: 9.5pt; font-style: italic;">
                    Hệ thống Quản lý Bệnh nhân
                </div>
            </div>

            <div class="title">DANH SÁCH BỆNH NHÂN ${statusText}</div>
            <div class="date">Ngày in: ${dateStr} (Tổng số: ${sortedPatients.length} bệnh nhân)</div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 4%;">STT</th>
                        <th style="width: 9%;">Mã BN</th>
                        <th style="width: 17%;">Họ và tên</th>
                        <th style="width: 6%;">Tuổi</th>
                        <th style="width: 5%;">GT</th>
                        <th style="width: 10%;">P / Giường</th>
                        <th style="width: 26%;">Chẩn đoán</th>
                        <th style="width: 14%;">BS Điều trị</th>
                        <th style="width: 9%;">SĐT</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedPatients.map((p, index) => `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td class="text-center"><b>${p.id}</b></td>
                            <td><b>${p.name}</b></td>
                            <td class="text-center">${getAge(p.dob)}</td>
                            <td class="text-center">${p.gender}</td>
                            <td class="text-center">${p.room || '-'}${p.bed ? ` / ${p.bed}` : ''}</td>
                            <td>${p.diagnosis || '-'}</td>
                            <td>${p.treatingDoctor ? p.treatingDoctor.split('.').pop()?.trim() : '-'}</td>
                            <td class="text-center">${p.phoneNumber || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <div class="sign-box">
                    <p style="font-style: italic">Ngày ..... tháng ..... năm .....</p>
                    <div class="sign-title">NGƯỜI LẬP BIỂU</div>
                    <p><b>${user.fullName}</b></p>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
  };

  const openAdd = () => {
    if (!canAdd) {
        showToast('Ban khong co quyen them benh nhan', 'error');
        return;
    }
    setCurrentPatient({ 
        id: '', 
        name: '',
        diagnosis: '',
        room: '',
        bed: '',
        phoneNumber: '',
        treatmentType: 'Ngoai', 
        status: 'ChoMo', 
        gender: 'Nam',
        admissionDate: new Date().toISOString().split('T')[0],
        treatingDoctor: user.nhomChuyenMon === 'BS' ? user.fullName : ''
    });
    setModalTab('general');
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEdit = (p: Patient) => {
    if (!canEdit) {
        showToast('Ban khong co quyen sua ho so benh nhan', 'error');
        return;
    }
    const method = (p.surgeryMethod || p.notes || '').toLowerCase();
    const diag = (p.diagnosis || '').toLowerCase();
    const rawIType = (p.interventionType || '').trim();
    const iTypeUpper = rawIType.toUpperCase();

    const isRfa =
      iTypeUpper.includes('RFA') ||
      p.activityType === 'Thủ thuật' ||
      method.includes('rfa') ||
      diag.includes('rfa');

    let autoActualDate = p.actualSurgeryDate || p.surgeryDate || p.admissionDate || '';
    let autoActivityType = p.activityType;
    let autoInterventionType = p.interventionType;
    let autoClassification = p.surgeryClassification;

    if (isRfa) {
      autoActivityType = 'Thủ thuật';
      if (!autoInterventionType) autoInterventionType = 'RFA';
      if (!autoClassification) autoClassification = 'Đặc biệt';
    } else {
      if (p.surgeryMethod || p.interventionType) {
        autoActivityType = 'Phẫu thuật';
      }
      if (!autoInterventionType && method) {
        if (method.includes('toetva')) autoInterventionType = 'TOETVA';
        else if (diag.includes('k giáp') || method.includes('k giáp') || method.includes('ung thư')) autoInterventionType = 'Mổ K tuyến giáp';
        else if (diag.includes('basedow') || method.includes('basedow')) autoInterventionType = 'Basedow';
        else if (method.includes('giao cảm') || method.includes('đốt hạch') || method.includes('ets')) autoInterventionType = 'PTNS đốt hạch giao cảm';
        else if (diag.includes('lành') || method.includes('thuỳ') || method.includes('nhân')) autoInterventionType = 'Cắt 1 thuỳ tuyến giáp';
      }

      if (!autoClassification && method) {
        if (
          method.includes('nạo hạch') ||
          method.includes('tbtg nạo hạch') ||
          iTypeUpper.includes('NẠO HẠCH') ||
          (method.includes('toetva') && (method.includes('nạo hạch') || method.includes('tbtg')))
        ) {
          autoClassification = 'Đặc biệt';
        } else if (
          method.includes('toetva') ||
          diag.includes('k giáp') ||
          method.includes('k giáp') ||
          method.includes('giao cảm') ||
          method.includes('đốt hạch') ||
          method.includes('ets') ||
          diag.includes('basedow') ||
          method.includes('basedow')
        ) {
          autoClassification = 'Loại I';
        } else {
          autoClassification = 'Loại II';
        }
      }
    }

    setCurrentPatient({
      ...p,
      actualSurgeryDate: autoActualDate,
      activityType: autoActivityType,
      interventionType: autoInterventionType,
      surgeryClassification: autoClassification,
    });
    setModalTab('general');
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // ... (Render Helpers)
  const handleRowClick = (p: Patient, e: React.MouseEvent) => {
      if (window.getSelection()?.toString()) return;
      setSelectedPatient(p);
  };

  const switchToEditFromDetail = () => {
      if (selectedPatient) {
          openEdit(selectedPatient);
          setSelectedPatient(null);
      }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string, color: string }> = {
        'ChoMo': { label: 'Chờ mổ', color: 'bg-amber-100 text-amber-800' },
        'DaDuyet': { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-800' },
        'DaMo': { label: 'Hậu phẫu', color: 'bg-purple-100 text-purple-800' },
        'DieuTri': { label: 'Điều trị', color: 'bg-sky-100 text-sky-800' },
        'RaVien': { label: 'Ra viện', color: 'bg-slate-100 text-slate-500' },
    };
    const conf = map[status] || { label: status, color: 'bg-slate-100' };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${conf.color}`}>{conf.label}</span>;
  };

  const DetailSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Icon className="h-4 w-4 text-blue-600" /> {title}
          </h4>
          <div className="space-y-2 text-sm">
              {children}
          </div>
      </div>
  );

  const InfoRow = ({ label, value, fullWidth = false }: { label: string, value: any, fullWidth?: boolean }) => (
      <div className={`${fullWidth ? 'col-span-2' : ''}`}>
          <span className="text-slate-500 block text-xs">{label}</span>
          <span className="font-medium text-slate-800">{value || '-'}</span>
      </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Stats */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Quản lý Bệnh nhân</h2>
            <p className="text-sm text-slate-500 mt-1">Khoa Ngoại Tổng Hợp</p>
        </div>
        
        {/* Capacity Card */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 min-w-[280px]">
            <div className={`p-3 rounded-full ${availableBeds < 3 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                <BedDouble className="h-6 w-6" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Công suất giường</span>
                    <span className={`text-sm font-bold ${availableBeds < 3 ? 'text-red-600' : 'text-slate-800'}`}>
                        {activePatientsCount}/{TOTAL_BEDS}
                    </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 ${availableBeds < 3 ? 'bg-red-500' : 'bg-blue-500'}`} 
                        style={{ width: `${Math.min(100, occupancyRate)}%` }}
                    />
                </div>
                <div className="text-xs text-slate-400 mt-1 text-right">Còn trống: {Math.max(0, availableBeds)}</div>
            </div>
        </div>
      </div>

      {/* 2. Controls & Search - UPDATED WITH FILTERS */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
         
         <div className="flex flex-col md:flex-row gap-4">
             {/* Search Input */}
             <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Tìm tên, mã BN, chẩn đoán..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
             </div>

             {/* Action Buttons */}
             <div className="flex gap-2 shrink-0">
                 <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
                 >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="hidden sm:inline">Xuất Excel</span>
                 </button>

                 <button 
                    onClick={handlePrintList}
                    className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm font-medium text-sm"
                 >
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">In DS</span>
                 </button>

                 {canAdd && (
                    <button 
                        onClick={openAdd}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Tiếp nhận</span>
                    </button>
                 )}
             </div>
         </div>

         {/* Advanced Filters Row */}
         <div className="flex flex-col sm:flex-row gap-3 items-center">
             <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                 <Filter className="h-4 w-4" /> Lọc:
             </div>
             
             {/* Filter Room */}
             <select 
                className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterRoom}
                onChange={e => setFilterRoom(e.target.value)}
             >
                 <option value="All">Tất cả phòng</option>
                 {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
             </select>

             {/* Filter Doctor */}
             <select 
                className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterDoctor}
                onChange={e => setFilterDoctor(e.target.value)}
             >
                 <option value="All">Tất cả bác sĩ</option>
                 {uniqueDoctors.map(d => <option key={d} value={d}>{d}</option>)}
             </select>

             <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-0 sm:ml-4">
                 <ArrowUpDown className="h-4 w-4" /> Sắp xếp:
             </div>

             {/* Sort Control */}
             <select 
                className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={`${sortConfig.key}-${sortConfig.dir}`}
                onChange={e => {
                    const [key, dir] = e.target.value.split('-');
                    setSortConfig({ key: key as any, dir: dir as any });
                }}
             >
                 <option value="date-desc">Mới vào viện (Mới ➜ Cũ)</option>
                 <option value="date-asc">Vào viện lâu (Cũ ➜ Mới)</option>
                 <option value="name-asc">Tên (A ➜ Z)</option>
                 <option value="name-desc">Tên (Z ➜ A)</option>
             </select>
         </div>
      </div>

      {/* 3. Filter Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto scrollbar-hide">
          <div className="flex gap-6 min-w-max pb-1">
             {['All', 'ChoMo', 'DaDuyet', 'DaMo', 'DieuTri', 'RaVien'].map(statusKey => (
                 <button
                    key={statusKey}
                    onClick={() => setFilterStatus(statusKey)}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors px-1 ${
                        filterStatus === statusKey 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                 >
                    {{
                        'All': 'Tất cả',
                        'ChoMo': 'Chờ mổ',
                        'DaDuyet': 'Đã duyệt',
                        'DaMo': 'Hậu phẫu',
                        'DieuTri': 'Nội khoa',
                        'RaVien': 'Ra viện'
                    }[statusKey]}
                 </button>
             ))}
          </div>
      </div>
      
      {/* 4. Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap w-28">Mã BN</th>
                        <th className="px-4 py-3 font-semibold w-48">Họ Tên / Tuổi</th>
                        <th className="px-4 py-3 font-semibold w-24">Phòng</th>
                        <th className="px-4 py-3 font-semibold w-32">Bác sĩ ĐT</th>
                        <th className="px-4 py-3 font-semibold w-24 text-center">Ngày ĐT</th>
                        <th className="px-4 py-3 font-semibold">Chẩn đoán</th>
                        <th className="px-4 py-3 font-semibold w-32">Trạng thái</th>
                        <th className="px-4 py-3 text-right font-semibold w-24">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={8} className="px-6 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : sortedPatients.length === 0 ? (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">Không tìm thấy bệnh nhân nào.</td></tr>
                    ) : sortedPatients.map(p => (
                        <tr 
                            key={p.id} 
                            onClick={(e) => handleRowClick(p, e)}
                            className={`hover:bg-slate-50 transition-colors group cursor-pointer ${vipIds.has(p.id) ? 'bg-yellow-50/30' : 'bg-white'}`}
                        >
                            <td className="px-4 py-3 align-top">
                                <div className="text-blue-600 font-bold font-mono">{p.id}</div>
                                <div className="text-xs text-slate-400 mt-0.5">NV: {p.admissionDate ? p.admissionDate.slice(5) : '-'}</div>
                            </td>
                            <td className="px-4 py-3 align-top">
                                <div className="font-bold text-slate-800 flex items-center gap-1 group-hover:text-blue-700 transition-colors">
                                    {p.name}
                                    {vipIds.has(p.id) && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1">{getAge(p.dob)}t | {p.gender}</div>
                            </td>
                            <td className="px-4 py-3 align-top">
                                {p.room ? (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded w-fit">{p.room}</span>
                                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><BedDouble className="h-3 w-3" /> {p.bed}</span>
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-4 py-3 align-top">
                                {p.treatingDoctor ? (
                                    <span className="text-xs font-medium text-slate-700 block truncate" title={p.treatingDoctor}>
                                        BS. {p.treatingDoctor.split('.').pop()?.trim()}
                                    </span>
                                ) : <span className="text-xs text-slate-300 italic">-</span>}
                            </td>
                            <td className="px-4 py-3 align-top text-center font-medium text-slate-600">
                                {calculateTreatmentDays(p)}
                            </td>
                            <td className="px-4 py-3 align-top">
                                <div className="relative">
                                    <div className="text-xs text-slate-600 line-clamp-2 max-w-[200px]" title={p.diagnosis}>{p.diagnosis}</div>
                                </div>
                            </td>
                            <td className="px-4 py-3 align-top"><StatusBadge status={p.status} /></td>
                            <td className="px-4 py-3 align-top text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canEdit && <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 className="h-4 w-4" /></button>}
                                    {canDelete && <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* DETAIL VIEW MODAL */}
      <Modal isOpen={!!selectedPatient} onClose={() => setSelectedPatient(null)} title="Chi tiết Bệnh án">
        {selectedPatient && (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {selectedPatient.name} 
                            {vipIds.has(selectedPatient.id) && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                            <span className="font-mono bg-slate-100 px-2 rounded text-slate-700">#{selectedPatient.id}</span>
                            <span>{getAge(selectedPatient.dob)} tuổi</span>
                            <span>{selectedPatient.gender}</span>
                        </div>
                    </div>
                    <StatusBadge status={selectedPatient.status} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailSection title="Hành chính & Điều trị" icon={UserCheck}>
                        <div className="grid grid-cols-2 gap-3">
                            <InfoRow label="SĐT Liên hệ" value={selectedPatient.phoneNumber} />
                            <InfoRow label="Phòng / Giường" value={`${selectedPatient.room || '-'} / ${selectedPatient.bed || '-'}`} />
                            <InfoRow label="Ngày nhập viện" value={formatDate(selectedPatient.admissionDate)} />
                            <InfoRow label="Ngày ra viện" value={formatDate(selectedPatient.dischargeDate)} />
                            <InfoRow label="Bác sĩ điều trị" value={selectedPatient.treatingDoctor} />
                        </div>
                    </DetailSection>

                    <DetailSection title="Thông tin Lâm sàng" icon={Activity}>
                        <InfoRow label="Chẩn đoán" value={selectedPatient.diagnosis} fullWidth />
                        <div className="pt-2"><InfoRow label="Ghi chú / Diễn biến" value={selectedPatient.notes} fullWidth /></div>
                    </DetailSection>

                    {(selectedPatient.status === 'DaDuyet' || selectedPatient.status === 'DaMo' || selectedPatient.surgeryDate) && (
                        <div className="md:col-span-2">
                            <DetailSection title="Thông tin Phẫu thuật" icon={Syringe}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <InfoRow label="Ngày mổ (Dự kiến)" value={formatDate(selectedPatient.surgeryDate)} />
                                    <InfoRow label="Ngày mổ (Thực tế)" value={formatDate(selectedPatient.actualSurgeryDate)} />
                                    <InfoRow label="Phẫu thuật viên" value={selectedPatient.surgeon} />
                                    <InfoRow label="Gây mê" value={selectedPatient.anesthetist} />
                                    <InfoRow label="Phương pháp" value={selectedPatient.surgeryMethod} fullWidth />
                                </div>
                            </DetailSection>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setSelectedPatient(null)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Đóng</button>
                    {canEdit && <button onClick={switchToEditFromDetail} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Edit2 className="h-4 w-4" /> Chỉnh sửa</button>}
                </div>
            </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? `Cập nhật: ${currentPatient.name}` : "Tiếp nhận Bệnh nhân mới"}>
        <form onSubmit={handleSave} className="max-h-[75vh] overflow-y-auto pr-1">
            <ModalTabs active={modalTab} onChange={setModalTab} />

            {/* TAB 1: GENERAL */}
            <div className={modalTab === 'general' ? 'block space-y-4' : 'hidden'}>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                        <Hash className="h-3 w-3" /> Mã Bệnh Nhân (ID) <span className="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" required disabled={isEditing}
                        className={`w-full px-3 py-2 border rounded-lg font-mono ${isEditing ? 'bg-slate-100 text-slate-500' : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none'}`}
                        value={currentPatient.id || ''}
                        onChange={e => setCurrentPatient(p => ({...p, id: e.target.value}))}
                        placeholder="VD: 24001234..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                        <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={currentPatient.name || ''} onChange={e => setCurrentPatient(p => ({...p, name: e.target.value}))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Năm sinh / Tuổi</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={currentPatient.dob || ''} onChange={e => setCurrentPatient(p => ({...p, dob: e.target.value}))} placeholder="VD: 1985 hoặc 45" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính <span className="text-red-500">*</span></label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={currentPatient.gender || 'Nam'} onChange={e => setCurrentPatient(p => ({...p, gender: e.target.value as any}))}>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> SĐT liên hệ</label>
                    <input type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={currentPatient.phoneNumber || ''} onChange={e => setCurrentPatient(p => ({...p, phoneNumber: e.target.value}))} />
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buồng</label>
                        <input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-sm" value={currentPatient.room || ''} onChange={e => setCurrentPatient(p => ({...p, room: e.target.value}))} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giường</label>
                        <input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-sm" value={currentPatient.bed || ''} onChange={e => setCurrentPatient(p => ({...p, bed: e.target.value}))} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ngày nhập viện</label>
                        <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={currentPatient.admissionDate || ''} onChange={e => setCurrentPatient(p => ({...p, admissionDate: e.target.value}))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ra viện</label>
                        <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={currentPatient.dischargeDate || ''} onChange={e => setCurrentPatient(p => ({...p, dischargeDate: e.target.value}))} disabled={currentPatient.status !== 'RaVien' && !currentPatient.dischargeDate} />
                    </div>
                </div>
            </div>

            {/* TAB 2: CLINICAL */}
            <div className={modalTab === 'clinical' ? 'block space-y-4' : 'hidden'}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái hiện tại</label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={currentPatient.status || 'ChoMo'} onChange={e => {
                            const newStatus = e.target.value as any;
                            setCurrentPatient(p => ({
                                ...p, 
                                status: newStatus,
                                dischargeDate: newStatus === 'RaVien' && !p.dischargeDate ? new Date().toISOString().split('T')[0] : p.dischargeDate
                            }));
                        }}>
                            <option value="ChoMo">Chờ mổ</option>
                            <option value="DaDuyet">Đã duyệt mổ</option>
                            <option value="DaMo">Hậu phẫu (Đã mổ)</option>
                            <option value="DieuTri">Điều trị Nội khoa</option>
                            <option value="RaVien">Đã ra viện</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phân loại <span className="text-red-500">*</span></label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={currentPatient.treatmentType || 'Ngoai'} onChange={e => setCurrentPatient(p => ({...p, treatmentType: e.target.value as any}))}>
                            <option value="Ngoai">Ngoại khoa</option>
                            <option value="Noi">Nội khoa</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bác sĩ điều trị chính</label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" value={currentPatient.treatingDoctor || ''} onChange={e => setCurrentPatient(p => ({...p, treatingDoctor: e.target.value}))}>
                        <option value="">-- Chọn bác sĩ --</option>
                        {doctors.map(d => <option key={d.id} value={d.fullName}>{d.fullName}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chẩn đoán <span className="text-red-500">*</span></label>
                    <textarea required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]" value={currentPatient.diagnosis || ''} onChange={e => setCurrentPatient(p => ({...p, diagnosis: e.target.value}))} placeholder="Nhập chẩn đoán y khoa..." />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Diễn biến / Ghi chú</label>
                    <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[60px]" value={currentPatient.notes || ''} onChange={e => setCurrentPatient(p => ({...p, notes: e.target.value}))} />
                </div>
            </div>

            {/* TAB 3: SURGERY */}
            <div className={modalTab === 'surgery' ? 'block space-y-4' : 'hidden'}>
                <div className="bg-purple-50/80 p-4 rounded-xl border border-purple-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-purple-800 uppercase tracking-wider">
                            <Syringe className="h-4 w-4 text-purple-600" /> Thông tin Phẫu thuật (Hậu kiểm)
                        </div>
                        <span className="text-xs text-purple-600 italic bg-purple-100 px-2 py-0.5 rounded font-medium">Lưu báo cáo thống kê</span>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-semibold text-purple-900">Ngày phẫu thuật</label>
                            <button
                                type="button"
                                onClick={() => setCurrentPatient(p => ({
                                    ...p,
                                    actualSurgeryDate: new Date().toISOString().split('T')[0]
                                }))}
                                className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded transition-colors"
                            >
                                Hôm nay
                            </button>
                        </div>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium text-slate-800"
                            value={currentPatient.actualSurgeryDate || currentPatient.surgeryDate || ''}
                            onChange={e => setCurrentPatient(p => ({ ...p, actualSurgeryDate: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-purple-900 mb-1">Cách thức phẫu thuật (Tường trình)</label>
                        <input
                            type="text"
                            placeholder="VD: TOETVA cắt toàn bộ tuyến giáp, RFA u tuyến giáp, Mổ nội soi..."
                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium text-slate-800"
                            value={currentPatient.surgeryMethod || ''}
                            onChange={e => setCurrentPatient(p => ({ ...p, surgeryMethod: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-purple-900 mb-1">Nhóm kỹ thuật</label>
                            <select
                                className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium text-slate-800 cursor-pointer"
                                value={currentPatient.interventionType || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setCurrentPatient(p => {
                                        const updated: Partial<Patient> = { ...p, interventionType: val };
                                        
                                        // 1. RFA: Thủ thuật - Loại Đặc biệt
                                        if (val === 'RFA') {
                                            updated.activityType = 'Thủ thuật';
                                            updated.surgeryClassification = 'Đặc biệt';
                                            if (!p.surgeryMethod) updated.surgeryMethod = 'Can thiệp Đốt sóng cao tần (RFA)';
                                        } 
                                        // 2. TOETVA Đặc biệt (Cắt TBTG / Nạo hạch)
                                        else if (val === 'TOETVA_DAC_BIET') {
                                            updated.interventionType = 'TOETVA';
                                            updated.activityType = 'Phẫu thuật';
                                            updated.surgeryClassification = 'Đặc biệt';
                                            if (!p.surgeryMethod) updated.surgeryMethod = 'PTNS ngả miệng (TOETVA) cắt TBTG nạo hạch';
                                        }
                                        // 3. TOETVA Loại I (Cắt thuỳ / Bảo tồn)
                                        else if (val === 'TOETVA_LOAI_1') {
                                            updated.interventionType = 'TOETVA';
                                            updated.activityType = 'Phẫu thuật';
                                            updated.surgeryClassification = 'Loại I';
                                            if (!p.surgeryMethod) updated.surgeryMethod = 'PTNS ngả miệng (TOETVA) cắt 1 thuỳ';
                                        }
                                        // 4. Cắt TBTG Nạo hạch (Đặc biệt)
                                        else if (val === 'CAT_TBTG_NAO_HACH') {
                                            updated.interventionType = 'Mổ K tuyến giáp';
                                            updated.activityType = 'Phẫu thuật';
                                            updated.surgeryClassification = 'Đặc biệt';
                                            if (!p.surgeryMethod) updated.surgeryMethod = 'Cắt toàn bộ tuyến giáp nạo hạch cổ';
                                        }
                                        // 5. ETS (PTNS Đốt hạch giao cảm - Loại I)
                                        else if (val === 'ETS') {
                                            updated.interventionType = 'PTNS đốt hạch giao cảm';
                                            updated.activityType = 'Phẫu thuật';
                                            updated.surgeryClassification = 'Loại I';
                                            if (!p.surgeryMethod) updated.surgeryMethod = 'PTNS đốt hạch giao cảm trị tăng tiết mồ hôi (ETS)';
                                        }
                                        // 6. Basedow / Mổ K giáp thường (Loại I)
                                        else if (val === 'Mổ K tuyến giáp' || val === 'Cắt toàn bộ tuyến giáp' || val === 'Basedow') {
                                            updated.activityType = 'Phẫu thuật';
                                            updated.surgeryClassification = 'Loại I';
                                            if (!p.surgeryMethod) updated.surgeryMethod = val === 'Basedow' ? 'Phẫu thuật tuyến giáp Basedow' : 'Phẫu thuật cắt toàn bộ tuyến giáp';
                                        }
                                        // 7. Cắt 1 thuỳ (Loại II)
                                        else if (val === 'Cắt 1 thuỳ tuyến giáp') {
                                            updated.activityType = 'Phẫu thuật';
                                            updated.surgeryClassification = 'Loại II';
                                            if (!p.surgeryMethod) updated.surgeryMethod = 'Phẫu thuật cắt 1 thuỳ tuyến giáp';
                                        }
                                        else if (val) {
                                            updated.activityType = 'Phẫu thuật';
                                        }

                                        return updated;
                                    });
                                }}
                            >
                                <option value="">-- Chọn nhóm kỹ thuật --</option>
                                <option value="RFA">⚡ RFA (Thủ thuật Đặc biệt - Đốt sóng cao tần)</option>
                                <option value="TOETVA_DAC_BIET">🔪 TOETVA - Cắt TBTG nạo hạch (PT Đặc biệt)</option>
                                <option value="TOETVA_LOAI_1">🔪 TOETVA - Cắt thuỳ / Bảo tồn (PT Loại I)</option>
                                <option value="CAT_TBTG_NAO_HACH">🔪 Cắt TBTG + Nạo hạch cổ (PT Đặc biệt)</option>
                                <option value="Mổ K tuyến giáp">🔪 Mổ K tuyến giáp / Cắt TBTG (PT Loại I)</option>
                                <option value="ETS">🔪 PTNS đốt hạch giao cảm ETS (PT Loại I)</option>
                                <option value="Basedow">🔪 Basedow (PT Loại I)</option>
                                <option value="Cắt 1 thuỳ tuyến giáp">🔪 Cắt 1 thuỳ tuyến giáp (PT Loại II)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-purple-900 mb-1">Loại phẫu thuật</label>
                            <select
                                className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium text-slate-800 cursor-pointer"
                                value={currentPatient.surgeryClassification || ''}
                                onChange={e => setCurrentPatient(p => ({ ...p, surgeryClassification: e.target.value as any }))}
                            >
                                <option value="">-- Chọn phân loại --</option>
                                <option value="Đặc biệt">Đặc biệt</option>
                                <option value="Loại I">Loại I</option>
                                <option value="Loại II">Loại II</option>
                                <option value="Loại III">Loại III</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium">Đóng</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2 font-medium shadow-sm shadow-blue-200">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isEditing ? 'Cập nhật' : 'Lưu hồ sơ'}
                </button>
            </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Cảnh báo xoá">
        <div className="text-center">
            <div className="bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xoá bệnh nhân?</h4>
            <p className="text-slate-600 mb-8">Hồ sơ bệnh nhân sẽ bị xoá vĩnh viễn khỏi hệ thống.<br/>Hành động này <span className="font-bold text-red-600">KHÔNG</span> thể hoàn tác.</p>
            <div className="flex gap-4 justify-center">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium">Hủy bỏ</button>
                <button onClick={handleDelete} disabled={submitting} className="px-6 py-2.5 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 flex items-center gap-2 font-medium shadow-lg shadow-red-200">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Xác nhận Xoá
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};
