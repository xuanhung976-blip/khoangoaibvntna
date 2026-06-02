
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index.html')
      .setTitle('Khoa Ngoại Tổng Hợp - Management System')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const funcName = body.funcName;
    const args = Array.isArray(body.args) ? body.args : [];

    if (!funcName) {
      throw new Error('funcName is required');
    }

    const data = dispatchRpc(funcName, args);
    return jsonOutput({ success: true, data });
  } catch (err) {
    return jsonOutput({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function dispatchRpc(funcName, args) {
  switch (funcName) {
    case 'apiGet':
      return apiGet(args[0]);
    case 'apiAdd':
      return apiAdd(args[0], args[1], args[2]);
    case 'apiUpdate':
      return apiUpdate(args[0], args[1], args[2], args[3]);
    case 'apiDelete':
      return apiDelete(args[0], args[1], args[2]);
    case 'loginUser':
      return loginUser(args[0], args[1]);
    case 'getDashboardOverview':
      return getDashboardOverview();
    case 'getVipPatientsJoined':
      return getVipPatientsJoined();
    case 'addVipPatientSafe':
      return addVipPatientSafe(args[0], args[1]);
    case 'getDoctors':
      return getDoctors();
    case 'batchSaveDailyOnCall':
      return batchSaveDailyOnCall(args[0], args[1]);
    case 'saveRolePermissions':
      return saveRolePermissions(args[0], args[1]);
    default:
      throw new Error('Unknown funcName: ' + funcName);
  }
}

// --- UTILS ---

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error(`Sheet "${name}" not found. Please run initialization.`);
  }
  ensureKnownSheetColumns(sheet, name);
  return sheet;
}

function getKnownSheetHeaders() {
  return {
    Users: ['ID', 'Username', 'Password', 'FullName', 'Role', 'NhomChuyenMon', 'Active', 'CreatedAt', 'CanDeletePatient'],
    Roles_Permission: ['ID', 'Role', 'Module', 'CanView', 'CanAdd', 'CanEdit', 'CanDelete'],
    DS_BenhNhan: [
      'ID', 'Name', 'Dob', 'Gender', 'Room', 'Bed', 'TreatmentType', 'Status', 'Diagnosis',
      'TreatingDoctor', 'AdmissionDate', 'Notes', 'SurgeryDate', 'Surgeon', 'SurgeryMethod',
      'AssistantSurgeon1', 'AssistantSurgeon2', 'AssistantSurgeon3', 'Anesthetist',
      'AnesthetistAssistant', 'ScrubNurse', 'ApprovalDate', 'ApprovalNote', 'ActualSurgeryDate',
      'SurgeryClassification', 'InterventionType', 'ActivityType', 'PhoneNumber', 'DischargeDate'
    ],
    BN_LuuY: ['ID', 'PatientId', 'Priority', 'Reason', 'Room', 'Bed'],
    GiaoBan_Log: ['ID', 'Date', 'Host', 'Content', 'CongViecJson', 'Notes'],
    CongViec_NhanVien: [
      'ID',
      'UserId',
      'TieuDe',
      'NoiDung',
      'NguoiGiao',
      'NgayGiao',
      'HanHoanThanh',
      'MucDoUuTien',
      'TrangThai',
      'TienDo',
      'KetQua',
      'GhiChu',
      'sourceType',
      'sourceId',
      'sourceTaskId',
      'sourceTaskIndex',
      'assigneeUsername',
      'assigneeName',
      'sourceDate'
    ],
    DanhGia_NhanVien: [
      'ID',
      'UserId',
      'LoaiDanhGia',
      'Quy',
      'Nam',
      'DiemHoanThanhCongViec',
      'DiemThaiDo',
      'DiemKyLuat',
      'DiemPhoiHop',
      'DiemSangKien',
      'DiemTong',
      'XepLoai',
      'NhanXet',
      'NguoiDanhGia',
      'NgayDanhGia'
    ],
    May_Moc: ['ID', 'Name', 'Code', 'InCharge', 'PurchaseDate', 'LastMaintenanceDate', 'MaintenanceCycle', 'Condition', 'Notes'],
    Thuoc_Kho: ['ID', 'Name', 'Content', 'Quantity', 'Unit', 'ExpiryDate', 'Notes'],
    DeTai_CoSo: ['ID', 'Topic', 'Author', 'StartDate', 'Deadline', 'Progress', 'Notes'],
    SinhHoat_KH: ['ID', 'Time', 'Topic', 'Presenter', 'Location', 'Notes'],
    Vung_5S: ['ID', 'Name', 'Type', 'Pic', 'CurrentScore', 'LastCheckDate', 'Notes'],
    DanhGia_5S: ['ID', 'ZoneId', 'Date', 'Assessor', 'Score', 'Comments'],
    CaiTien_5S: ['ID', 'ZoneId', 'Content', 'Proposer', 'Status', 'Result'],
    Phan_Truc_Ngay: ['ID', 'Date', 'Doctor', 'Nurse1', 'Nurse2', 'Note'],
    Logs: ['ID', 'Timestamp', 'User', 'Action', 'Target', 'Detail'],
    AuditLogs: [
      'id',
      'timestamp',
      'actorUsername',
      'actorName',
      'actorRole',
      'module',
      'action',
      'entityType',
      'entityId',
      'entityLabel',
      'source',
      'beforeJson',
      'afterJson',
      'changesJson',
      'ip',
      'userAgent',
      'status',
      'errorMessage'
    ]
  };
}

function appendMissingHeaders(sheet, headers, requiredColumns) {
  const existing = {};
  headers.forEach(header => {
    existing[String(header).trim().toLowerCase()] = true;
  });

  const missingColumns = requiredColumns.filter(column => !existing[String(column).trim().toLowerCase()]);
  if (!missingColumns.length) return headers;

  sheet.getRange(1, headers.length + 1, 1, missingColumns.length).setValues([missingColumns]);
  return headers.concat(missingColumns);
}

function ensureKnownSheetColumns(sheet, name) {
  const requiredColumns = getKnownSheetHeaders()[name];
  if (!requiredColumns || !requiredColumns.length) return;

  const lastCol = sheet.getLastColumn();
  const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  appendMissingHeaders(sheet, headers, requiredColumns);
}

// Convert "MyColumnName" to "myColumnName", strict "ID" -> "id"
function toCamelCase(str) {
  const s = String(str).trim();
  if (s.toLowerCase() === 'id') return 'id';
  // Handle headers nicely
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// Map camelCase keys back to Sheet Headers
function getHeaderIndexMap(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return { map: {}, headers: [] };
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    // We map the camelCase key to the column INDEX (0-based)
    map[toCamelCase(h)] = i;
  });
  return { map, headers };
}

