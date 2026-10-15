import React, { useMemo, useState } from 'react';
import { AlertTriangle, Award, ChevronDown, Clock, Edit3, MessageSquare, MoreHorizontal, Printer, ShieldCheck, Sparkles, Star, Trash2, UserRound } from 'lucide-react';
import type { StaffEvaluation, StaffReward, StaffTask } from '../../types';
import { fmtDate } from '../../lib/dates';
import { matchesQuery } from '../../lib/text';
import { cn } from '../../lib/cn';
import { printTable } from '../../lib/print';
import { Avatar, Badge, Button, Callout, Dialog, EmptyState, Field, FormGrid, Input, Menu, Progress, SearchInput, Segmented, Select, SkeletonRows, Textarea, showToast } from '../../components/ui';
import {
  CRITERIA_SETS,
  EVAL_STATUS,
  GROUP_LABEL,
  RANKS,
  RANK_TONE,
  SUGGESTION_TOLERANCE,
  byPeriodDesc,
  calcScore,
  criteriaOf,
  criteriaSetOf,
  finishedOnTime,
  isDone,
  isExtremeRank,
  isOverdue,
  isPendingEvaluation,
  isScored,
  missingCriteria,
  parsePeriodSnapshot,
  parseSelfAssessment,
  periodLabel,
  periodRange,
  periodStats,
  rankFromScore,
  samePeriod,
  taskPeriodDate,
  finalScore,
  fmtSigned,
  REWARD_CAP,
  evaluationPrintModel,
  periodSummaryPrintModel,
  staleRewardAdjustment,
  type RewardPeriod,
  type Criterion,
  type CriterionKey,
  type PeriodStats,
  type StaffGroup,
} from './staffLogic';

const STATUS_TONE: Record<string, 'warning' | 'info' | 'success'> = {
  [EVAL_STATUS.pending]: 'warning',
  [EVAL_STATUS.evaluated]: 'info',
  [EVAL_STATUS.acknowledged]: 'success',
};

/* ---------------- Ô chấm điểm ---------------- */

const ScoreRow: React.FC<{
  criterion: Criterion;
  value: unknown;
  onChange?: (value: number | '') => void;
  selfScore?: number;
  suggested?: number | null;
}> = ({ criterion, value, onChange, selfScore, suggested }) => {
  const scored = isScored(value);
  const numeric = scored ? Number(value) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-medium text-fg">{criterion.label}</span>
        <span className="text-xs text-faint">{criterion.weight}%</span>
        {selfScore !== undefined && <span className="ml-auto text-xs text-muted">Tự chấm: <b className="num text-fg">{selfScore}</b></span>}
        {suggested !== undefined && suggested !== null && (
          <span className={cn('text-xs text-muted', selfScore === undefined && 'ml-auto')}>
            Gợi ý: <b className="num text-fg">{suggested}</b>
          </span>
        )}
      </div>
      {criterion.hint && <p className="text-xs text-muted">{criterion.hint}</p>}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={numeric}
          disabled={!onChange}
          onChange={event => onChange?.(Number(event.target.value))}
          className={cn('flex-1 accent-[rgb(var(--primary))]', !scored && 'opacity-40')}
          aria-label={criterion.label}
        />
        <input
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          placeholder="—"
          value={scored ? numeric : ''}
          disabled={!onChange}
          onChange={event => {
            const raw = event.target.value;
            onChange?.(raw === '' ? '' : Math.max(0, Math.min(100, Math.round(Number(raw)))));
          }}
          className="input num h-9 w-16 px-2 text-right"
          aria-label={`Điểm ${criterion.label}`}
        />
      </div>
    </div>
  );
};

/* ---------------- Số liệu công việc của kỳ ---------------- */

const timeliness = (task: StaffTask, today: string): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } => {
  if (isDone(task)) return finishedOnTime(task) ? { label: 'Xong đúng hạn', tone: 'success' } : { label: 'Xong trễ', tone: 'warning' };
  if (isOverdue(task, today)) return { label: 'Quá hạn', tone: 'danger' };
  return { label: task.trangThai === 'Tạm dừng' ? 'Tạm dừng' : 'Chưa đến hạn', tone: 'neutral' };
};

