import { useCallback } from 'react';
import { getMyAccess, type MyAccess } from '../services/dataService';
import { useResource } from '../lib/resource';
import { useApp } from '../context/AppContext';

export const ACCESS_KEY = 'access';

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

/**
 * Quyền theo ma trận phân quyền của người đang đăng nhập.
 * Khi chưa bật kiểm soát quyền chi tiết (hoặc chưa tải xong) mọi quyền đều được phép — máy chủ vẫn là nơi chặn cuối cùng.
 */
export const useAccess = () => {
  const { chief } = useApp();
  const { data, reload } = useResource<MyAccess>(ACCESS_KEY, () => getMyAccess(), { staleMs: 2 * 60_000 });
  const can = useCallback(
    (module: string | undefined, action: PermissionAction = 'view') => {
      if (!module || chief || !data?.enforced) return true;
      return !data.denied.includes(`${module}:${action}`);
    },
    [chief, data],
  );
  return { can, enforced: data?.enforced === true, reload };
};