function rowToObject(row, headers) {
  const obj = {};
  headers.forEach((h, i) => {
    let val = row[i];
    // Convert Date objects to ISO string for frontend
    if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    // Convert undefined/null to empty string
    if (val === undefined || val === null) val = "";
    
    obj[toCamelCase(h)] = val;
  });
  return obj;
}

function getActorInfo_(userContext) {
  if (userContext && typeof userContext === 'object') {
    return {
      actorUsername: userContext.username || '',
      actorName: userContext.fullName || userContext.name || '',
      actorRole: userContext.role || ''
    };
  }

  return {
    actorUsername: '',
    actorName: '',
    actorRole: userContext ? String(userContext) : ''
  };
}

function getActorRole_(userContext) {
  return getActorInfo_(userContext).actorRole;
}

function getAuditSheetInfo_(sheetName) {
  const map = {
    Users: { module: 'users', entityType: 'User', labelFields: ['username', 'fullName'] },
    Roles_Permission: { module: 'permissions', entityType: 'Permission', labelFields: ['role', 'module'] },
    DS_BenhNhan: { module: 'patients', entityType: 'Patient', labelFields: ['name', 'id'] },
    BN_LuuY: { module: 'patients', entityType: 'VipPatient', labelFields: ['patientId', 'reason'] },
    GiaoBan_Log: { module: 'briefing', entityType: 'Briefing', labelFields: ['date', 'host'] },
    CongViec_NhanVien: { module: 'staff_tasks', entityType: 'StaffTask', labelFields: ['tieuDe', 'assigneeName', 'userId'] },
    DanhGia_NhanVien: { module: 'staff_evaluations', entityType: 'StaffEvaluation', labelFields: ['userId', 'nam', 'quy'] },
    Thuoc_Kho: { module: 'inventory', entityType: 'Medicine', labelFields: ['name'] },
    May_Moc: { module: 'inventory', entityType: 'Equipment', labelFields: ['name', 'code'] },
    Vung_5S: { module: '5s', entityType: 'Zone5S', labelFields: ['name'] },
    DanhGia_5S: { module: '5s', entityType: 'Evaluation5S', labelFields: ['zoneId', 'date'] },
    CaiTien_5S: { module: '5s', entityType: 'Improvement5S', labelFields: ['content'] },
    DeTai_CoSo: { module: 'research', entityType: 'ResearchTopic', labelFields: ['topic'] },
    SinhHoat_KH: { module: 'meetings', entityType: 'ScientificMeeting', labelFields: ['topic'] },
    Phan_Truc_Ngay: { module: 'nursing', entityType: 'DailyOnCall', labelFields: ['date', 'doctor'] },
    KyThuat_Moi: { module: 'new_techniques', entityType: 'NewTechnique', labelFields: ['name'] },
    NoiDung_TT: { module: 'communication', entityType: 'CommunicationContent', labelFields: ['title'] },
    Config: { module: 'config', entityType: 'Config', labelFields: ['key'] }
  };

  return map[sheetName] || { module: sheetName, entityType: sheetName, labelFields: ['name', 'title', 'id'] };
}

function getEntityLabel_(record, sheetName) {
  if (!record) return '';
  const info = getAuditSheetInfo_(sheetName);
  const parts = info.labelFields
    .map(field => record[field])
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
    .map(value => String(value).trim());
  return parts.join(' - ');
}

function sanitizeAuditValue_(value) {
  if (value === undefined || value === null) return value;

  try {
    return JSON.parse(JSON.stringify(value, function(key, val) {
      if (String(key).toLowerCase() === 'password') {
        return '[REDACTED]';
      }
      return val;
    }));
  } catch (err) {
    return String(value);
  }
}

function safeJsonStringify_(value) {
  if (value === undefined || value === null || value === '') return '';
  try {
    return JSON.stringify(sanitizeAuditValue_(value));
  } catch (err) {
    return String(value);
  }
}

function computeChanges_(beforeRecord, afterRecord) {
  if (!beforeRecord || !afterRecord) return {};

  const changes = {};
  Object.keys(afterRecord).forEach(key => {
    if (String(key).toLowerCase() === 'password') {
      if (beforeRecord[key] !== afterRecord[key]) {
        changes[key] = { before: '[REDACTED]', after: '[REDACTED]' };
      }
      return;
    }

    const beforeVal = beforeRecord[key] === undefined || beforeRecord[key] === null ? '' : beforeRecord[key];
    const afterVal = afterRecord[key] === undefined || afterRecord[key] === null ? '' : afterRecord[key];
    if (String(beforeVal) !== String(afterVal)) {
      changes[key] = { before: beforeVal, after: afterVal };
    }
  });

  return changes;
}

