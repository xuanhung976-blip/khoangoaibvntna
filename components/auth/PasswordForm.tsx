import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { changeMyPassword } from '../../services/dataService';
import type { User } from '../../types';
import { Button, Field, Input, errorMessage } from '../ui';
import { cn } from '../../lib/cn';

const strength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
};

const STRENGTH_LABEL = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
const STRENGTH_COLOR = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];

/** Form đổi mật khẩu dùng chung cho màn hình bắt buộc đổi và hộp thoại tự đổi. */
export const PasswordForm: React.FC<{ user: User; onDone: () => void; footer?: React.ReactNode; submitLabel?: string }> = ({
  user,
  onDone,
  footer,
  submitLabel = 'Đổi mật khẩu',
}) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!current || !next || !confirm) return 'Vui lòng nhập đủ thông tin.';
    if (next.length < 6) return 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    if (next === '123456') return 'Không được dùng mật khẩu mặc định 123456.';
    if (next.toLowerCase() === user.username.toLowerCase()) return 'Mật khẩu không được trùng tên đăng nhập.';
    if (next !== confirm) return 'Hai lần nhập mật khẩu mới không khớp.';
    return '';
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await changeMyPassword(current, next);
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'Không đổi được mật khẩu'));
    } finally {
      setLoading(false);
    }
  };

  const score = strength(next);
  const type = show ? 'text' : 'password';

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">{error}</div>}
      <Field label="Mật khẩu hiện tại" required>
        <Input type={type} value={current} onChange={event => setCurrent(event.target.value)} autoComplete="current-password" />
      </Field>
      <Field
        label="Mật khẩu mới"
        required
        action={
          <button type="button" onClick={() => setShow(value => !value)} className="flex items-center gap-1 text-xs text-muted hover:text-fg">
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {show ? 'Ẩn' : 'Hiện'}
          </button>
        }
      >
        <Input type={type} value={next} onChange={event => setNext(event.target.value)} autoComplete="new-password" />
        {next && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map(index => (
                <span key={index} className={cn('h-1 flex-1 rounded-full', index < score ? STRENGTH_COLOR[score] : 'bg-line')} />
              ))}
            </div>
            <span className="text-xs text-muted">{STRENGTH_LABEL[score]}</span>
          </div>
        )}
      </Field>
      <Field label="Nhập lại mật khẩu mới" required error={confirm && confirm !== next ? 'Chưa khớp với mật khẩu mới' : undefined}>
        <Input type={type} value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" invalid={Boolean(confirm && confirm !== next)} />
      </Field>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {footer}
        <Button type="submit" variant="primary" loading={loading} icon={KeyRound}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
