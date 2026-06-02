declare const process: {
  env: Record<string, string | undefined>;
};

type RpcRequest = {
  funcName: string;
  args: any[];
  sessionToken?: string;
};

function jsonResponse(res: any, status: number, data: any) {
  res.status(status).json(data);
}

function errorResponse(res: any, status: number, code: string, message: string, detail?: any) {
  jsonResponse(res, status, {
    success: false,
    code,
    error: message,
    detail,
  });
}

function parseRequestBody(req: any) {
  if (typeof req?.body === 'string') {
    return JSON.parse(req.body);
  }

  return req?.body;
}

function parseGasJson(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return undefined;
  }
}

function isHtml(text: string) {
  return /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
}

function normalizeGasResponse(value: any) {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'success' in value
  ) {
    if (value.success === false) {
      return {
        success: false,
        error: value.error || value.message || 'Google Apps Script returned an error',
      };
    }

    if ('data' in value) {
      return value.data;
    }
  }

  return value;
}

// Vercel API route: browser -> /api/rpc -> Google Apps Script.
// Contract: receives { funcName, args } and returns data compatible with dataService.ts.
export default async function handler(req: any, res: any) {
  if (req?.method !== 'POST') {
    errorResponse(res, 405, 'RPC_METHOD_NOT_ALLOWED', 'Method Not Allowed');
    return;
  }

  const gasApiUrl = process.env.GAS_API_URL;

  if (!gasApiUrl) {
    console.error('[RPC PROXY] Missing GAS_API_URL');
    errorResponse(res, 500, 'RPC_CONFIG_ERROR', 'Missing GAS_API_URL on Vercel server');
    return;
  }

  let payload: Partial<RpcRequest> | undefined;

  try {
    payload = parseRequestBody(req);
  } catch (err) {
    console.error('[RPC PROXY] Invalid JSON request body', err);
    errorResponse(res, 400, 'RPC_BAD_REQUEST', 'Invalid JSON request body');
    return;
  }

  const funcName = payload?.funcName;
  const args = Array.isArray(payload?.args) ? payload?.args : [];
  const authHeader =
    typeof req?.headers?.authorization === 'string'
      ? req.headers.authorization
      : '';
  const sessionToken =
    payload?.sessionToken ||
    (authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '');
  const forwardedFor =
    typeof req?.headers?.['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : '';
  const ip =
    forwardedFor ||
    (typeof req?.headers?.['x-real-ip'] === 'string'
      ? req.headers['x-real-ip']
      : '');
  const userAgent =
    typeof req?.headers?.['user-agent'] === 'string'
      ? req.headers['user-agent']
      : '';

  if (!funcName || typeof funcName !== 'string') {
    errorResponse(res, 400, 'RPC_BAD_REQUEST', 'Invalid payload: funcName is required');
    return;
  }

  try {
    const gasResponse = await fetch(gasApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ funcName, args, sessionToken, ip, userAgent }),
    });

    const text = await gasResponse.text();
    const parsed = parseGasJson(text);

    if (!gasResponse.ok) {
      const detail = parsed || text.slice(0, 300);
      console.error('[RPC PROXY] GAS HTTP error', {
        funcName,
        status: gasResponse.status,
        detail,
      });
      errorResponse(res, 502, 'RPC_FETCH_FAILED', `Google Apps Script HTTP ${gasResponse.status}`, detail);
      return;
    }

    if (parsed === undefined || isHtml(text)) {
      const detail = text.slice(0, 300);
      console.error('[RPC PROXY] GAS returned non-JSON response', {
        funcName,
        detail,
      });
      errorResponse(res, 502, 'RPC_BAD_RESPONSE', 'Google Apps Script returned non-JSON response', detail);
      return;
    }

    jsonResponse(res, 200, normalizeGasResponse(parsed));
  } catch (err: any) {
    console.error('[RPC PROXY] Forward failed', {
      funcName,
      message: err?.message || String(err),
    });
    errorResponse(res, 502, 'RPC_FETCH_FAILED', err?.message || 'Failed to reach Google Apps Script');
  }
}