function classifyAuditAction_(sheetName, baseAction, data, beforeRecord, afterRecord) {
  if (sheetName === 'Users' && baseAction === 'update') {
    if (data && data.password !== undefined) return 'reset_password';
    if (data && data.active !== undefined) {
      const active = data.active === true || data.active === 'TRUE' || data.active === 'true' || data.active === 1 || data.active === '1';
      return active ? 'activate' : 'deactivate';
    }
  }

  if (sheetName === 'DS_BenhNhan' && baseAction === 'update' && data && data.status === 'DaDuyet') {
    return 'approve';
  }

  if (sheetName === 'CongViec_NhanVien' && baseAction === 'update' && data && (data.tienDo !== undefined || data.trangThai !== undefined)) {
    return 'change_progress_status';
  }

  return baseAction;
}

function logAuditEvent_(event) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('AuditLogs');
    if (!sheet) {
      sheet = ss.insertSheet('AuditLogs');
      sheet.appendRow(getKnownSheetHeaders().AuditLogs);
      sheet.setFrozenRows(1);
    }

    ensureKnownSheetColumns(sheet, 'AuditLogs');
    const { headers } = getHeaderIndexMap(sheet);
    const payload = Object.assign({
      id: Utilities.getUuid(),
      timestamp: new Date().toISOString(),
      source: 'gas',
      status: 'success'
    }, event || {});

    const row = headers.map(header => {
      const key = toCamelCase(header);
      const value = payload[key];
      return value === undefined || value === null ? '' : value;
    });

    sheet.appendRow(row);
  } catch (err) {
    console.warn('Audit log failed:', err && err.message ? err.message : err);
  }
}

function buildAuditEvent_(sheetName, action, userContext, entityId, beforeRecord, afterRecord, error) {
  const actor = getActorInfo_(userContext);
  const info = getAuditSheetInfo_(sheetName);
  const labelRecord = afterRecord || beforeRecord || {};
  const changes = beforeRecord && afterRecord ? computeChanges_(beforeRecord, afterRecord) : {};

  return Object.assign({}, actor, {
    module: info.module,
    action: action,
    entityType: info.entityType,
    entityId: entityId || labelRecord.id || '',
    entityLabel: getEntityLabel_(labelRecord, sheetName),
    source: 'gas',
    beforeJson: safeJsonStringify_(beforeRecord),
    afterJson: safeJsonStringify_(afterRecord),
    changesJson: safeJsonStringify_(changes),
    status: error ? 'failed' : 'success',
    errorMessage: error ? (error.message || String(error)) : ''
  });
}

function normalizeRole_(role) {
  return String(role || '').trim().toUpperCase();
}

function normalizePermissionAction_(action) {
  const value = String(action || '').toLowerCase();
  if (value === 'create' || value === 'add' || value === 'assign') return 'add';
  if (value === 'update' || value === 'edit' || value === 'approve' || value === 'reject' || value === 'reset_password' || value === 'activate' || value === 'deactivate' || value === 'change_progress_status' || value === 'batch_upsert') return 'edit';
  if (value === 'delete' || value === 'remove') return 'delete';
  return value || 'view';
}

function getActorFromContext_(context) {
  const info = getActorInfo_(context);
  return {
    username: info.actorUsername || '',
    fullName: info.actorName || '',
    role: normalizeRole_(info.actorRole)
  };
}

function getUserByUsername_(username) {
  if (!username) return null;
  const users = apiGet('Users');
  const search = String(username).trim().toLowerCase();
  return users.find(user => String(user.username || '').trim().toLowerCase() === search) || null;
}

function isUserActive_(user) {
  if (!user) return false;
  return user.active === true || user.active === 'TRUE' || user.active === 'true' || user.active === 1 || user.active === '1';
}

function getSheetPermissionMap_() {
  return {
    Users: { module: 'users', entityType: 'User' },
    Roles_Permission: { module: 'permissions', entityType: 'Permission' },
    Permissions: { module: 'permissions', entityType: 'Permission' },
    DS_BenhNhan: { module: 'clinical', entityType: 'Patient' },
    Patients: { module: 'clinical', entityType: 'Patient' },
    BN_LuuY: { module: 'vip', entityType: 'VipPatient' },
    GiaoBan_Log: { module: 'briefing', entityType: 'DailyBriefing' },
    DailyBriefing: { module: 'briefing', entityType: 'DailyBriefing' },
    CongViec_NhanVien: { module: 'staff_performance', entityType: 'StaffTask' },
    DanhGia_NhanVien: { module: 'staff_performance', entityType: 'StaffEvaluation' },
    Phan_Truc_Ngay: { module: 'shifts', entityType: 'DailyOnCall' },
    CongTac_DieuDuong: { module: 'dieu_duong', entityType: 'NursingTask' },
    Thuoc_Kho: { module: 'inventory', entityType: 'Medicine' },
    Medicines: { module: 'inventory', entityType: 'Medicine' },
    May_Moc: { module: 'inventory', entityType: 'Equipment' },
    Equipment: { module: 'inventory', entityType: 'Equipment' },
    Vung_5S: { module: '5s', entityType: 'FiveSZone' },
    DanhGia_5S: { module: '5s', entityType: 'FiveSEvaluation' },
    CaiTien_5S: { module: '5s', entityType: 'FiveSImprovement' },
    DeTai_CoSo: { module: 'research', entityType: 'Research' },
    Research: { module: 'research', entityType: 'Research' },
    SinhHoat_KH: { module: 'meetings', entityType: 'Meeting' },
    Meetings: { module: 'meetings', entityType: 'Meeting' },
    KyThuat_Moi: { module: 'technique', entityType: 'NewTechnique' },
    NoiDung_TT: { module: 'comms', entityType: 'CommunicationContent' },
    Config: { module: 'config', entityType: 'Config' }
  };
}

