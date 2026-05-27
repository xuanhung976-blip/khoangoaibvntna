type RpcRequest = {
  funcName: string;
  args: any[];
};

import { getRows, appendRow, updateRowById, deleteRowById, upsertRowByKeys } from './googleSheets';

function jsonResponse(res: any, status: number, data: any) {
  res.status(status).json(data);
}

function toBool(value: any) {
  return value === true || value === 'TRUE' || value === 'true' || value === '1' || value === 1;
}

// Vercel API route skeleton: /api/rpc
// Contract: receives { funcName, args } and returns JSON compatible with dataService.ts.
export default async function handler(req: any, res: any) {
  try {
    if (req?.method !== 'POST') {
      jsonResponse(res, 405, { error: 'Method Not Allowed' });
      return;
    }

    // Vercel usually provides req.body already parsed for JSON.
    let body: any = req?.body;
    if (!body && typeof req?.json === 'function') {
      body = await req.json();
    }

    const payload = body as Partial<RpcRequest> | undefined;
    const funcName = payload?.funcName;
    const args = (payload?.args ?? []) as any[];

    if (!funcName || typeof funcName !== 'string') {
      jsonResponse(res, 400, { error: 'Invalid payload: funcName is required' });
      return;
    }

    // Validate supported funcName contract.
    const supportedFuncNames = new Set([
      'apiGet',
      'apiAdd',
      'apiUpdate',
      'apiDelete',
      'loginUser',
      'getDashboardOverview',
      'getVipPatientsJoined',
      'addVipPatientSafe',
      'getDoctors',
      'batchSaveDailyOnCall',
      'saveRolePermissions',
    ]);

    if (!supportedFuncNames.has(funcName)) {
      jsonResponse(res, 400, { error: 'Unknown funcName', funcName });
      return;
    }

    // Dispatch based on funcName.
    switch (funcName) {
      case 'apiGet': {
        const sheetName = args[0];
        if (!sheetName || typeof sheetName !== 'string') {
          return jsonResponse(res, 400, { error: 'apiGet requires sheetName' });
        }
        const rows = await getRows(sheetName);
        return jsonResponse(res, 200, rows);
      }

      case 'apiAdd':
        // args: [sheetName, data, userRole]
        if (!args[0] || !args[1]) {
          return jsonResponse(res, 400, { error: 'apiAdd requires sheetName and data' });
        }
        try {
          const { id } = await appendRow(args[0], args[1]);
          return jsonResponse(res, 200, { success: true, id });
        } catch (e: any) {
          return jsonResponse(res, 500, { error: e?.message ?? 'Failed to add row' });
        }

      case 'apiUpdate':
        // args: [sheetName, id, data, userRole]
        if (!args[0] || !args[1] || !args[2]) {
          return jsonResponse(res, 400, { error: 'apiUpdate requires sheetName, id and data' });
        }
        try {
          await updateRowById(args[0], args[1], args[2]);
          return jsonResponse(res, 200, { success: true });
        } catch (e: any) {
          return jsonResponse(res, 500, { error: e?.message ?? 'Failed to update row' });
        }

      case 'apiDelete':
        // args: [sheetName, id, userRole]
        if (!args[0] || !args[1]) {
          return jsonResponse(res, 400, { error: 'apiDelete requires sheetName and id' });
        }
        try {
          await deleteRowById(args[0], args[1]);
          return jsonResponse(res, 200, { success: true });
        } catch (e: any) {
          return jsonResponse(res, 500, { error: e?.message ?? 'Failed to delete row' });
        }

      case 'loginUser': {
        // args: [username, password] — port from Code.js loginUser
        const username = args[0];
        const password = args[1];

        if (username === undefined || password === undefined) {
          return jsonResponse(res, 400, { error: 'loginUser requires username and password' });
        }

        const users = await getRows('Users');
        const user = users.find(
          (u) =>
            String(u.username).toLowerCase() === String(username).toLowerCase() &&
            String(u.password) === String(password),
        );

        if (!user) {
          return jsonResponse(res, 200, null);
        }

        const active = user.active ?? user.Active;
        const isActive =
          active === true ||
          active === 'TRUE' ||
          active === 'true' ||
          active === 1 ||
          active === '1';

        if (!isActive) {
          throw new Error('Tài khoản đã bị khoá.');
        }

        const { password: _pw, Password: _Pw, ...safeUser } = user;
        return jsonResponse(res, 200, safeUser);
      }

      case 'getDashboardOverview':
        return jsonResponse(res, 200, {
          clinical: { total: 0, waitingSurgery: 0, vip: 0, discharged: 0 },
          surgery: { monthTotal: 0, approved: 0 },
          science: { ongoing: 0, meetingsMonth: 0 },
          admin: { briefingToday: null, overdueTasks: 0 },
          inventory: { medsNearExpiry: 0, equipOverdue: 0 },
          onCall: { doctor: '---', nurse1: '---', nurse2: '---' },
          deadlines: [],
        });

      case 'getVipPatientsJoined':
        return jsonResponse(res, 200, []);

      case 'addVipPatientSafe':
        return jsonResponse(res, 200, { success: true });

      case 'getDoctors':
        return jsonResponse(res, 200, []);

      case 'batchSaveDailyOnCall':
        return jsonResponse(res, 200, { success: true });

      case 'saveRolePermissions': {
        const permissions = args[0];
        if (!Array.isArray(permissions)) {
          return jsonResponse(res, 400, { error: 'saveRolePermissions requires permissions array' });
        }

        for (const perm of permissions) {
          if (!perm?.role || !perm?.module) {
            return jsonResponse(res, 400, { error: 'Each permission requires role and module' });
          }

          await upsertRowByKeys('Roles_Permission', ['role', 'module'], {
            role: perm.role,
            module: perm.module,
            canView: toBool(perm.canView),
            canAdd: toBool(perm.canAdd),
            canEdit: toBool(perm.canEdit),
            canDelete: toBool(perm.canDelete),
          });
        }

        return jsonResponse(res, 200, { success: true });
      }

      default:
        // Should be unreachable due to supportedFuncNames validation above.
        jsonResponse(res, 400, { error: 'Unknown funcName', funcName });
        return;
    }
  } catch (err: any) {
    jsonResponse(res, 500, { error: err?.message ?? 'Internal Server Error' });
  }
}