export const PeriodSummary: React.FC<{
  stats: PeriodStats;
  tasks: StaffTask[];
  today: string;
  onApply?: (score: number) => void;
}> = ({ stats, tasks, today, onApply }) => {
  const [showTasks, setShowTasks] = useState(false);
  const inPeriod = tasks
    .filter(task => {
      const date = taskPeriodDate(task);
      return date >= stats.from && date <= stats.to;
    })
    .sort((a, b) => taskPeriodDate(a).localeCompare(taskPeriodDate(b)));
  const cells = [
    { label: 'Được giao', value: stats.total },
    { label: 'Xong đúng hạn', value: stats.onTime, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Xong trễ', value: stats.late, tone: stats.late ? 'text-amber-600 dark:text-amber-400' : '' },
    { label: 'Quá hạn', value: stats.overdue, tone: stats.overdue ? 'text-rose-600 dark:text-rose-400' : '' },
  ];
  return (
    <div className="rounded-2xl border border-line bg-sunken/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-fg">Số liệu công việc trong kỳ</p>
        <span className="text-xs text-muted">
          {fmtDate(stats.from)} – {fmtDate(stats.to)}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {cells.map(cell => (
          <div key={cell.label} className="rounded-xl bg-surface py-2">
            <dt className="text-[11px] text-muted">{cell.label}</dt>
            <dd className={cn('num text-lg font-semibold text-fg', cell.tone)}>{cell.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {stats.suggested === null ? (
          <span className="text-muted">Chưa có việc nào đến hạn trong kỳ nên chưa có điểm gợi ý. Chấm theo nhận định của bạn.</span>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-fg">
              Gợi ý "Hoàn thành công việc": <b className="num">{stats.suggested}</b>
            </span>
            <span className="text-xs text-muted">(xong đúng hạn = 100, xong trễ = 50, quá hạn = 0; tính trên {stats.assessed} việc)</span>
            {onApply && (
              <Button size="xs" variant="soft" className="ml-auto" onClick={() => onApply(stats.suggested as number)}>
                Dùng điểm gợi ý
              </Button>
            )}
          </>
        )}
      </div>
      {inPeriod.length > 0 && (
        <div className="mt-3 border-t border-line pt-2">
          <button className="flex items-center gap-1 text-xs font-medium text-primary" onClick={() => setShowTasks(value => !value)}>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showTasks && 'rotate-180')} />
            {showTasks ? 'Ẩn' : 'Xem'} {inPeriod.length} việc trong kỳ
          </button>
          {showTasks && (
            <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {inPeriod.map(task => {
                const state = timeliness(task, today);
                return (
                  <li key={task.id} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-fg">{task.tieuDe || '(Không tiêu đề)'}</span>
                    {task.hanHoanThanh && <span className="shrink-0 text-muted">Hạn {fmtDate(task.hanHoanThanh).slice(0, 5)}</span>}
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/* ---------------- Chọn kỳ ---------------- */

const PeriodFields: React.FC<{ draft: Partial<StaffEvaluation>; onChange: (patch: Partial<StaffEvaluation>) => void }> = ({ draft, onChange }) => (
  <FormGrid cols={3}>
    <Field label="Loại">
      <Select value={draft.loaiDanhGia || 'Quý'} onChange={event => onChange({ loaiDanhGia: event.target.value })} options={['Quý', 'Năm']} />
    </Field>
    {draft.loaiDanhGia !== 'Năm' && (
      <Field label="Quý">
        <Select value={draft.quy || 'Q1'} onChange={event => onChange({ quy: event.target.value })} options={['Q1', 'Q2', 'Q3', 'Q4']} />
      </Field>
    )}
    <Field label="Năm">
      <Input type="number" value={draft.nam || ''} onChange={event => onChange({ nam: Number(event.target.value) })} />
    </Field>
  </FormGrid>
);

const TotalLine: React.FC<{ draft: Partial<StaffEvaluation>; reward?: RewardPeriod | null }> = ({ draft, reward }) => {
  const complete = missingCriteria(draft).length === 0;
  const criteriaScore = calcScore(draft);
  const score = reward ? finalScore(criteriaScore, reward.applied) : criteriaScore;
  return (
    <div className="space-y-2 border-t border-line pt-3 text-sm">
      {reward && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-muted">Điểm tiêu chí (có trọng số)</span>
            <span className="num font-medium text-fg">{complete ? criteriaScore : '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">
              Thưởng / phạt kỳ này
              <span className="ml-1 text-xs text-faint">
                (+{reward.bonus} / −{reward.penalty} ÷ {reward.months} tháng = {reward.average}
                {reward.applied !== Math.round(reward.average) ? `, giới hạn ±${REWARD_CAP}` : ''})
              </span>
            </span>
            <span className={cn('num font-semibold', reward.applied > 0 ? 'text-blue-600 dark:text-blue-400' : reward.applied < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-faint')}>
              {fmtSigned(reward.applied)}
            </span>
          </div>
        </>
      )}
      <div className="flex items-center justify-between">
      <span className="text-muted">{reward ? 'Điểm cuối' : 'Điểm tổng (có trọng số)'}</span>
      {complete ? (
        <span className="flex items-center gap-2">
          <span className="num text-xl font-semibold text-fg">{score}</span>
          <Badge tone={RANK_TONE[rankFromScore(score)]}>{rankFromScore(score)}</Badge>
        </span>
      ) : (
        <span className="text-xs text-faint">Chấm đủ các tiêu chí để xem xếp loại</span>
      )}
      </div>
    </div>
  );
};

const RankScale = () => (
  <p className="text-xs text-faint">
    Thang xếp loại: {RANKS.map((rank, index) => `${rank.label} ${index === 0 ? `≥ ${rank.min}` : index === RANKS.length - 1 ? `< ${RANKS[index - 1].min}` : `${rank.min}–${RANKS[index - 1].min - 1}`}`).join(' · ')}
  </p>
);

/* ---------------- Dialog trưởng khoa chấm ---------------- */

export const EvaluationDialog: React.FC<{
  draft: Partial<StaffEvaluation> | null;
  onChange: (draft: Partial<StaffEvaluation>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  personName: string;
  tasks: StaffTask[];
  evaluations: StaffEvaluation[];
  today: string;
  errors: string[];
  onOpenExisting: (evaluation: StaffEvaluation) => void;
  reward: RewardPeriod | null;
}> = ({ draft, onChange, onClose, onSave, saving, personName, tasks, evaluations, today, errors, onOpenExisting, reward }) => {
  const stats = useMemo(() => (draft ? periodStats(tasks, periodRange(draft), today) : null), [draft, tasks, today]);
  if (!draft || !stats) return null;
  const patch = (value: Partial<StaffEvaluation>) => onChange({ ...draft, ...value });
  const set = criteriaSetOf(draft);
  const self = parseSelfAssessment(draft);
  const duplicate = evaluations.find(item => item.id !== draft.id && samePeriod(item, draft));
  const score = finalScore(calcScore(draft), reward?.applied || 0);
  const complete = missingCriteria(draft).length === 0;
  const gap = stats.suggested === null || !isScored(draft.diemHoanThanhCongViec) ? 0 : Math.abs(Number(draft.diemHoanThanhCongViec) - stats.suggested);
  const commentRequired = complete && (isExtremeRank(rankFromScore(score)) || gap >= SUGGESTION_TOLERANCE);

  return (
    <Dialog
      open
      persistent
      onClose={onClose}
      size="xl"
      title={draft.id && !isPendingEvaluation(draft) ? `Sửa đánh giá ${personName}` : `Đánh giá ${personName}`}
      description={isPendingEvaluation(draft) ? 'Nhân viên đã tự đánh giá — điểm tự chấm hiện bên cạnh từng tiêu chí.' : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" loading={saving} disabled={Boolean(duplicate)} onClick={onSave}>
            Lưu đánh giá
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <PeriodFields draft={draft} onChange={patch} />
          {duplicate && (
            <Callout
              tone="warning"
              title={`${personName} đã có bản đánh giá ${periodLabel(duplicate)}`}
              action={
                <Button size="sm" onClick={() => onOpenExisting(duplicate)}>
                  Mở bản đó
                </Button>
              }
            >
              Mỗi kỳ chỉ một bản đánh giá. Hãy sửa bản đã có hoặc chọn kỳ khác.
            </Callout>
          )}
          <PeriodSummary stats={stats} tasks={tasks} today={today} onApply={value => patch({ diemHoanThanhCongViec: value })} />
          {self && (
            <div className="rounded-2xl border border-line p-3 text-sm">
              <p className="font-medium text-fg">Ý kiến tự đánh giá</p>
              <p className="mt-1 whitespace-pre-line text-muted">{self.nhanXet || 'Không ghi ý kiến.'}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Field label="Bộ tiêu chí">
            {set === 'LEGACY' ? (
              <p className="text-sm text-muted">Bộ tiêu chí cũ (5 tiêu chí, trọng số đều) — giữ nguyên để không đổi điểm đã chấm.</p>
            ) : (
              <Segmented<StaffGroup>
                size="sm"
                value={set}
                onChange={value => patch({ nhomDanhGia: value })}
                items={(Object.keys(GROUP_LABEL) as StaffGroup[]).map(value => ({ value, label: GROUP_LABEL[value] }))}
              />
            )}
          </Field>
          <div className="space-y-4 rounded-2xl border border-line p-4">
            {CRITERIA_SETS[set].map(criterion => (
              <ScoreRow
                key={criterion.key}
                criterion={criterion}
                value={draft[criterion.key]}
                onChange={value => patch({ [criterion.key]: value } as Partial<StaffEvaluation>)}
                selfScore={self?.scores[criterion.key]}
                suggested={criterion.key === 'diemHoanThanhCongViec' ? stats.suggested : undefined}
              />
            ))}
            <TotalLine draft={draft} reward={reward} />
            <RankScale />
          </div>
          <Field
            label="Nhận xét"
            required={commentRequired}
            hint={commentRequired ? (gap >= SUGGESTION_TOLERANCE ? `Điểm hoàn thành công việc lệch ${gap} so với số liệu — ghi lý do.` : 'Xếp loại cao nhất/thấp nhất cần có căn cứ.') : 'Điểm mạnh, điểm cần cải thiện, mục tiêu kỳ tới.'}
          >
            <Textarea value={draft.nhanXet || ''} onChange={event => patch({ nhanXet: event.target.value })} rows={4} />
          </Field>
          {errors.length > 0 && (
            <Callout tone="danger" title="Chưa lưu được">
              <ul className="list-disc pl-4">
                {errors.map(error => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Callout>
          )}
        </div>
      </div>
    </Dialog>
  );
};

/* ---------------- Dialog nhân viên tự đánh giá ---------------- */

export const SelfAssessmentDialog: React.FC<{
  draft: Partial<StaffEvaluation> | null;
  onChange: (draft: Partial<StaffEvaluation>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  tasks: StaffTask[];
  evaluations: StaffEvaluation[];
  today: string;
  errors: string[];
}> = ({ draft, onChange, onClose, onSave, saving, tasks, evaluations, today, errors }) => {
  const stats = useMemo(() => (draft ? periodStats(tasks, periodRange(draft), today) : null), [draft, tasks, today]);
  if (!draft || !stats) return null;
  const self = parseSelfAssessment(draft) || { scores: {}, nhanXet: '', ngay: today };
  const writeSelf = (next: typeof self) => onChange({ ...draft, tuDanhGiaJson: JSON.stringify(next) });
  const duplicate = evaluations.find(item => item.id !== draft.id && samePeriod(item, draft));
  const scoresDraft = { ...draft, ...self.scores } as Partial<StaffEvaluation>;

  return (
    <Dialog
      open
      persistent
      onClose={onClose}
      size="lg"
      title="Tự đánh giá"
      description="Trưởng khoa sẽ xem phần tự đánh giá này khi chấm điểm chính thức."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" loading={saving} disabled={Boolean(duplicate)} onClick={onSave}>
            Gửi tự đánh giá
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <PeriodFields draft={draft} onChange={value => onChange({ ...draft, ...value })} />
        {duplicate && (
          <Callout tone="warning" title={`Kỳ ${periodLabel(duplicate)} đã có bản đánh giá`}>
            Chọn kỳ khác.
          </Callout>
        )}
        <PeriodSummary stats={stats} tasks={tasks} today={today} />
        <div className="space-y-4 rounded-2xl border border-line p-4">
          {criteriaOf(draft).map(criterion => (
            <ScoreRow
              key={criterion.key}
              criterion={criterion}
              value={self.scores[criterion.key]}
              onChange={value => {
                const scores = { ...self.scores };
                if (value === '') delete scores[criterion.key];
                else scores[criterion.key] = value;
                writeSelf({ ...self, scores });
              }}
            />
          ))}
          <TotalLine draft={scoresDraft} />
        </div>
        <Field label="Ý kiến của bạn" hint="Kết quả nổi bật, khó khăn, đề xuất.">
          <Textarea value={self.nhanXet} onChange={event => writeSelf({ ...self, nhanXet: event.target.value })} rows={3} />
        </Field>
        {errors.length > 0 && (
          <Callout tone="danger" title="Chưa gửi được">
            {errors.join('. ')}
          </Callout>
        )}
      </div>
    </Dialog>
  );
};

/* ---------------- Nhân viên xác nhận kết quả ---------------- */

export const AcknowledgeDialog: React.FC<{
  evaluation: StaffEvaluation | null;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  saving: boolean;
}> = ({ evaluation, onClose, onConfirm, saving }) => {
  const [comment, setComment] = useState('');
  if (!evaluation) return null;
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Xác nhận kết quả ${periodLabel(evaluation)}`}
      description={`${evaluation.xepLoai} · ${evaluation.diemTong} điểm`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" icon={ShieldCheck} loading={saving} onClick={() => onConfirm(comment.trim())}>
            Xác nhận đã xem
          </Button>
        </>
      }
    >
      <Field label="Ý kiến phản hồi (không bắt buộc)" hint="Nếu chưa đồng ý với kết quả, ghi rõ lý do để trưởng khoa xem lại.">
        <Textarea value={comment} onChange={event => setComment(event.target.value)} rows={3} />
      </Field>
    </Dialog>
  );
};

/* ---------------- In ---------------- */

const openPrint = (options: Parameters<typeof printTable>[0]) => {
  if (!printTable(options)) showToast('Trình duyệt chặn cửa sổ in — hãy cho phép popup', 'error');
};

export const printEvaluation = (evaluation: StaffEvaluation, personName: string) => openPrint(evaluationPrintModel(evaluation, personName));

/* ---------------- Thẻ một bản đánh giá ---------------- */

export const EvaluationCard: React.FC<{
  evaluation: StaffEvaluation;
  compact?: boolean;
  canManage?: boolean;
  isOwner?: boolean;
  onEdit?: (evaluation: StaffEvaluation) => void;
  onDelete?: (evaluation: StaffEvaluation) => void;
  onEditSelf?: (evaluation: StaffEvaluation) => void;
  onAcknowledge?: (evaluation: StaffEvaluation) => void;
  onPrint?: (evaluation: StaffEvaluation) => void;
  /** Mức thưởng/phạt hiện tại nếu đã khác lúc chấm (null = vẫn khớp). */
  staleAdjustment?: number | null;
}> = ({ evaluation, compact, canManage, isOwner, onEdit, onDelete, onEditSelf, onAcknowledge, onPrint, staleAdjustment = null }) => {
  const pending = isPendingEvaluation(evaluation);
  const self = parseSelfAssessment(evaluation);
  const snapshot = parsePeriodSnapshot(evaluation);
  const criteria = criteriaOf(evaluation);
  const menuItems = [
    ...(canManage && onEdit ? [{ label: pending ? 'Chấm điểm' : 'Sửa', icon: Edit3, onSelect: () => onEdit(evaluation) }] : []),
    ...(isOwner && pending && onEditSelf ? [{ label: 'Sửa tự đánh giá', icon: Edit3, onSelect: () => onEditSelf(evaluation) }] : []),
    ...(!pending && onPrint ? [{ label: 'In phiếu đánh giá', icon: Printer, onSelect: () => onPrint(evaluation) }] : []),
    ...(canManage && onDelete ? [{ label: 'Xoá', icon: Trash2, danger: true, onSelect: () => onDelete(evaluation) }] : []),
  ];

  return (
    <div className={cn('rounded-2xl border border-line', compact ? 'p-3' : 'p-4')}>
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('font-semibold text-fg', compact && 'text-sm')}>{periodLabel(evaluation)}</p>
        {pending ? (
          <Badge tone="warning" icon={Clock}>
            Chờ trưởng khoa chấm
          </Badge>
        ) : (
          <Badge tone={RANK_TONE[evaluation.xepLoai] || 'neutral'} icon={Star}>
            {evaluation.xepLoai} · {evaluation.diemTong}
          </Badge>
        )}
        {!pending && <Badge tone={STATUS_TONE[evaluation.trangThai || ''] || 'neutral'}>{evaluation.trangThai}</Badge>}
        <span className="ml-auto text-xs text-muted">
          {pending ? `Tự đánh giá ${fmtDate(self?.ngay || evaluation.ngayDanhGia)}` : `${evaluation.nguoiDanhGia} · ${fmtDate(evaluation.ngayDanhGia)}`}
        </span>
        {menuItems.length > 0 && (
          <Menu trigger={({ toggle }) => <Button size="xs" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />} items={menuItems} />
        )}
      </div>

      <div className={cn('mt-3 grid grid-cols-1 gap-x-6 gap-y-2', !compact && 'sm:grid-cols-2')}>
        {criteria.map(criterion => {
          const selfScore = self?.scores[criterion.key as CriterionKey];
          return (
            <div key={criterion.key} className="flex items-center gap-3 text-xs">
              <span className="w-40 shrink-0 text-muted">
                {criterion.label} <span className="text-faint">{criterion.weight}%</span>
              </span>
              {pending ? (
                <span className="num flex-1 text-fg">{selfScore ?? '—'} <span className="text-faint">(tự chấm)</span></span>
              ) : (
                <>
                  <Progress value={Number(evaluation[criterion.key]) || 0} className="flex-1" showLabel />
                  {selfScore !== undefined && <span className="num w-10 shrink-0 text-right text-faint" title="Điểm tự chấm">({selfScore})</span>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {!pending && Number(evaluation.diemThuongPhat || 0) !== 0 && (
        <p className="mt-3 text-xs text-muted">
          Điểm tiêu chí {evaluation.diemTieuChi} · thưởng / phạt <b className={Number(evaluation.diemThuongPhat) > 0 ? 'text-blue-600' : 'text-rose-600'}>{fmtSigned(Number(evaluation.diemThuongPhat))}</b> → {evaluation.diemTong}
        </p>
      )}
      {staleAdjustment !== null && (
        <Callout tone="warning" icon={AlertTriangle} className="mt-3" title="Thưởng / phạt của kỳ đã thay đổi sau khi chấm">
          Lúc chấm áp {fmtSigned(Number(evaluation.diemThuongPhat) || 0)}, hiện tại là {fmtSigned(staleAdjustment)}.
          {canManage && onEdit ? ' Mở "Sửa" rồi lưu lại để cập nhật điểm cuối.' : ' Trưởng khoa sẽ cập nhật lại điểm cuối.'}
        </Callout>
      )}
      {snapshot && !pending && (
        <p className="mt-3 text-xs text-muted">
          Căn cứ: {snapshot.total} việc trong kỳ · {snapshot.onTime} xong đúng hạn · {snapshot.late} xong trễ · {snapshot.overdue} quá hạn
          {snapshot.suggested !== null && <> · gợi ý {snapshot.suggested}</>}
        </p>
      )}
      {evaluation.nhanXet && <p className="mt-3 whitespace-pre-line rounded-xl bg-sunken px-3 py-2 text-sm text-fg">{evaluation.nhanXet}</p>}
      {self?.nhanXet && (
        <p className="mt-2 whitespace-pre-line text-xs text-muted">
          <b className="text-fg">Tự đánh giá:</b> {self.nhanXet}
        </p>
      )}
      {evaluation.trangThai === EVAL_STATUS.acknowledged && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span>
            Nhân viên đã xác nhận {fmtDate(evaluation.ngayXacNhan)}
            {evaluation.yKienNhanVien && (
              <>
                {' '}
                — <MessageSquare className="inline h-3 w-3" /> “{evaluation.yKienNhanVien}”
              </>
            )}
          </span>
        </p>
      )}
      {isOwner && !pending && evaluation.trangThai !== EVAL_STATUS.acknowledged && onAcknowledge && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="primary" icon={ShieldCheck} onClick={() => onAcknowledge(evaluation)}>
            Xác nhận đã xem
          </Button>
        </div>
      )}
    </div>
  );
};

/* ---------------- Tab Đánh giá ---------------- */

type PeopleFilter = 'all' | 'todo';

export const EvaluationsTab: React.FC<{
  manager: boolean;
  me: string;
  users: Array<{ username: string; fullName: string }>;
  evaluations: StaffEvaluation[];
  currentPeriod: Partial<StaffEvaluation>;
  selected: string;
  onSelect: (username: string) => void;
  loading: boolean;
  onEvaluate: (username: string) => void;
  onEdit: (evaluation: StaffEvaluation) => void;
  onDelete: (evaluation: StaffEvaluation) => void;
  onSelfAssess: () => void;
  onEditSelf: (evaluation: StaffEvaluation) => void;
  onAcknowledge: (evaluation: StaffEvaluation) => void;
  rewards: StaffReward[];
  /** Người dùng hiện tại có được chấm người này không. */
  canScoreUser: (username: string) => boolean;
}> = ({ manager, me, users, evaluations, currentPeriod, selected, onSelect, loading, onEvaluate, onEdit, onDelete, onSelfAssess, onEditSelf, onAcknowledge, rewards, canScoreUser }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PeopleFilter>('todo');
  const nameOf = (username: string) => users.find(item => item.username === username)?.fullName || username;

  const people = useMemo(
    () =>
      users.map(item => {
        const list = evaluations.filter(evaluation => evaluation.userId === item.username).sort(byPeriodDesc);
        const latest = list.find(evaluation => !isPendingEvaluation(evaluation));
        const current = list.find(evaluation => samePeriod(evaluation, { ...currentPeriod, userId: item.username }));
        return { ...item, latest, current };
      }),
    [users, evaluations, currentPeriod],
  );
  const todoCount = people.filter(item => !item.current || isPendingEvaluation(item.current)).length;
  const visiblePeople = people
    .filter(item => filter === 'all' || !item.current || isPendingEvaluation(item.current))
    .filter(item => matchesQuery(search, item.fullName, item.username));

  const target = manager ? selected : me;
  const personEvaluations = evaluations.filter(item => item.userId === target).sort(byPeriodDesc);
  const myCurrent = people.find(item => item.username === me)?.current;
  const scoredThisPeriod = people.filter(item => item.current && !isPendingEvaluation(item.current)).length;
  const printSummary = () => {
    if (!scoredThisPeriod) return showToast(`Chưa có bản đánh giá nào đã chấm cho kỳ ${periodLabel(currentPeriod)}`, 'info');
    openPrint(periodSummaryPrintModel(users, evaluations, currentPeriod));
  };

  const detail = (
    <div className="min-w-0 p-4 sm:p-5">
      {loading ? (
        <SkeletonRows rows={3} />
      ) : !target ? (
        <EmptyState icon={UserRound} title="Chọn nhân viên để xem đánh giá" />
      ) : (
        <div className="space-y-4">
          {(!manager || !canScoreUser(me)) && target === me && !myCurrent && (
            <Callout
              tone="info"
              icon={Award}
              title={`Bạn chưa tự đánh giá kỳ ${periodLabel(currentPeriod)}`}
              action={
                <Button size="sm" variant="primary" onClick={onSelfAssess}>
                  Tự đánh giá
                </Button>
              }
            >
              Phần tự đánh giá giúp trưởng khoa có thêm thông tin khi chấm điểm.
            </Callout>
          )}
          {manager && (
            <div className="flex flex-wrap items-center gap-2">
              <Avatar name={nameOf(target)} size="sm" />
              <p className="font-semibold text-fg">{nameOf(target)}</p>
              {canScoreUser(target) ? (
                <Button size="sm" variant="soft" icon={Award} className="ml-auto" onClick={() => onEvaluate(target)}>
                  Đánh giá kỳ {periodLabel(currentPeriod)}
                </Button>
              ) : (
                <span className="ml-auto text-xs text-muted">Bản của bạn do trưởng khoa chấm</span>
              )}
            </div>
          )}
          {personEvaluations.length === 0 ? (
            <EmptyState icon={Award} title={manager ? `${nameOf(target)} chưa có bản đánh giá nào` : 'Bạn chưa có bản đánh giá nào'} compact />
          ) : (
            personEvaluations.map(evaluation => (
              <EvaluationCard
                key={evaluation.id}
                evaluation={evaluation}
                canManage={manager && canScoreUser(evaluation.userId)}
                isOwner={evaluation.userId === me}
                onPrint={item => printEvaluation(item, nameOf(item.userId))}
                staleAdjustment={staleRewardAdjustment(evaluation, rewards)}
                onEdit={onEdit}
                onDelete={onDelete}
                onEditSelf={onEditSelf}
                onAcknowledge={onAcknowledge}
              />
            ))
          )}
        </div>
      )}
    </div>
  );

  if (!manager) return detail;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr]">
      <div className="border-b border-line md:border-b-0 md:border-r">
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm nhân viên…" className="min-w-0 flex-1" />
            <Button size="md" variant="ghost" iconOnly icon={Printer} onClick={printSummary} aria-label={`In bảng tổng hợp xếp loại ${periodLabel(currentPeriod)}`} title={`In bảng tổng hợp xếp loại ${periodLabel(currentPeriod)} (${scoredThisPeriod} đã chấm)`} />
          </div>
          <Segmented<PeopleFilter>
            size="sm"
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'todo', label: `Cần chấm ${periodLabel(currentPeriod)}`, count: todoCount },
              { value: 'all', label: 'Tất cả', count: people.length },
            ]}
          />
        </div>
        <ul className="scrollbar-thin max-h-[60vh] overflow-y-auto px-2 pb-2">
          {visiblePeople.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Đã chấm xong kỳ này 🎉</li>}
          {visiblePeople.map(item => (
            <li key={item.username}>
              <button
                onClick={() => onSelect(item.username)}
                className={cn('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left', selected === item.username ? 'bg-primary-soft' : 'hover:bg-sunken')}
              >
                <Avatar name={item.fullName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{item.fullName}</span>
                  <span className="block truncate text-xs text-muted">
                    {item.current
                      ? isPendingEvaluation(item.current)
                        ? 'Đã tự đánh giá — chờ chấm'
                        : `${periodLabel(item.current)}: ${item.current.trangThai}`
                      : item.latest
                        ? `Gần nhất ${periodLabel(item.latest)}`
                        : 'Chưa đánh giá'}
                  </span>
                </span>
                {item.current && isPendingEvaluation(item.current) ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                ) : item.latest ? (
                  <span className="num text-sm font-semibold text-fg" title={item.latest.xepLoai}>
                    {item.latest.diemTong}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {detail}
    </div>
  );
};