function mapMutationToPermission_(sheetName, action, payload) {
  const base = getSheetPermissionMap_()[sheetName] || { module: sheetName, entityType: sheetName };
  const permissionAction = normalizePermissionAction_(action);
  const auditAction = classifyAuditAction_(sheetName, action, payload || {}, null, null);

  if (sheetName === 'DS_BenhNhan' && payload && (payload.status === 'DaDuyet' || payload.approvalDate)) {
    return { module: 'surgery', action: 'edit', auditAction: 'approve', entityType: base.entityType };
  }

  return {
    module: base.module,
    action: permissionAction,
    auditAction: auditAction,
    entityType: base.entityType
  };
}

function getPermissionValue_(permission, action) {
  const normalizedAction = normalizePermissionAction_(action);
  const candidateKeys = {
    view: ['canView', 'CanView', 'view', 'allowed', 'Allowed', 'enabled', 'Enable'],
    add: ['canAdd', 'CanAdd', 'canCreate', 'CanCreate', 'create', 'add', 'allowed', 'Allowed', 'enabled', 'Enable'],
    edit: ['canEdit', 'CanEdit', 'canUpdate', 'CanUpdate', 'edit', 'update', 'allowed', 'Allowed', 'enabled', 'Enable'],
    delete: ['canDelete', 'CanDelete', 'delete', 'remove', 'allowed', 'Allowed', 'enabled', 'Enable']
  }[normalizedAction] || ['allowed', 'Allowed', 'enabled', 'Enable'];

  for (let i = 0; i < candidateKeys.length; i++) {
    const key = candidateKeys[i];
    if (permission[key] !== undefined) return toBool(permission[key]);
  }

  return false;
}

function findPermissionForRole_(role, moduleName) {
  let permissions = [];
  try {
    permissions = apiGet('Roles_Permission');
  } catch (err) {
    return null;
  }
  const searchRole = normalizeRole_(role);
  const searchModule = String(moduleName || '').trim().toLowerCase();
  return permissions.find(permission =>
    normalizeRole_(permission.role || permission.Role) === searchRole &&
    String(permission.module || permission.Module || '').trim().toLowerCase() === searchModule
  ) || null;
}

function fallbackCanPerform_(role, moduleName, action) {
  const normalizedRole = normalizeRole_(role);
  const normalizedAction = normalizePermissionAction_(action);

  if (normalizedRole === 'TRUONG_KHOA') return true;
  if (moduleName === 'users' || moduleName === 'permissions' || moduleName === 'config') return false;

  const headNurseModules = ['clinical', 'surgery', 'vip', 'briefing', 'inventory', '5s', 'shifts', 'dieu_duong', 'staff_performance', 'research', 'meetings', 'technique', 'comms'];
  if (normalizedRole === 'DIEU_DUONG_TRUONG') {
    return headNurseModules.indexOf(moduleName) !== -1;
  }

  if (normalizedRole === 'NHAN_VIEN') {
    if (moduleName === 'surgery' && normalizedAction === 'edit') return false;
    const staffModules = ['clinical', 'vip', 'briefing', 'inventory', '5s', 'shifts', 'dieu_duong', 'staff_performance', 'research', 'meetings', 'technique', 'comms'];
    return staffModules.indexOf(moduleName) !== -1;
  }

  return false;
}

function canActorPerform_(actor, moduleName, action) {
  if (!actor || !actor.role) return false;
  if (actor.role === 'TRUONG_KHOA') return true;
  if (moduleName === 'users' || moduleName === 'permissions' || moduleName === 'config') return false;

  const permission = findPermissionForRole_(actor.role, moduleName);
  if (permission) {
    return getPermissionValue_(permission, action);
  }

  return fallbackCanPerform_(actor.role, moduleName, action);
}

function makePermissionDeniedError_() {
  const error = new Error('PERMISSION_DENIED: Bạn không có quyền thực hiện thao tác này.');
  error.code = 'PERMISSION_DENIED';
  return error;
}

function logPermissionDenied_(context, permission, entityId, payload, errorMessage) {
  logAuditEvent_(Object.assign({}, getActorInfo_(context), {
    module: permission.module,
    action: permission.auditAction || permission.action,
    entityType: permission.entityType || permission.module,
    entityId: entityId || (payload && payload.id) || '',
    entityLabel: payload ? getEntityLabel_(payload, permission.entityType || permission.module) : '',
    source: 'gas:permission_guard',
    beforeJson: '',
    afterJson: safeJsonStringify_(payload || {}),
    changesJson: '',
    status: 'failed',
    errorMessage: errorMessage || 'PERMISSION_DENIED'
  }));
}

function requirePermission_(context, permission, entityId, payload) {
  if (!permission || !permission.module) return getActorFromContext_(context);

  const actor = getActorFromContext_(context);
  let verifiedUser = null;

  if (actor.username) {
    verifiedUser = getUserByUsername_(actor.username);
    if (!verifiedUser || !isUserActive_(verifiedUser)) {
      logPermissionDenied_(context, permission, entityId, payload, 'PERMISSION_DENIED: inactive or unknown user');
      throw makePermissionDeniedError_();
    }
    actor.role = normalizeRole_(verifiedUser.role || actor.role);
    actor.fullName = verifiedUser.fullName || actor.fullName;
  }

  if (!canActorPerform_(actor, permission.module, permission.action)) {
    logPermissionDenied_(context, permission, entityId, payload, 'PERMISSION_DENIED');
    throw makePermissionDeniedError_();
  }

  return actor;
}

