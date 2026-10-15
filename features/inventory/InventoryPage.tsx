import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Edit3, FileSpreadsheet, FlaskConical, Minus, MonitorSmartphone, MoreHorizontal, Package, Plus, RefreshCw, Trash2, Wrench } from 'lucide-react';
import type { MedicalEquipment, Medicine } from '../../types';
import { addEquipment, addMedicine, deleteEquipment, deleteMedicine, getEquipment, getMedicines, updateEquipment, updateMedicine } from '../../services/dataService';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { mutateCache, useResource } from '../../lib/resource';
import { diffDays, fmtDate, todayKey, toDateKey } from '../../lib/dates';
import { fold, matchesQuery, toNumber } from '../../lib/text';
import { exportToExcel } from '../../utils/exportUtils';
import { nextMaintenanceKey } from '../dashboard/insights';
import {
  Badge,
  Button,
  Card,
  ChipGroup,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FormGrid,
  Input,
  Menu,
  PageHeader,
  RowActions,
  SearchInput,
  Segmented,
  Tabs,
  Textarea,
  Toolbar,
  confirmAction,
  showToast,
  type Column,
} from '../../components/ui';

type Tab = 'medicines' | 'equipment';
type MedFilter = 'all' | 'expired' | 'expiring' | 'low';
const LOW_STOCK = 10;
const NEAR_EXPIRY_DAYS = 90;

const medStatus = (medicine: Medicine, today: string) => {
  const expiry = toDateKey(medicine.expiryDate);
  const left = expiry ? diffDays(today, expiry) : null;
  if (left !== null && left < 0) return { key: 'expired' as const, label: 'Hết hạn', tone: 'danger' as const, left };
  if (left !== null && left <= NEAR_EXPIRY_DAYS) return { key: 'expiring' as const, label: `Cận hạn · ${left} ngày`, tone: 'warning' as const, left };
  if (toNumber(medicine.quantity) < LOW_STOCK) return { key: 'low' as const, label: 'Sắp hết', tone: 'violet' as const, left };
  return { key: 'ok' as const, label: 'Bình thường', tone: 'success' as const, left };
};

const isBroken = (item: MedicalEquipment) => ['broken', 'repairing'].some(token => fold(item.condition).includes(token)) || fold(item.condition).includes('hong');

const equipStatus = (item: MedicalEquipment, today: string) => {
  if (fold(item.condition).includes('repair')) return { label: 'Đang sửa', tone: 'warning' as const };
  if (isBroken(item)) return { label: 'Hỏng', tone: 'danger' as const };
  const next = nextMaintenanceKey(item);
  if (!next) return { label: 'Chưa có lịch', tone: 'neutral' as const };
  const left = diffDays(today, next);
  if (left < 0) return { label: `Quá hạn ${-left} ngày`, tone: 'danger' as const };
  if (left <= 30) return { label: `Còn ${left} ngày`, tone: 'warning' as const };
  return { label: 'Còn hạn', tone: 'success' as const };
};

