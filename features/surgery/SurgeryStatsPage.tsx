import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, BarChart3, ChevronLeft, ChevronRight, FileSpreadsheet, RefreshCw, Scissors, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePatients } from '../../hooks/useData';
import { calculateSurgeryStats, getSurgeryClassificationLabel, getSurgeryServiceLabel } from '../../utils/surgeryStats';
import { exportToExcel, getAge } from '../../utils/exportUtils';
import { addMonths, fmtDate, fmtMonth, getVietnamMonthKey } from '../../lib/dates';
import { shortName } from '../../lib/text';
import { BarList, Button, Callout, Card, ColumnChart, ErrorState, Input, PageHeader, SectionCard, Skeleton, StatCard, showToast } from '../../components/ui';
import { casesInMonth, countBy } from './statsLogic';

const GROUP_LABELS: Record<string, string> = {
  KGiap: 'K tuyến giáp',
  TOETVA: 'TOETVA (nội soi)',
  Basedow: 'Basedow',
  LanhTinh: 'Bướu giáp lành tính',
  ETS: 'PTNS đốt hạch giao cảm',
  Other: 'Phẫu thuật khác',
};

export const SurgeryStatsPage: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, validating, reload } = usePatients();
  const patients = data || [];
  const month = params.get('month') || getVietnamMonthKey();
  const isAll = month === 'ALL';

  const setMonth = (value: string) => {
    const next = new URLSearchParams(params);
    next.set('month', value);
    setParams(next, { replace: true });
  };

  const stats = useMemo(() => calculateSurgeryStats(patients, month as string | 'ALL'), [patients, month]);
  const cases = useMemo(() => casesInMonth(patients, month as string | 'ALL'), [patients, month]);
  const previous = useMemo(() => (isAll ? null : calculateSurgeryStats(patients, addMonths(month, -1))), [patients, month, isAll]);

  const trend = useMemo(() => {
    const end = isAll ? getVietnamMonthKey() : month;
    return Array.from({ length: 12 }, (_, index) => {
      const key = addMonths(end, index - 11);
      const result = calculateSurgeryStats(patients, key);
      return { key, label: `T${Number(key.slice(5))}`, value: result.totalSurgeries, procedures: result.totalProcedures, highlight: key === month };
    });
  }, [patients, month, isAll]);

  const surgeons = useMemo(() => countBy([...cases.surgeries, ...cases.procedures], patient => patient.surgeon).slice(0, 8), [cases]);
  const total = stats.totalSurgeries;
  const delta = previous ? total - previous.totalSurgeries : 0;

  const exportReport = () => {
    if (!cases.surgeries.length && !cases.procedures.length) return showToast('Không có ca nào trong kỳ để xuất', 'warning');
    const rows = [...cases.surgeries, ...cases.procedures]
      .sort((a, b) => String(a.actualSurgeryDate).localeCompare(String(b.actualSurgeryDate)))
      .map((patient, index) => [
        index + 1,
        fmtDate(patient.actualSurgeryDate),
        patient.id,
        patient.name,
        getAge(patient.dob),
        patient.gender || '',
        patient.diagnosis || '',
        getSurgeryServiceLabel(patient.surgeryService || patient.interventionType),
        patient.surgeryMethod || '',
        cases.procedures.includes(patient) ? 'Thủ thuật (RFA)' : getSurgeryClassificationLabel(patient.surgeryType || patient.surgeryClassification),
        patient.surgeon || '',
      ]);
    exportToExcel({
      fileName: `Bao_cao_PT_TT_${isAll ? 'tat_ca' : month}.xlsx`,
      sheetName: 'Báo cáo PT-TT',
      title: `BÁO CÁO PHẪU THUẬT - THỦ THUẬT ${isAll ? 'TOÀN BỘ' : fmtMonth(month).toUpperCase()}`,
      subtitle: `Phẫu thuật: ${stats.totalSurgeries} (Đặc biệt ${stats.classifications['Đặc biệt']}, Loại I ${stats.classifications['Loại I']}, Loại II ${stats.classifications['Loại II']}, Loại III ${stats.classifications['Loại III']}) · Thủ thuật RFA: ${stats.totalProcedures}`,
      headers: ['STT', 'Ngày mổ', 'Mã BN', 'Họ tên', 'Tuổi', 'GT', 'Chẩn đoán', 'Dịch vụ', 'Phương pháp', 'Phân loại', 'PTV chính'],
      rows,
      signers: ['NGƯỜI LẬP BÁO CÁO', 'TRƯỞNG KHOA'],
      creatorName: user.fullName,
    });
    showToast('Đã xuất báo cáo', 'success');
  };

  const pct = (value: number) => (total ? `${Math.round((value / total) * 100)}%` : '0%');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thống kê phẫu thuật – thủ thuật"
        icon={BarChart3}
        description={`${stats.sourceRecords} hồ sơ có ngày mổ · ${stats.total} ca đủ điều kiện thống kê`}
        actions={
          <>
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-0.5">
              <Button size="sm" variant="ghost" iconOnly icon={ChevronLeft} disabled={isAll} onClick={() => setMonth(addMonths(month, -1))} aria-label="Tháng trước" />
              <Input type="month" value={isAll ? '' : month} onChange={event => setMonth(event.target.value || getVietnamMonthKey())} className="h-8 w-36 border-0 px-2 text-[13px] focus:ring-0" />
              <Button size="sm" variant="ghost" iconOnly icon={ChevronRight} disabled={isAll || month >= getVietnamMonthKey()} onClick={() => setMonth(addMonths(month, 1))} aria-label="Tháng sau" />
            </div>
            <Button size="md" variant={isAll ? 'soft' : 'ghost'} onClick={() => setMonth(isAll ? getVietnamMonthKey() : 'ALL')}>
              {isAll ? 'Theo tháng' : 'Toàn bộ'}
            </Button>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button icon={FileSpreadsheet} onClick={exportReport}>
              Xuất báo cáo
            </Button>
          </>
        }
      />

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={() => reload()} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
            <StatCard
              label={isAll ? 'Tổng phẫu thuật' : `Phẫu thuật ${fmtMonth(month).toLowerCase()}`}
              value={loading ? <Skeleton className="h-8 w-12" /> : total}
              icon={Scissors}
              tone="primary"
              hint={previous ? `${delta >= 0 ? '+' : ''}${delta} so với tháng trước` : 'Không gồm thủ thuật'}
            />
            <StatCard label="Thủ thuật RFA" value={loading ? <Skeleton className="h-8 w-12" /> : stats.totalProcedures} icon={Zap} tone="violet" hint="Đốt sóng cao tần" />
            <StatCard label="K tuyến giáp" value={loading ? <Skeleton className="h-8 w-12" /> : stats.groups.KGiap} icon={ShieldCheck} tone="danger" hint={`${pct(stats.groups.KGiap)} số ca phẫu thuật`} />
            <StatCard label="TOETVA" value={loading ? <Skeleton className="h-8 w-12" /> : stats.groups.TOETVA} icon={Sparkles} tone="success" hint={`${pct(stats.groups.TOETVA)} số ca phẫu thuật`} />
            <StatCard
              label="Chờ hoàn thiện"
              value={loading ? <Skeleton className="h-8 w-12" /> : stats.incompleteRecords}
              icon={AlertTriangle}
              tone={stats.incompleteRecords ? 'warning' : 'neutral'}
              hint="Chưa cộng vào số chính thức"
              onClick={stats.incompleteRecords ? () => navigate(`/clinical?status=CanPhanLoai&month=${isAll ? 'all' : month}`) : undefined}
              className="col-span-2 xl:col-span-1"
            />
          </div>

          {stats.incompleteRecords > 0 && (
            <Callout
              tone="warning"
              title={`${stats.incompleteRecords} hồ sơ đã mổ nhưng chưa có loại phẫu thuật`}
              action={
                <Button size="sm" onClick={() => navigate(`/clinical?status=CanPhanLoai&month=${isAll ? 'all' : month}`)}>
                  Hoàn thiện ngay
                </Button>
              }
            >
              Các hồ sơ này được giữ nguyên để hậu kiểm nhưng không tính vào tổng phẫu thuật.
            </Callout>
          )}

          <SectionCard
            title="Xu hướng 12 tháng"
            description="Số ca phẫu thuật mỗi tháng · bấm vào cột để xem tháng đó"
            icon={BarChart3}
            bodyClassName="p-4 sm:p-5"
          >
            {loading ? <Skeleton className="h-52 w-full" /> : <ColumnChart data={trend.map(item => ({ ...item, tooltip: `${item.value} phẫu thuật · ${item.procedures} RFA` }))} height={210} valueLabel="ca" onSelect={setMonth} />}
          </SectionCard>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <SectionCard title="Cơ cấu mặt bệnh" description="Chỉ tính phẫu thuật" icon={Scissors} className="lg:col-span-1" bodyClassName="p-4 sm:p-5">
              <BarList
                data={Object.entries(stats.groups)
                  .map(([key, value]) => ({ key, label: GROUP_LABELS[key] || key, value }))
                  .sort((a, b) => b.value - a.value)}
                total={total}
              />
            </SectionCard>
            <SectionCard title="Phân loại phẫu thuật" description="Theo thông tư phân loại PT" icon={ShieldCheck} bodyClassName="p-4 sm:p-5">
              <BarList
                tone="violet"
                data={(['Đặc biệt', 'Loại I', 'Loại II', 'Loại III'] as const).map(key => ({ key, label: key, value: stats.classifications[key] }))}
                total={total}
              />
            </SectionCard>
            <SectionCard title="Phẫu thuật viên chính" description="Gồm phẫu thuật & RFA trong kỳ" icon={Sparkles} bodyClassName="p-4 sm:p-5">
              {surgeons.length ? (
                <BarList tone="info" showPercent={false} data={surgeons.map(item => ({ key: item.name, label: shortName(item.name), value: item.count }))} />
              ) : (
                <p className="py-6 text-center text-sm text-muted">Chưa có dữ liệu PTV</p>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Bảng số liệu theo tháng" icon={BarChart3} bodyClassName="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line bg-sunken/70 text-xs text-muted">
                  <th className="px-4 py-2.5 text-left font-semibold">Tháng</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Phẫu thuật</th>
                  <th className="px-4 py-2.5 text-right font-semibold">RFA</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {[...trend].reverse().map(item => (
                  <tr key={item.key} className={item.highlight ? 'bg-primary-soft/60' : 'border-b border-line/60'}>
                    <td className="px-4 py-2">
                      <button onClick={() => setMonth(item.key)} className="font-medium text-fg hover:text-primary">
                        {fmtMonth(item.key)}
                      </button>
                    </td>
                    <td className="num px-4 py-2 text-right">{item.value}</td>
                    <td className="num px-4 py-2 text-right">{item.procedures}</td>
                    <td className="num px-4 py-2 text-right font-semibold">{item.value + item.procedures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </>
      )}
    </div>
  );
};