function assertUserMutationRules_(context, action, id, data, beforeRecord) {
  const actor = getActorFromContext_(context);
  if (actor.role !== 'TRUONG_KHOA') {
    throw makePermissionDeniedError_();
  }

  if (data && data.role === 'TRUONG_KHOA' && beforeRecord && beforeRecord.role !== 'TRUONG_KHOA') {
    if (actor.role !== 'TRUONG_KHOA') throw makePermissionDeniedError_();
  }

  if (action === 'delete' && beforeRecord && beforeRecord.role === 'TRUONG_KHOA') {
    const users = apiGet('Users');
    const remainingChiefs = users.filter(user =>
      String(user.username || '').trim().toLowerCase() !== String(id || '').trim().toLowerCase() &&
      normalizeRole_(user.role) === 'TRUONG_KHOA' &&
      isUserActive_(user)
    );
    if (!remainingChiefs.length) {
      throw new Error('PERMISSION_DENIED: Không được xoá TRUONG_KHOA cuối cùng.');
    }
  }
}

// --- GENERIC API ---

function apiGet(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const lastCol = sheet.getLastColumn();
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  const dataRows = values.slice(1);
  
  return dataRows.map(row => rowToObject(row, headers));
}

function apiAdd(sheetName, data, userRole) {
  // LOCK: Use LockService to prevent race conditions during create
  const lock = LockService.getScriptLock();
  // Wait up to 10s for other processes to finish
  if (!lock.tryLock(10000)) {
     throw new Error("Server is busy. Please try again.");
  }

  let id = data && data.id ? String(data.id).trim() : '';
  let afterRecord = null;
  const permission = mapMutationToPermission_(sheetName, 'create', data);

  try {
    requirePermission_(userRole, permission, id, data);
    const sheet = getSheet(sheetName);
    const { map, headers } = getHeaderIndexMap(sheet);
    
    // ID Handling: Use provided ID or generate new
    // Trim ID to ensure uniqueness safety
    id = id || Utilities.getUuid();
    
    // Duplicate check for Patients (using Manual IDs)
    // We must check existing IDs in the sheet to prevent duplicates
    if (sheetName === 'DS_BenhNhan') {
       if (!id) throw new Error("Mã bệnh nhân là bắt buộc");
       
       const colIndexID = map['id'];
       if (colIndexID !== undefined) {
         const lastRow = sheet.getLastRow();
         if (lastRow > 1) {
           // Get all IDs in one batch for performance
           const idColumn = sheet.getRange(2, colIndexID + 1, lastRow - 1, 1).getValues();
           const searchId = id.toLowerCase();
           const exists = idColumn.some(row => String(row[0]).trim().toLowerCase() === searchId);
           if (exists) {
             throw new Error("Mã bệnh nhân '" + id + "' đã tồn tại!");
           }
         }
       }
    }

    const newRow = headers.map(h => {
      const key = toCamelCase(h);
      if (key === 'id') return id;
      if (key === 'createdAt') return new Date();
      
      let val = data[key];
      // Safety: undefined -> empty string
      if (val === undefined || val === null) return '';
      // Sanitize string inputs to prevent formula injection
      if (typeof val === 'string') {
          if (val.startsWith('=')) val = "'" + val; 
      }
      return val;
    });
    
    sheet.appendRow(newRow);
    afterRecord = rowToObject(newRow, headers);
    logAuditEvent_(buildAuditEvent_(
      sheetName,
      classifyAuditAction_(sheetName, 'create', data, null, afterRecord),
      userRole,
      id,
      null,
      afterRecord
    ));
    return { success: true, id: id };
    
  } catch (err) {
    if (!err || err.code !== 'PERMISSION_DENIED') {
      logAuditEvent_(buildAuditEvent_(
        sheetName,
        classifyAuditAction_(sheetName, 'create', data, null, afterRecord),
        userRole,
        id,
        null,
        data,
        err
      ));
    }
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function apiUpdate(sheetName, id, data, userRole) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
     throw new Error("Server is busy. Please try again.");
  }

  let beforeRecord = null;
  let afterRecord = null;
  const permission = mapMutationToPermission_(sheetName, 'update', data);

  try {
    requirePermission_(userRole, permission, id, data);
    // --- SECURITY CHECK ---
    // Prevent STAFF from approving surgery or modifying approved status
    if (sheetName === 'DS_BenhNhan' && getActorRole_(userRole) === 'NHAN_VIEN') {
       if (data.status === 'DaDuyet' || data.approvalDate) {
          throw new Error("Quyền hạn bị từ chối: Bạn không được phép Duyệt mổ.");
       }
    }

    const sheet = getSheet(sheetName);
    const { map, headers } = getHeaderIndexMap(sheet);
    const colIndexID = map['id'];
    
    if (colIndexID === undefined) throw new Error(`Sheet ${sheetName} missing ID column`);
    
    // Find Row
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error(`Record ID ${id} not found (empty sheet)`);
    
    // Fetch all IDs to find index (1 batch read = fast)
    const idList = sheet.getRange(2, colIndexID + 1, lastRow - 1, 1).getValues();
    
    let rowIndex = -1;
    const searchId = String(id).trim().toLowerCase();
    
    for (let i = 0; i < idList.length; i++) {
      if (String(idList[i][0]).trim().toLowerCase() === searchId) {
        rowIndex = i + 2; // +2 offset (header + 0-index)
        break;
      }
    }
    
    if (rowIndex === -1) throw new Error(`Record ID "${id}" not found in ${sheetName}`);
    
    // Update Logic: Read current row, merge data, write back (Atomic Row Write)
    const lastCol = sheet.getLastColumn();
    const range = sheet.getRange(rowIndex, 1, 1, lastCol);
    const currentRowValues = range.getValues()[0];
    const newRowValues = [...currentRowValues];
    beforeRecord = rowToObject(currentRowValues, headers);
    if (sheetName === 'Users') {
      assertUserMutationRules_(userRole, 'update', id, data, beforeRecord);
    }
    
    headers.forEach((h, colIdx) => {
      const key = toCamelCase(h);
      // Skip ID update to ensure integrity
      if (key !== 'id' && data[key] !== undefined) {
         let val = data[key];
         if (val === null || val === undefined) val = '';
         newRowValues[colIdx] = val;
      }
    });
    
    // Write back entire row at once (Fast & Reliable)
    range.setValues([newRowValues]);
    afterRecord = rowToObject(newRowValues, headers);
    logAuditEvent_(buildAuditEvent_(
      sheetName,
      classifyAuditAction_(sheetName, 'update', data, beforeRecord, afterRecord),
      userRole,
      id,
      beforeRecord,
      afterRecord
    ));
    
    return { success: true };
    
  } catch (err) {
    if (!err || err.code !== 'PERMISSION_DENIED') {
      logAuditEvent_(buildAuditEvent_(
        sheetName,
        classifyAuditAction_(sheetName, 'update', data, beforeRecord, afterRecord),
        userRole,
        id,
        beforeRecord,
        data,
        err
      ));
    }
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function apiDelete(sheetName, id, userRole) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
     throw new Error("Server is busy. Please try again.");
  }

  let beforeRecord = null;
  const permission = mapMutationToPermission_(sheetName, 'delete', null);

  try {
    requirePermission_(userRole, permission, id, null);
    const sheet = getSheet(sheetName);
    const { map, headers } = getHeaderIndexMap(sheet);
    const colIndexID = map['id'];
    
    if (colIndexID === undefined) throw new Error("Missing ID column");
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("Record not found");
    
    const idList = sheet.getRange(2, colIndexID + 1, lastRow - 1, 1).getValues();
    const searchId = String(id).trim().toLowerCase();
    
    let rowIndex = -1;
    for (let i = 0; i < idList.length; i++) {
      if (String(idList[i][0]).trim().toLowerCase() === searchId) {
        rowIndex = i + 2;
        break;
      }
    }
    
    if (rowIndex === -1) throw new Error(`Record ID "${id}" not found to delete`);
    
    beforeRecord = rowToObject(sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0], headers);
    if (sheetName === 'Users') {
      assertUserMutationRules_(userRole, 'delete', id, null, beforeRecord);
    }
    sheet.deleteRow(rowIndex);
    logAuditEvent_(buildAuditEvent_(
      sheetName,
      'delete',
      userRole,
      id,
      beforeRecord,
      null
    ));
    return { success: true };
    
  } catch (err) {
    if (!err || err.code !== 'PERMISSION_DENIED') {
      logAuditEvent_(buildAuditEvent_(
        sheetName,
        'delete',
        userRole,
        id,
        beforeRecord,
        null,
        err
      ));
    }
    throw err;
  } finally {
    lock.releaseLock();
  }
}