export const InventoryPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'equipment' ? 'equipment' : 'medicines';
  const today = todayKey();
  const meds = useResource<Medicine[]>(KEYS.medicines, async options => (await getMedicines(options)) || []);
  const equip = useResource<MedicalEquipment[]>(KEYS.equipment, async options => (await getEquipment(options)) || []);
  const { run, pending } = useAction();
  const [search, setSearch] = useState('');
  const [medFilter, setMedFilter] = useState<MedFilter>((['expired', 'expiring', 'low'].includes(params.get('filter') || '') ? params.get('filter') : 'all') as MedFilter);
  const [editingMed, setEditingMed] = useState<Partial<Medicine> | null>(null);
  const [editingEq, setEditingEq] = useState<Partial<MedicalEquipment> | null>(null);

  const setTab = (value: Tab) => {
    const next = new URLSearchParams(params);
    if (value === 'equipment') next.set('tab', value);
    else next.delete('tab');
    next.delete('filter');
    setParams(next, { replace: true });
  };

  const medicines = useMemo(() => meds.data || [], [meds.data]);
  const medCounts = useMemo(() => {
    const result = { all: medicines.length, expired: 0, expiring: 0, low: 0 };
    medicines.forEach(medicine => {
      const status = medStatus(medicine, today).key;
      if (status === 'expired') result.expired++;
      if (status === 'expiring') result.expiring++;
      if (toNumber(medicine.quantity) < LOW_STOCK) result.low++;
    });
    return result;
  }, [medicines, today]);

  const medRows = useMemo(
    () =>
      medicines
        .filter(medicine => {
          const status = medStatus(medicine, today).key;
          if (medFilter === 'expired') return status === 'expired';
          if (medFilter === 'expiring') return status === 'expiring';
          if (medFilter === 'low') return toNumber(medicine.quantity) < LOW_STOCK;
          return true;
        })
        .filter(medicine => matchesQuery(search, medicine.name, medicine.content, medicine.notes))
        .sort((a, b) => (toDateKey(a.expiryDate) || '9999').localeCompare(toDateKey(b.expiryDate) || '9999')),
    [medicines, medFilter, search, today],
  );

  const equipment = useMemo(
    () =>
      (equip.data || [])
        .filter(item => matchesQuery(search, item.name, item.code, item.inCharge, item.notes))
        .sort((a, b) => (nextMaintenanceKey(a) || '9999').localeCompare(nextMaintenanceKey(b) || '9999')),
    [equip.data, search],
  );

  const adjustQuantity = async (medicine: Medicine, delta: number) => {
    const quantity = Math.max(0, toNumber(medicine.quantity) + delta);
    mutateCache<Medicine[]>(KEYS.medicines, current => (current || []).map(item => (item.id === medicine.id ? { ...item, quantity } : item)));
    await run(`qty-${medicine.id}`, () => updateMedicine(medicine.id, { quantity }), { error: 'Không cập nhật được số lượng', invalidate: [KEYS.ops] });
  };

  const saveMed = async () => {
    if (!editingMed?.name?.trim() || !editingMed.expiryDate) return showToast('Nhập tên thuốc và hạn dùng', 'warning');
    const payload = { ...editingMed, name: editingMed.name.trim(), quantity: toNumber(editingMed.quantity) };
    const result = await run('save-med', () => (payload.id ? updateMedicine(payload.id, payload) : addMedicine(payload as Medicine)), {
      success: 'Đã lưu thuốc / vật tư',
      invalidate: [KEYS.medicines, KEYS.ops],
    });
    if (result !== undefined) setEditingMed(null);
  };

  const saveEq = async () => {
    if (!editingEq?.name?.trim()) return showToast('Nhập tên thiết bị', 'warning');
    if (!toNumber(editingEq.maintenanceCycle)) return showToast('Nhập chu kỳ kiểm định (tháng)', 'warning');
    const payload = { ...editingEq, name: editingEq.name.trim(), maintenanceCycle: toNumber(editingEq.maintenanceCycle) };
    const result = await run('save-eq', () => (payload.id ? updateEquipment(payload.id, payload) : addEquipment(payload as MedicalEquipment)), {
      success: 'Đã lưu thiết bị',
      invalidate: [KEYS.equipment, KEYS.ops],
    });
    if (result !== undefined) setEditingEq(null);
  };

  const removeMed = async (medicine: Medicine) => {
    if (!(await confirmAction({ title: `Xoá "${medicine.name}"?`, confirmText: 'Xoá' }))) return;
    await run('delete', () => deleteMedicine(medicine.id), { success: 'Đã xoá', invalidate: [KEYS.medicines, KEYS.ops] });
    setEditingMed(null);
  };

  const removeEq = async (item: MedicalEquipment) => {
    if (!(await confirmAction({ title: `Xoá thiết bị "${item.name}"?`, confirmText: 'Xoá' }))) return;
    await run('delete', () => deleteEquipment(item.id), { success: 'Đã xoá', invalidate: [KEYS.equipment, KEYS.ops] });
    setEditingEq(null);
  };

  const markMaintained = (item: MedicalEquipment) =>
    run(`maint-${item.id}`, () => updateEquipment(item.id, { lastMaintenanceDate: today, condition: 'Normal' }), {
      success: `Đã ghi nhận kiểm định ${item.name}`,
      invalidate: [KEYS.equipment, KEYS.ops],
    });

  const exportData = () => {
    if (tab === 'medicines') {
      exportToExcel({
        fileName: `Kho_thuoc_${today}.xlsx`,
        sheetName: 'Thuốc - vật tư',
        title: 'DANH MỤC THUỐC - VẬT TƯ TẠI KHOA',
        subtitle: `Ngày xuất ${fmtDate(today)} · ${medRows.length} mục`,
        headers: ['STT', 'Tên', 'Hàm lượng', 'Số lượng', 'ĐVT', 'Hạn dùng', 'Tình trạng', 'Ghi chú'],
        rows: medRows.map((medicine, index) => [index + 1, medicine.name, medicine.content || '', toNumber(medicine.quantity), medicine.unit || '', fmtDate(medicine.expiryDate, ''), medStatus(medicine, today).label, medicine.notes || '']),
      });
    } else {
      exportToExcel({
        fileName: `Thiet_bi_${today}.xlsx`,
        sheetName: 'Thiết bị',
        title: 'DANH MỤC THIẾT BỊ Y TẾ',
        subtitle: `Ngày xuất ${fmtDate(today)} · ${equipment.length} thiết bị`,
        headers: ['STT', 'Tên thiết bị', 'Mã', 'Phụ trách', 'Kiểm định gần nhất', 'Chu kỳ (tháng)', 'Hạn kiểm định', 'Tình trạng', 'Ghi chú'],
        rows: equipment.map((item, index) => [index + 1, item.name, item.code || '', item.inCharge || '', fmtDate(item.lastMaintenanceDate, ''), toNumber(item.maintenanceCycle), fmtDate(nextMaintenanceKey(item), ''), equipStatus(item, today).label, item.notes || '']),
      });
    }
  };

  const medColumns: Column<Medicine>[] = [
    {
      key: 'name',
      header: 'Thuốc / vật tư',
      sort: medicine => medicine.name,
      cell: medicine => (
        <div>
          <p className="font-medium text-fg">{medicine.name}</p>
          {medicine.content && <p className="text-xs text-muted">{medicine.content}</p>}
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Tồn',
      align: 'center',
      sort: medicine => toNumber(medicine.quantity),
      cell: medicine => (
        <div className="flex items-center justify-center gap-1" onClick={event => event.stopPropagation()}>
          <Button size="xs" variant="ghost" iconOnly icon={Minus} onClick={() => adjustQuantity(medicine, -1)} aria-label="Giảm 1" />
          <span className={`num min-w-[48px] text-center font-semibold ${toNumber(medicine.quantity) < LOW_STOCK ? 'text-rose-600' : 'text-fg'}`}>
            {toNumber(medicine.quantity)} <span className="text-xs font-normal text-muted">{medicine.unit}</span>
          </span>
          <Button size="xs" variant="ghost" iconOnly icon={Plus} onClick={() => adjustQuantity(medicine, 1)} aria-label="Tăng 1" />
        </div>
      ),
    },
    { key: 'expiry', header: 'Hạn dùng', sort: medicine => toDateKey(medicine.expiryDate) || '9999', cell: medicine => <span className="num text-sm">{fmtDate(medicine.expiryDate)}</span> },
    {
      key: 'status',
      header: 'Tình trạng',
      cell: medicine => {
        const status = medStatus(medicine, today);
        return (
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        );
      },
    },
    { key: 'notes', header: 'Ghi chú', hideBelow: 'lg', cell: medicine => <span className="line-clamp-1 text-xs text-muted">{medicine.notes}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: medicine => (
        <RowActions>
          <Button size="sm" variant="ghost" iconOnly icon={Edit3} onClick={() => setEditingMed(medicine)} aria-label="Sửa" />
          <Button size="sm" variant="danger-soft" iconOnly icon={Trash2} onClick={() => removeMed(medicine)} aria-label="Xoá" />
        </RowActions>
      ),
    },
  ];

  const eqColumns: Column<MedicalEquipment>[] = [
    {
      key: 'name',
      header: 'Thiết bị',
      sort: item => item.name,
      cell: item => (
        <div>
          <p className="font-medium text-fg">{item.name}</p>
          <p className="text-xs text-muted">
            {item.code && <span className="font-mono">{item.code}</span>}
            {item.notes && ` · ${item.notes}`}
          </p>
        </div>
      ),
    },
    { key: 'incharge', header: 'Phụ trách', hideBelow: 'md', cell: item => <span className="text-sm text-muted">{item.inCharge || '—'}</span> },
    { key: 'last', header: 'Kiểm định gần nhất', hideBelow: 'lg', cell: item => <span className="num text-sm">{fmtDate(item.lastMaintenanceDate)}</span> },
    { key: 'next', header: 'Hạn kế tiếp', sort: item => nextMaintenanceKey(item) || '9999', cell: item => <span className="num text-sm font-medium">{fmtDate(nextMaintenanceKey(item))}</span> },
    {
      key: 'status',
      header: 'Tình trạng',
      cell: item => {
        const status = equipStatus(item, today);
        return (
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: item => (
        <RowActions>
          <Button size="sm" variant="soft" icon={CheckCircle2} loading={pending === `maint-${item.id}`} onClick={() => markMaintained(item)} title="Ghi nhận đã kiểm định/bảo trì hôm nay">
            Đã kiểm định
          </Button>
          <Menu
            trigger={({ toggle }) => <Button size="sm" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
            items={[
              { label: 'Sửa', icon: Edit3, onSelect: () => setEditingEq(item) },
              { label: 'Báo hỏng', icon: Wrench, onSelect: () => run(`broken-${item.id}`, () => updateEquipment(item.id, { condition: 'Broken' }), { success: 'Đã báo hỏng', invalidate: [KEYS.equipment, KEYS.ops] }) },
              'divider',
              { label: 'Xoá', icon: Trash2, danger: true, onSelect: () => removeEq(item) },
            ]}
          />
        </RowActions>
      ),
    },
  ];

  const active = tab === 'medicines' ? meds : equip;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dược & thiết bị"
        icon={FlaskConical}
        description="Theo dõi tồn kho, hạn dùng thuốc – vật tư và lịch kiểm định trang thiết bị"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={active.validating} onClick={() => active.reload()} aria-label="Làm mới" />
            <Button icon={FileSpreadsheet} onClick={exportData} className="hidden sm:inline-flex">
              Excel
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() =>
                tab === 'medicines' ? setEditingMed({ quantity: 0, unit: 'Viên' }) : setEditingEq({ condition: 'Normal', maintenanceCycle: 12, lastMaintenanceDate: today })
              }
            >
              {tab === 'medicines' ? 'Thêm thuốc' : 'Thêm thiết bị'}
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="px-3 pt-1 sm:px-4">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'medicines', label: 'Thuốc & vật tư', icon: Package, count: medCounts.expired + medCounts.expiring, countTone: 'warning' },
              { value: 'equipment', label: 'Thiết bị y tế', icon: MonitorSmartphone, count: (equip.data || []).filter(isBroken).length, countTone: 'danger' },
            ]}
          />
        </div>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder={tab === 'medicines' ? 'Tìm thuốc, vật tư…' : 'Tìm thiết bị, mã…'} className="sm:w-72" />
          {tab === 'medicines' && (
            <Segmented<MedFilter>
              size="sm"
              value={medFilter}
              onChange={setMedFilter}
              items={[
                { value: 'all', label: 'Tất cả', count: medCounts.all },
                { value: 'expired', label: 'Hết hạn', count: medCounts.expired },
                { value: 'expiring', label: 'Cận hạn', count: medCounts.expiring },
                { value: 'low', label: 'Sắp hết', count: medCounts.low },
              ]}
            />
          )}
        </Toolbar>
        {active.error && !active.data ? (
          <ErrorState error={active.error} onRetry={() => active.reload()} />
        ) : tab === 'medicines' ? (
          <DataTable
            rows={medRows}
            columns={medColumns}
            rowKey={medicine => medicine.id}
            loading={meds.loading}
            onRowClick={medicine => setEditingMed(medicine)}
            resetKey={`${medFilter}-${search}`}
            empty={<EmptyState icon={Package} title="Không có thuốc / vật tư phù hợp" />}
            mobileCard={medicine => {
              const status = medStatus(medicine, today);
              return (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{medicine.name}</p>
                    <p className="text-xs text-muted">
                      {toNumber(medicine.quantity)} {medicine.unit} · HSD {fmtDate(medicine.expiryDate)}
                    </p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
              );
            }}
          />
        ) : (
          <DataTable
            rows={equipment}
            columns={eqColumns}
            rowKey={item => item.id}
            loading={equip.loading}
            onRowClick={item => setEditingEq(item)}
            empty={<EmptyState icon={MonitorSmartphone} title="Chưa có thiết bị" />}
            mobileCard={item => {
              const status = equipStatus(item, today);
              return (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{item.name}</p>
                    <p className="text-xs text-muted">Hạn kiểm định {fmtDate(nextMaintenanceKey(item))}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
              );
            }}
          />
        )}
      </Card>

      <Drawer
        open={Boolean(editingMed)}
        onClose={() => setEditingMed(null)}
        persistent
        title={editingMed?.id ? 'Cập nhật thuốc / vật tư' : 'Thêm thuốc / vật tư'}
        footer={
          <>
            {editingMed?.id && (
              <Button variant="danger-soft" icon={Trash2} className="mr-auto" onClick={() => removeMed(editingMed as Medicine)}>
                Xoá
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditingMed(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save-med'} onClick={saveMed}>
              Lưu
            </Button>
          </>
        }
      >
        {editingMed && (
          <div className="space-y-4">
            <Field label="Tên thuốc / vật tư" required>
              <Input value={editingMed.name || ''} onChange={event => setEditingMed({ ...editingMed, name: event.target.value })} />
            </Field>
            <Field label="Hàm lượng / dạng bào chế">
              <Input value={editingMed.content || ''} onChange={event => setEditingMed({ ...editingMed, content: event.target.value })} placeholder="VD: 500mg – viên nén" />
            </Field>
            <FormGrid cols={3}>
              <Field label="Số lượng">
                <Input type="number" min={0} value={toNumber(editingMed.quantity)} onChange={event => setEditingMed({ ...editingMed, quantity: Number(event.target.value) })} />
              </Field>
              <Field label="Đơn vị">
                <Input value={editingMed.unit || ''} onChange={event => setEditingMed({ ...editingMed, unit: event.target.value })} list="kn-units" />
                <datalist id="kn-units">
                  {['Viên', 'Ống', 'Lọ', 'Chai', 'Túi', 'Hộp', 'Cái', 'Bộ', 'Gói'].map(unit => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
              </Field>
              <Field label="Hạn sử dụng" required>
                <Input type="date" value={toDateKey(editingMed.expiryDate) || ''} onChange={event => setEditingMed({ ...editingMed, expiryDate: event.target.value })} />
              </Field>
            </FormGrid>
            <Field label="Ghi chú">
              <Textarea value={editingMed.notes || ''} onChange={event => setEditingMed({ ...editingMed, notes: event.target.value })} rows={2} />
            </Field>
          </div>
        )}
      </Drawer>

      <Drawer
        open={Boolean(editingEq)}
        onClose={() => setEditingEq(null)}
        persistent
        title={editingEq?.id ? 'Cập nhật thiết bị' : 'Thêm thiết bị'}
        footer={
          <>
            {editingEq?.id && (
              <Button variant="danger-soft" icon={Trash2} className="mr-auto" onClick={() => removeEq(editingEq as MedicalEquipment)}>
                Xoá
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditingEq(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save-eq'} onClick={saveEq}>
              Lưu
            </Button>
          </>
        }
      >
        {editingEq && (
          <div className="space-y-4">
            <Field label="Tên thiết bị" required>
              <Input value={editingEq.name || ''} onChange={event => setEditingEq({ ...editingEq, name: event.target.value })} />
            </Field>
            <FormGrid>
              <Field label="Mã thiết bị">
                <Input value={editingEq.code || ''} onChange={event => setEditingEq({ ...editingEq, code: event.target.value })} className="font-mono" />
              </Field>
              <Field label="Người phụ trách">
                <Input value={editingEq.inCharge || ''} onChange={event => setEditingEq({ ...editingEq, inCharge: event.target.value })} />
              </Field>
              <Field label="Ngày mua">
                <Input type="date" value={toDateKey(editingEq.purchaseDate) || ''} onChange={event => setEditingEq({ ...editingEq, purchaseDate: event.target.value })} />
              </Field>
              <Field label="Kiểm định gần nhất">
                <Input type="date" value={toDateKey(editingEq.lastMaintenanceDate) || ''} onChange={event => setEditingEq({ ...editingEq, lastMaintenanceDate: event.target.value })} />
              </Field>
              <Field label="Chu kỳ kiểm định (tháng)" required hint={editingEq.lastMaintenanceDate && editingEq.maintenanceCycle ? `Hạn kế tiếp: ${fmtDate(nextMaintenanceKey(editingEq as MedicalEquipment))}` : undefined}>
                <Input type="number" min={1} value={toNumber(editingEq.maintenanceCycle) || ''} onChange={event => setEditingEq({ ...editingEq, maintenanceCycle: Number(event.target.value) })} />
              </Field>
              <Field label="Tình trạng">
                <ChipGroup
                  value={(editingEq.condition || 'Normal') as MedicalEquipment['condition']}
                  onChange={value => setEditingEq({ ...editingEq, condition: value })}
                  options={[
                    { value: 'Normal', label: 'Bình thường' },
                    { value: 'Repairing', label: 'Đang sửa', activeClass: 'border-amber-500 bg-amber-500 text-white' },
                    { value: 'Broken', label: 'Hỏng', activeClass: 'border-rose-500 bg-rose-500 text-white' },
                  ]}
                />
              </Field>
            </FormGrid>
            <Field label="Ghi chú">
              <Textarea value={editingEq.notes || ''} onChange={event => setEditingEq({ ...editingEq, notes: event.target.value })} rows={2} />
            </Field>
          </div>
        )}
      </Drawer>
    </div>
  );
};
