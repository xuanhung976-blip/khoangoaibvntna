import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

type FieldProps = {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  htmlFor?: string;
};

export const Field: React.FC<FieldProps> = ({ label, hint, error, required, className, action, children, htmlFor }) => (
  <div className={cn('min-w-0', className)}>
    {(label || action) && (
      <div className="flex items-end justify-between gap-2">
        {label && (
          <label htmlFor={htmlFor} className="label">
            {label}
            {required && <span className="ml-0.5 text-rose-500">*</span>}
          </label>
        )}
        {action && <div className="mb-1.5">{action}</div>}
      </div>
    )}
    {children}
    {error ? (
      <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
    ) : hint ? (
      <p className="mt-1 text-xs text-muted">{hint}</p>
    ) : null}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => (
    <input ref={ref} className={cn('input', invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15', className)} {...rest} />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 3, ...rest }, ref) => <textarea ref={ref} rows={rows} className={cn('input resize-y leading-relaxed', className)} {...rest} />,
);
Textarea.displayName = 'Textarea';

type SelectOption = { value: string; label: string } | string;

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { options?: SelectOption[]; placeholder?: string }
>(({ className, options, placeholder, children, ...rest }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn('input cursor-pointer appearance-none pr-9', className)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map(option =>
        typeof option === 'string' ? (
          <option key={option} value={option}>
            {option}
          </option>
        ) : (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ),
      )}
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
  </div>
));
Select.displayName = 'Select';

type SwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
};

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, description, disabled }) => (
  <label className={cn('flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-60')}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
    {(label || description) && (
      <span className="min-w-0">
        {label && <span className="block text-sm font-medium text-fg">{label}</span>}
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    )}
  </label>
);

export const Checkbox: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}> = ({ checked, onChange, label, disabled, className }) => (
  <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm', disabled && 'cursor-not-allowed opacity-60', className)}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={event => onChange(event.target.checked)}
      className="h-4 w-4 cursor-pointer rounded border-line accent-[rgb(var(--primary))]"
    />
    {label}
  </label>
);

/** Nhóm chip chọn nhanh (thay cho select ít lựa chọn). */
export function ChipGroup<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: React.ReactNode; activeClass?: string }>;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg border font-medium transition-colors',
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
              active
                ? option.activeClass || 'border-primary bg-primary text-primary-fg'
                : 'border-line bg-surface text-muted hover:border-faint hover:text-fg',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Lưới form đáp ứng: 1 cột trên mobile, n cột trên màn hình lớn. */
export const FormGrid: React.FC<{ cols?: 2 | 3 | 4; className?: string; children: React.ReactNode }> = ({ cols = 2, className, children }) => (
  <div
    className={cn(
      'grid grid-cols-1 gap-4',
      cols === 2 && 'sm:grid-cols-2',
      cols === 3 && 'sm:grid-cols-3',
      cols === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
      className,
    )}
  >
    {children}
  </div>
);

export const FormSection: React.FC<{ title: React.ReactNode; description?: React.ReactNode; icon?: React.ElementType; children: React.ReactNode; className?: string }> = ({
  title,
  description,
  icon: Icon,
  children,
  className,
}) => (
  <section className={cn('space-y-4', className)}>
    <div className="flex items-start gap-2.5">
      {Icon && (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
    </div>
    {children}
  </section>
);