// --- SPECIFIC MODULES ---

function loginUser(username, password) {
  const users = apiGet('Users');
  const user = users.find(u => 
    String(u.username).toLowerCase() === String(username).toLowerCase() && 
    String(u.password) === String(password)
  );
  
  if (user) {
    if (!user.active) throw new Error("Tài khoản đã bị khoá.");
    const { password, ...safeUser } = user;
    return safeUser;
  }
  return null;
}

function addVipPatientSafe(data, userRole) {
  requirePermission_(userRole, { module: 'vip', action: 'add', auditAction: 'create', entityType: 'VipPatient' }, data && data.patientId, data);

  // 1. Verify Patient Status in DS_BenhNhan
  const pSheet = getSheet('DS_BenhNhan');
  const { map } = getHeaderIndexMap(pSheet);
  const colIndexID = map['id'];
  const colIndexStatus = map['status'];
  
  if (colIndexID === undefined || colIndexStatus === undefined) {
     throw new Error("Lỗi cấu trúc dữ liệu bảng Bệnh nhân (Thiếu ID hoặc Status)");
  }
  
  const lastRow = pSheet.getLastRow();
  if (lastRow > 1) {
      const values = pSheet.getRange(2, 1, lastRow - 1, pSheet.getLastColumn()).getValues();
      const targetId = String(data.patientId).trim().toLowerCase();
      
      const patientRow = values.find(r => String(r[colIndexID]).trim().toLowerCase() === targetId);
      
      if (!patientRow) {
          throw new Error("Không tìm thấy bệnh nhân có ID: " + data.patientId);
      }
      
      const status = patientRow[colIndexStatus];
      if (status === 'RaVien') {
          throw new Error("Không được phép thêm bệnh nhân đã Ra viện vào danh sách lưu ý.");
      }
  } else {
      throw new Error("Danh sách bệnh nhân trống");
  }
  
  // 2. Proceed with Add
  return apiAdd('BN_LuuY', data, userRole);
}

function getVipPatientsJoined() {
  const vips = apiGet('BN_LuuY');
  const patients = apiGet('DS_BenhNhan');
  
  const pMap = {};
  patients.forEach(p => pMap[p.id] = p);
  
  return vips.map(v => {
    const p = pMap[v.patientId];
    if (p) {
      return {
        ...v,
        name: p.name,
        room: p.room,
        bed: p.bed,
        diagnosis: p.diagnosis
      };
    }
    return { ...v, name: '(Không tìm thấy tên)', room: '-', bed: '-' };
  });
}

function getDoctors() {
  const users = apiGet('Users');
  return users
    .filter(u => u.active && (u.nhomChuyenMon === 'BS' || String(u.username).toLowerCase().startsWith('bs')))
    .map(u => ({ id: u.id, fullName: u.fullName }));
}

