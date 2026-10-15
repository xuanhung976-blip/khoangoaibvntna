import React, { useEffect, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Dialog } from './Overlay';
import { Button } from './Button';
import { cn } from '../../lib/cn';

type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
};

type Request = ConfirmOptions & { resolve: (value: boolean) => void };

let pushRequest: ((request: Request) => void) | null = null;

/** Hộp thoại xác nhận dạng Promise thay cho window.confirm. */
export const confirmAction = (options: ConfirmOptions): Promise<boolean> =>
  new Promise(resolve => {
    if (!pushRequest) {
      resolve(window.confirm(options.title));
      return;
    }
    pushRequest({ ...options, resolve });
  });

export const ConfirmHost: React.FC = () => {
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    pushRequest = next => setRequest(next);
    return () => {
      pushRequest = null;
    };
  }, []);

  const close = (value: boolean) => {
    request?.resolve(value);
    setRequest(null);
  };

  const danger = request?.tone !== 'primary';
  return (
    <Dialog
      open={Boolean(request)}
      onClose={() => close(false)}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            {request?.cancelText || 'Huỷ'}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
            {request?.confirmText || 'Xác nhận'}
          </Button>
        </>
      }
    >
      {request && (
        <div className="flex gap-4 pt-1">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              danger ? 'bg-rose-500/10 text-rose-600' : 'bg-primary-soft text-primary',
            )}
          >
            {danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-fg">{request.title}</h3>
            {request.message && <div className="mt-1 text-sm text-muted">{request.message}</div>}
          </div>
        </div>
      )}
    </Dialog>
  );
};