function getDashboardOverview() {
  const patients = apiGet('DS_BenhNhan');
  const shifts = apiGet('Phan_Truc_Ngay');
  const meds = apiGet('Thuoc_Kho');
  const equip = apiGet('May_Moc');
  const research = apiGet('DeTai_CoSo');
  const briefings = apiGet('GiaoBan_Log');
  const meetings = apiGet('SinhHoat_KH');
  
  const clinical = {
    total: patients.filter(p => p.status !== 'RaVien').length,
    waitingSurgery: patients.filter(p => p.status === 'ChoMo').length,
    vip: apiGet('BN_LuuY').length,
    discharged: patients.filter(p => p.status === 'RaVien').length
  };
  
  const timezone = Session.getScriptTimeZone();
  const today = new Date();
  const todayStr = Utilities.formatDate(today, timezone, "yyyy-MM-dd");
  today.setHours(0,0,0,0); // Normalize time for comparisons

  const todayShift = shifts.find(s => s.date === todayStr) || { doctor: '---', nurse1: '---', nurse2: '---' };
  
  // Calculate inventory alerts
  const threeMonths = new Date(); threeMonths.setMonth(today.getMonth() + 3);
  const medsNearExpiry = meds.filter(m => {
    if(!m.expiryDate) return false;
    const d = new Date(m.expiryDate);
    return d < threeMonths;
  }).length;
  
  const equipOverdue = equip.filter(e => {
    if (!e.lastMaintenanceDate || !e.maintenanceCycle) return false;
    const last = new Date(e.lastMaintenanceDate);
    const next = new Date(last);
    next.setMonth(next.getMonth() + Number(e.maintenanceCycle));
    return next < today;
  }).length;

  const briefingToday = briefings.find(b => b.date === todayStr);
  
  // --- AGGREGATED DEADLINES LOGIC ---
  const deadlines = [];
  const limitDate = new Date(today);
  limitDate.setDate(limitDate.getDate() + 30); // 30 days window

  const parseDate = (dStr) => {
    if (!dStr) return null;
    const d = new Date(dStr);
    d.setHours(0,0,0,0);
    if (isNaN(d.getTime())) return null;
    return d;
  };

  const getStatus = (dObj) => {
    if (dObj < today) return 'overdue';
    if (dObj.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  const addDeadline = (type, title, description, assignee, dateStr, link, allowOverdue, id) => {
      const d = parseDate(dateStr);
      if (!d) return;
      
      const status = getStatus(d);
      // Logic Update:
      // If allowOverdue is false, we ONLY show items that are 'today' or 'upcoming'.
      // If allowOverdue is true, we show 'overdue' + 'today' + 'upcoming' (within 30 days).
      
      const isVisible = allowOverdue 
          ? (status === 'overdue' || (d >= today && d <= limitDate))
          : (status !== 'overdue' && d <= limitDate); // Hide overdue if not allowed

      if (isVisible) {
          deadlines.push({
              id: id,
              type: type,
              title: title,
              description: description,
              assignee: assignee,
              date: Utilities.formatDate(d, timezone, "yyyy-MM-dd"),
              status: status,
              link: link
          });
      }
  };

  // 1. Research Topics (Deadline) - UPDATE: Hide Overdue
  research.forEach(r => {
      if (r.deadline && r.progress < 100) {
          addDeadline(
            'Nghiên cứu', 
            r.topic, 
            r.notes || 'Hoàn thành đề tài đúng tiến độ', 
            r.author, 
            r.deadline, 
            '/research', 
            false, // Hide overdue research from dashboard (keep in module)
            r.id
          );
      }
  });

  // 2. Scientific Meetings (Time)
  meetings.forEach(m => {
      if (m.time) {
          // Normalize ISO datetime string to date string for parsing
          let dStr = m.time;
          if(dStr.indexOf('T') > -1) dStr = dStr.split('T')[0];
          addDeadline(
            'SH Khoa học', 
            m.topic, 
            `Địa điểm: ${m.location}\n${m.notes || ''}`, 
            m.presenter, 
            dStr, 
            '/science-meetings', 
            false, 
            m.id
          );
      }
  });

  // 3. Surgery (Approved/Planned)
  patients.forEach(p => {
      if (p.status === 'DaDuyet' && p.surgeryDate) {
          addDeadline(
            'Lịch mổ', 
            'BN ' + p.name, 
            `Chẩn đoán: ${p.diagnosis}\nPhương pháp: ${p.surgeryMethod || '...'}\n${p.approvalNote ? 'Lưu ý: ' + p.approvalNote : ''}`, 
            p.surgeon, 
            p.surgeryDate, 
            '/surgery-approval', 
            false, 
            p.id
          );
      }
  });

  // 4. Briefing Tasks - UPDATE: Hide Overdue
  briefings.forEach(b => {
      let tasks = [];
      try { tasks = JSON.parse(b.congViecJson || '[]'); } catch(e) {}
      if (Array.isArray(tasks)) {
          tasks.forEach((t, index) => {
              if (t.deadline && t.progress < 100) {
                  addDeadline(
                    'Công việc', 
                    t.taskName, 
                    `Thuộc giao ban ngày: ${b.date}\nNội dung sự vụ: ${b.content}`, 
                    t.assignee, 
                    t.deadline, 
                    '/daily-briefing', 
                    false, // Hide overdue tasks from dashboard (keep in Log)
                    b.id + '_T' + index // Unique composite ID
                  );
              }
          });
      }
  });

  // 5. Medicines (Expiry) - KEEP Overdue (Critical Alert)
  meds.forEach(m => {
      if (m.expiryDate) {
          addDeadline(
            'Hết hạn thuốc', 
            m.name, 
            `Kho: ${m.quantity} ${m.unit}\nGhi chú: ${m.notes || ''}`, 
            'Dược/Thủ kho', 
            m.expiryDate, 
            '/inventory', 
            true, 
            m.id
          );
      }
  });

  // 6. Equipment (Maintenance) - KEEP Overdue (Critical Alert)
  equip.forEach(e => {
      if (e.lastMaintenanceDate && e.maintenanceCycle) {
          const last = parseDate(e.lastMaintenanceDate);
          if (last) {
              const next = new Date(last);
              next.setMonth(next.getMonth() + Number(e.maintenanceCycle));
              const nextStr = Utilities.formatDate(next, timezone, "yyyy-MM-dd");
              addDeadline(
                'Bảo dưỡng', 
                e.name, 
                `Mã: ${e.code}\nTình trạng: ${e.condition}`, 
                e.inCharge, 
                nextStr, 
                '/inventory', 
                true, 
                e.id
              );
          }
      }
  });

  // Sort deadlines: Earliest first (Overdue -> Today -> Upcoming)
  deadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    clinical,
    surgery: { monthTotal: 0, approved: 0 },
    science: { ongoing: research.filter(r => r.progress < 100).length, meetingsMonth: 0 },
    admin: { briefingToday: briefingToday ? briefingToday.content : null, overdueTasks: 0 },
    inventory: { medsNearExpiry, equipOverdue },
    onCall: todayShift,
    deadlines: deadlines
  };
}

function batchSaveDailyOnCall(shifts, userContext) {
  requirePermission_(userContext, { module: 'shifts', action: 'edit', auditAction: 'batch_upsert', entityType: 'DailyOnCall' }, '', shifts);

  const sheet = getSheet('Phan_Truc_Ngay');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error("Busy");
  
  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const { map, headers } = getHeaderIndexMap(sheet);
    const dateColIdx = map['date'];
    
    // Fetch all existing rows
    let existingData = [];
    if (lastRow > 1) {
      existingData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    }
    
    // Map Date -> Row Index (0-based relative to existingData)
    const dateMap = {};
    existingData.forEach((row, i) => {
      let dVal = row[dateColIdx];
      if (dVal instanceof Date) dVal = Utilities.formatDate(dVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
      dateMap[dVal] = i;
    });
    
    const newRows = [];
    
    shifts.forEach(shift => {
      const dateKey = shift.date;
      if (!dateKey) return;
      
      if (dateMap.hasOwnProperty(dateKey)) {
        // Update existing row in memory
        const rIdx = dateMap[dateKey];
        headers.forEach((h, cIdx) => {
          const k = toCamelCase(h);
          if (k !== 'id' && shift[k] !== undefined) {
            existingData[rIdx][cIdx] = shift[k];
          }
        });
      } else {
        // Prepare new row
        const newRow = new Array(lastCol).fill('');
        headers.forEach((h, cIdx) => {
          const k = toCamelCase(h);
          if (k === 'id') newRow[cIdx] = Utilities.getUuid();
          else if (shift[k] !== undefined) newRow[cIdx] = shift[k];
        });
        newRows.push(newRow);
      }
    });
    
    // Write Updates
    if (existingData.length > 0) {
      sheet.getRange(2, 1, existingData.length, lastCol).setValues(existingData);
    }
    // Append New
    if (newRows.length > 0) {
      sheet.getRange(lastRow + 1, 1, newRows.length, lastCol).setValues(newRows);
    }

    logAuditEvent_(Object.assign({}, getActorInfo_(userContext), {
      module: 'nursing',
      action: 'batch_upsert',
      entityType: 'DailyOnCall',
      entityId: '',
      entityLabel: shifts && shifts.length ? `${shifts.length} shifts` : '',
      source: 'gas:batchSaveDailyOnCall',
      beforeJson: '',
      afterJson: safeJsonStringify_(shifts || []),
      changesJson: '',
      status: 'success',
      errorMessage: ''
    }));
    
    return { success: true };
  } catch (err) {
    logAuditEvent_(Object.assign({}, getActorInfo_(userContext), {
      module: 'nursing',
      action: 'batch_upsert',
      entityType: 'DailyOnCall',
      entityId: '',
      entityLabel: shifts && shifts.length ? `${shifts.length} shifts` : '',
      source: 'gas:batchSaveDailyOnCall',
      beforeJson: '',
      afterJson: safeJsonStringify_(shifts || []),
      changesJson: '',
      status: 'failed',
      errorMessage: err && err.message ? err.message : String(err)
    }));
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function toBool(value) {
  return value === true || value === 'TRUE' || value === 'true' || value === '1' || value === 1;
}

function saveRolePermissions(permissions, userRole) {
  requirePermission_(userRole, { module: 'permissions', action: 'edit', auditAction: 'update', entityType: 'Permission' }, '', permissions);

  if (!Array.isArray(permissions)) {
    throw new Error('saveRolePermissions requires permissions array');
  }

  const existing = apiGet('Roles_Permission');

  permissions.forEach(perm => {
    if (!perm || !perm.role || !perm.module) {
      throw new Error('Each permission requires role and module');
    }

    const role = String(perm.role);
    const module = String(perm.module);
    const current = existing.find(item =>
      String(item.role) === role && String(item.module) === module
    );

    const payload = {
      id: current ? current.id : (perm.id || (role + '_' + module)),
      role,
      module,
      canView: toBool(perm.canView),
      canAdd: toBool(perm.canAdd),
      canEdit: toBool(perm.canEdit),
      canDelete: toBool(perm.canDelete)
    };

    if (current && current.id) {
      apiUpdate('Roles_Permission', current.id, payload, userRole);
    } else {
      apiAdd('Roles_Permission', payload, userRole);
      existing.push(payload);
    }
  });

  return { success: true };
}
