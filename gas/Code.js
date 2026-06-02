
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
    const sessionContext = {
      sessionToken: body.sessionToken || '',
      userAgent: body.userAgent || '',
      ip: body.ip || ''
    };

    if (!funcName) {
      throw new Error('funcName is required');
    }

    const data = dispatchRpc(funcName, args, sessionContext);
    return jsonOutput({ success: true, data });
  } catch (err) {
    return jsonOutput({
      success: false,
      code: err && err.code ? err.code : '',
      error: err && err.message ? err.message : String(err)
    });
  }
}

function dispatchRpc(funcName, args, sessionContext) {
  switch (funcName) {
    case 'apiGet':
      return apiGet(args[0]);
    case 'apiAdd':
      return apiAdd(args[0], args[1], sessionContext);
    case 'apiUpdate':
      return apiUpdate(args[0], args[1], args[2], sessionContext);
    case 'apiDelete':
      return apiDelete(args[0], args[1], sessionContext);
    case 'loginUser':
      return loginUser(args[0], args[1], sessionContext);
    case 'logoutUser':
      return logoutUser(sessionContext.sessionToken || args[0], sessionContext);
    case 'changeMyPassword':
      return changeMyPassword(args[0], sessionContext);
    case 'getDashboardOverview':
      return getDashboardOverview();
    case 'getVipPatientsJoined':
      return getVipPatientsJoined();
    case 'addVipPatientSafe':
      return addVipPatientSafe(args[0], sessionContext);
    case 'getDoctors':
      return getDoctors();
    case 'batchSaveDailyOnCall':
      return batchSaveDailyOnCall(args[0], sessionContext);
    case 'saveRolePermissions':
      return saveRolePermissions(args[0], sessionContext);
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
    Users: [
      'ID',
      'Username',
      'Password',
      'FullName',
      'Role',
      'NhomChuyenMon',
      'Active',
      'CreatedAt',
      'CanDeletePatient',
      'passwordHash',
      'passwordSalt',
      'passwordUpdatedAt',
      'mustChangePassword',
      'passwordResetAt',
      'passwordVersion'
    ],
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
      'sourceDate',
      'sourceLabel',
      'syncStatus',
      'syncedAt'
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
    ],
    Sessions: [
      'id',
      'tokenHash',
      'username',
      'fullName',
      'role',
      'createdAt',
      'expiresAt',
      'lastSeenAt',
      'revokedAt',
      'userAgent',
      'ip',
      'active'
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
  if (userContext && userContext.__actor) {
    return {
      actorUsername: userContext.__actor.username || '',
      actorName: userContext.__actor.fullName || '',
      actorRole: userContext.__actor.role || ''
    };
  }

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
      const sensitiveKeys = {
        password: true,
        passwordhash: true,
        passwordsalt: true,
        sessiontoken: true,
        token: true,
        tokenhash: true,
        currentpassword: true,
        newpassword: true
      };
      if (sensitiveKeys[String(key).toLowerCase()]) {
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
    const sensitiveKeys = {
      password: true,
      passwordhash: true,
      passwordsalt: true,
      sessiontoken: true,
      token: true,
      tokenhash: true,
      currentpassword: true,
      newpassword: true
    };
    if (sensitiveKeys[String(key).toLowerCase()]) {
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

function isBriefingSheet_(sheetName) {
  return sheetName === 'GiaoBan_Log' || sheetName === 'DailyBriefing';
}

function parseJsonArray_(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function normalizeBriefingPayload_(data) {
  const payload = Object.assign({}, data || {});
  const tasks = parseJsonArray_(payload.congViecJson || payload.tasks).map((task, index) => {
    const next = Object.assign({}, task || {});
    if (!String(next.id || '').trim()) {
      next.id = 'T' + (index + 1) + '_' + Utilities.getUuid();
    }
    return next;
  });

  if (payload.congViecJson !== undefined || payload.tasks !== undefined) {
    payload.congViecJson = JSON.stringify(tasks);
    payload.tasks = tasks;
  }
  return payload;
}

function getBriefingTasks_(briefing) {
  return parseJsonArray_((briefing || {}).congViecJson || (briefing || {}).tasks);
}

function getBriefingSourceTaskId_(task, index) {
  return String((task || {}).id || 'T' + (index + 1));
}

function isBriefingSourceType_(sourceType) {
  const value = String(sourceType || '').trim().toLowerCase();
  return value === 'giao_ban' || value === 'daily_briefing';
}

function findDataRowById_(sheetName, id) {
  const sheet = getSheet(sheetName);
  const { map, headers } = getHeaderIndexMap(sheet);
  const colIndexID = map.id;
  if (colIndexID === undefined) throw new Error('Sheet ' + sheetName + ' missing ID column');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const ids = sheet.getRange(2, colIndexID + 1, lastRow - 1, 1).getValues();
  const searchId = String(id || '').trim().toLowerCase();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim().toLowerCase() === searchId) {
      return { sheet: sheet, headers: headers, rowIndex: i + 2 };
    }
  }
  return null;
}

function rowFromObject_(headers, data, id) {
  return headers.map(header => {
    const key = toCamelCase(header);
    if (key === 'id') return id || data.id || Utilities.getUuid();
    if (key === 'createdAt') return data[key] || new Date();
    let value = data[key];
    if (value === undefined || value === null) return '';
    if (typeof value === 'string' && value.startsWith('=')) value = "'" + value;
    return value;
  });
}

function internalAddRow_(sheetName, data) {
  const sheet = getSheet(sheetName);
  const { headers } = getHeaderIndexMap(sheet);
  const id = String((data || {}).id || Utilities.getUuid());
  const row = rowFromObject_(headers, Object.assign({}, data, { id: id }), id);
  sheet.appendRow(row);
  return rowToObject(row, headers);
}

function internalUpdateRow_(sheetName, id, data) {
  const rowInfo = findDataRowById_(sheetName, id);
  if (!rowInfo) throw new Error('Record ID "' + id + '" not found in ' + sheetName);
  const range = rowInfo.sheet.getRange(rowInfo.rowIndex, 1, 1, rowInfo.headers.length);
  const currentValues = range.getValues()[0];
  const nextValues = currentValues.slice();

  rowInfo.headers.forEach((header, index) => {
    const key = toCamelCase(header);
    if (key !== 'id' && data[key] !== undefined) {
      let value = data[key];
      if (value === null || value === undefined) value = '';
      if (typeof value === 'string' && value.startsWith('=')) value = "'" + value;
      nextValues[index] = value;
    }
  });

  range.setValues([nextValues]);
  return rowToObject(nextValues, rowInfo.headers);
}

function internalDeleteRow_(sheetName, id) {
  const rowInfo = findDataRowById_(sheetName, id);
  if (!rowInfo) return false;
  rowInfo.sheet.deleteRow(rowInfo.rowIndex);
  return true;
}

function logBriefingSyncAudit_(action, context, briefing, taskRecord, error) {
  const actor = getActorInfo_(context);
  const entityId = taskRecord && taskRecord.id ? taskRecord.id : '';
  logAuditEvent_(Object.assign({}, actor, {
    module: 'staff_tasks',
    action: action,
    entityType: 'StaffTask',
    entityId: entityId,
    entityLabel: taskRecord && taskRecord.tieuDe ? taskRecord.tieuDe : '',
    source: 'gas:syncBriefingTasksToStaffTasks',
    beforeJson: '',
    afterJson: safeJsonStringify_({
      briefingId: briefing && briefing.id ? briefing.id : '',
      task: taskRecord || null
    }),
    changesJson: '',
    status: error ? 'failed' : 'success',
    errorMessage: error ? (error.message || String(error)) : ''
  }));
}

function buildStaffTaskFromBriefing_(briefingId, briefing, task, index, existing) {
  const assigneeUsername = String(task.assigneeUsername || task.assignee || '').trim();
  const assigneeName = String(task.assigneeName || task.assignee || assigneeUsername).trim();
  const briefingDate = String(briefing.date || '');
  return Object.assign({}, existing || {}, {
    userId: assigneeUsername,
    tieuDe: String(task.taskName || '').trim(),
    noiDung: String(briefing.content || ''),
    nguoiGiao: String(briefing.host || ''),
    ngayGiao: briefingDate || new Date().toISOString().split('T')[0],
    hanHoanThanh: String(task.deadline || ''),
    mucDoUuTien: existing && existing.mucDoUuTien ? existing.mucDoUuTien : 'Trung bÃ¬nh',
    trangThai: existing && existing.trangThai ? existing.trangThai : 'ChÆ°a lÃ m',
    tienDo: existing && existing.tienDo !== undefined && existing.tienDo !== '' ? existing.tienDo : 0,
    ketQua: existing && existing.ketQua ? existing.ketQua : '',
    ghiChu: existing && existing.ghiChu ? existing.ghiChu : '',
    sourceType: 'daily_briefing',
    sourceId: briefingId,
    sourceTaskId: getBriefingSourceTaskId_(task, index),
    sourceTaskIndex: index,
    sourceDate: briefingDate,
    sourceLabel: briefingDate ? 'Giao ban ' + briefingDate : 'Giao ban',
    assigneeUsername: assigneeUsername,
    assigneeName: assigneeName,
    syncStatus: 'active',
    syncedAt: new Date().toISOString()
  });
}

function syncBriefingTasksToStaffTasks_(briefing, context) {
  const result = { created: 0, updated: 0, paused: 0, deleted: 0, skipped: 0, warnings: [] };
  const briefingId = String((briefing || {}).id || '').trim();
  if (!briefingId) return result;

  try {
    ensureKnownSheetColumns(getSheet('CongViec_NhanVien'), 'CongViec_NhanVien');
    const staffTasks = apiGet('CongViec_NhanVien');
    const existingFromBriefing = (Array.isArray(staffTasks) ? staffTasks : []).filter(task =>
      isBriefingSourceType_(task.sourceType) && String(task.sourceId || '') === briefingId
    );
    const tasks = getBriefingTasks_(briefing);
    const activeSourceIds = {};
    const activeSourceIndexes = {};

    tasks.forEach((task, index) => {
      const title = String((task || {}).taskName || '').trim();
      const assigneeUsername = String((task || {}).assigneeUsername || (task || {}).assignee || '').trim();
      const sourceTaskId = getBriefingSourceTaskId_(task, index);

      if (!title || !assigneeUsername) {
        result.skipped += 1;
        logBriefingSyncAudit_('sync_briefing_task_skip_unassigned', context, briefing, {
          sourceTaskId: sourceTaskId,
          sourceTaskIndex: index,
          tieuDe: title,
          assigneeUsername: assigneeUsername
        });
        return;
      }

      activeSourceIds[sourceTaskId] = true;
      activeSourceIndexes[String(index)] = true;

      try {
        const existing = existingFromBriefing.find(item =>
          String(item.sourceTaskId || '') === sourceTaskId ||
          (!item.sourceTaskId && String(item.sourceTaskIndex || '') === String(index))
        );
        const payload = buildStaffTaskFromBriefing_(briefingId, briefing, task, index, existing);

        if (existing && existing.id) {
          const saved = internalUpdateRow_('CongViec_NhanVien', existing.id, payload);
          result.updated += 1;
          logBriefingSyncAudit_('sync_briefing_task_update', context, briefing, saved);
        } else {
          const saved = internalAddRow_('CongViec_NhanVien', payload);
          result.created += 1;
          logBriefingSyncAudit_('sync_briefing_task_create', context, briefing, saved);
        }
      } catch (err) {
        result.warnings.push(err.message || String(err));
        logBriefingSyncAudit_('sync_briefing_task_error', context, briefing, {
          sourceTaskId: sourceTaskId,
          sourceTaskIndex: index,
          tieuDe: title,
          assigneeUsername: assigneeUsername
        }, err);
      }
    });

    existingFromBriefing.forEach(existing => {
      const sourceTaskId = String(existing.sourceTaskId || '');
      const stillExists = sourceTaskId ? activeSourceIds[sourceTaskId] : activeSourceIndexes[String(existing.sourceTaskIndex || '')];
      if (stillExists) return;

      try {
        if (Number(existing.tienDo || 0) > 0) {
          const note = String(existing.ghiChu || '');
          const removedNote = 'Da bo khoi giao ban';
          const saved = internalUpdateRow_('CongViec_NhanVien', existing.id, {
            trangThai: 'Táº¡m dá»«ng',
            ghiChu: note.indexOf(removedNote) >= 0 ? note : (note ? note + '\n' + removedNote : removedNote),
            syncStatus: 'orphaned',
            syncedAt: new Date().toISOString()
          });
          result.paused += 1;
          logBriefingSyncAudit_('sync_briefing_task_pause', context, briefing, saved);
        } else {
          internalDeleteRow_('CongViec_NhanVien', existing.id);
          result.deleted += 1;
          logBriefingSyncAudit_('sync_briefing_task_delete', context, briefing, existing);
        }
      } catch (err) {
        result.warnings.push(err.message || String(err));
        logBriefingSyncAudit_('sync_briefing_task_error', context, briefing, existing, err);
      }
    });
  } catch (err) {
    result.warnings.push(err.message || String(err));
    logBriefingSyncAudit_('sync_briefing_task_error', context, briefing, null, err);
  }

  return result;
}

function bytesToHex_(bytes) {
  return bytes.map(byte => {
    const value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function hashSessionToken_(token) {
  if (!token) return '';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token), Utilities.Charset.UTF_8);
  return bytesToHex_(digest);
}

function createSessionToken_() {
  return [
    Utilities.getUuid(),
    Utilities.getUuid(),
    Utilities.getUuid()
  ].join('.');
}

function ensureSessionSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Sessions');
  if (!sheet) {
    sheet = ss.insertSheet('Sessions');
    sheet.appendRow(getKnownSheetHeaders().Sessions);
    sheet.setFrozenRows(1);
  }
  ensureKnownSheetColumns(sheet, 'Sessions');
  return sheet;
}

function getSessionExpiry_(createdAt) {
  const expiresAt = new Date(createdAt.getTime());
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

function findSessionRowByHash_(tokenHash) {
  if (!tokenHash) return null;
  const sheet = ensureSessionSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const { map, headers } = getHeaderIndexMap(sheet);
  const tokenHashCol = map['tokenHash'];
  if (tokenHashCol === undefined) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (String(row[tokenHashCol] || '') === tokenHash) {
      return {
        sheet,
        rowIndex: i + 2,
        headers,
        map,
        row,
        session: rowToObject(row, headers)
      };
    }
  }

  return null;
}

function logoutUser(sessionToken, sessionContext) {
  return revokeSession_(sessionToken, sessionContext);
}

function changeMyPassword(payload, sessionContext) {
  const actor = validateSession_(sessionContext && sessionContext.sessionToken ? sessionContext.sessionToken : '', sessionContext);
  const currentPassword = payload && payload.currentPassword;
  const newPassword = payload && payload.newPassword;
  const userRow = findUserRowByUsername_(actor.username);
  if (!userRow) throw new Error('SESSION_EXPIRED: Tài khoản không còn tồn tại.');

  const user = userRow.user;
  if (!verifyPassword_(currentPassword, user)) {
    logAuditEvent_({
      actorUsername: actor.username || '',
      actorName: actor.fullName || '',
      actorRole: actor.role || '',
      module: 'auth',
      action: 'change_password',
      entityType: 'User',
      entityId: actor.username || '',
      entityLabel: actor.fullName || actor.username || '',
      source: 'gas:changeMyPassword',
      beforeJson: '',
      afterJson: '',
      changesJson: '',
      status: 'failed',
      errorMessage: 'invalid current password'
    });
    throw new Error('PASSWORD_INVALID: Mật khẩu hiện tại không đúng.');
  }

  validateNewPassword_(actor.username, newPassword);

  const patch = buildPasswordFields_(newPassword, false);
  patch.mustChangePassword = false;
  patch.passwordResetAt = '';
  const values = sheetRowWithPatch_(userRow, patch);
  userRow.sheet.getRange(userRow.rowIndex, 1, 1, userRow.headers.length).setValues([values]);

  logAuditEvent_({
    actorUsername: actor.username || '',
    actorName: actor.fullName || '',
    actorRole: actor.role || '',
    module: 'auth',
    action: 'change_password',
    entityType: 'User',
    entityId: actor.username || '',
    entityLabel: actor.fullName || actor.username || '',
    source: 'gas:changeMyPassword',
    beforeJson: '',
    afterJson: '',
    changesJson: safeJsonStringify_({ passwordChanged: true, mustChangePassword: false }),
    status: 'success',
    errorMessage: ''
  });

  return { success: true };
}

function createSession_(user, meta) {
  ensureSessionSheet_();
  const token = createSessionToken_();
  const tokenHash = hashSessionToken_(token);
  const createdAt = new Date();
  const expiresAt = getSessionExpiry_(createdAt);
  const payload = {
    id: Utilities.getUuid(),
    tokenHash,
    username: user.username || '',
    fullName: user.fullName || '',
    role: user.role || '',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastSeenAt: createdAt.toISOString(),
    revokedAt: '',
    userAgent: meta && meta.userAgent ? meta.userAgent : '',
    ip: meta && meta.ip ? meta.ip : '',
    active: true
  };

  apiAdd('Sessions', payload, { system: true, username: 'system', role: 'TRUONG_KHOA' });

  return {
    sessionToken: token,
    expiresAt: payload.expiresAt
  };
}

function validateSession_(sessionToken, meta) {
  if (!sessionToken) {
    const error = new Error('AUTH_REQUIRED: Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const sessionRow = findSessionRowByHash_(hashSessionToken_(sessionToken));
  if (!sessionRow) {
    const error = new Error('SESSION_EXPIRED: Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    error.code = 'SESSION_EXPIRED';
    throw error;
  }

  const session = sessionRow.session;
  const now = new Date();
  const expiresAt = session.expiresAt ? new Date(session.expiresAt) : null;
  const active = session.active === true || session.active === 'TRUE' || session.active === 'true' || session.active === 1 || session.active === '1';

  if (!active || session.revokedAt || !expiresAt || expiresAt.getTime() <= now.getTime()) {
    const error = new Error('SESSION_EXPIRED: Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    error.code = 'SESSION_EXPIRED';
    throw error;
  }

  const user = getUserByUsername_(session.username);
  if (!user || !isUserActive_(user)) {
    const error = new Error('SESSION_EXPIRED: Tài khoản không còn hoạt động. Vui lòng đăng nhập lại.');
    error.code = 'SESSION_EXPIRED';
    throw error;
  }

  touchSessionRow_(sessionRow, meta);

  return {
    username: user.username || session.username || '',
    fullName: user.fullName || session.fullName || '',
    role: normalizeRole_(user.role || session.role),
    mustChangePassword: toBool(user.mustChangePassword)
  };
}

function touchSessionRow_(sessionRow, meta) {
  try {
    const { sheet, rowIndex, headers, map } = sessionRow;
    const values = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (map['lastSeenAt'] !== undefined) values[map['lastSeenAt']] = new Date().toISOString();
    if (meta && meta.userAgent && map['userAgent'] !== undefined) values[map['userAgent']] = meta.userAgent;
    if (meta && meta.ip && map['ip'] !== undefined) values[map['ip']] = meta.ip;
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values.slice(0, headers.length)]);
  } catch (err) {
    console.warn('Session touch failed:', err && err.message ? err.message : err);
  }
}

function revokeSession_(sessionToken, meta) {
  const sessionRow = findSessionRowByHash_(hashSessionToken_(sessionToken));
  if (!sessionRow) return { success: true };

  const { sheet, rowIndex, headers, map, session } = sessionRow;
  const values = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (map['revokedAt'] !== undefined) values[map['revokedAt']] = new Date().toISOString();
  if (map['active'] !== undefined) values[map['active']] = false;
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values.slice(0, headers.length)]);

  logAuditEvent_(Object.assign({}, {
    actorUsername: session.username || '',
    actorName: session.fullName || '',
    actorRole: session.role || '',
    module: 'auth',
    action: 'logout',
    entityType: 'Session',
    entityId: session.id || '',
    entityLabel: session.username || '',
    source: 'gas:logoutUser',
    beforeJson: '',
    afterJson: '',
    changesJson: '',
    status: 'success',
    errorMessage: ''
  }));

  return { success: true };
}

function generatePasswordSalt_() {
  return Utilities.getUuid() + Utilities.getUuid();
}

function hashPassword_(password, salt) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt || '') + ':' + String(password || ''),
    Utilities.Charset.UTF_8
  );
  return bytesToHex_(digest);
}

function verifyPassword_(password, user) {
  if (!user) return false;
  if (user.passwordHash && user.passwordSalt) {
    return hashPassword_(password, user.passwordSalt) === String(user.passwordHash);
  }
  return String(user.password || '') === String(password || '');
}

function buildPasswordFields_(password, mustChangePassword) {
  const salt = generatePasswordSalt_();
  return {
    password: '',
    passwordHash: hashPassword_(password, salt),
    passwordSalt: salt,
    passwordUpdatedAt: new Date().toISOString(),
    mustChangePassword: mustChangePassword === undefined ? false : mustChangePassword,
    passwordVersion: 1
  };
}

function validateNewPassword_(username, newPassword) {
  const value = String(newPassword || '');
  if (!value) throw new Error('PASSWORD_INVALID: Mật khẩu mới không được để trống.');
  if (value.length < 6) throw new Error('PASSWORD_INVALID: Mật khẩu mới phải có ít nhất 6 ký tự.');
  if (value === '123456') throw new Error('PASSWORD_INVALID: Không được dùng mật khẩu mặc định 123456.');
  if (value.toLowerCase() === String(username || '').toLowerCase()) {
    throw new Error('PASSWORD_INVALID: Mật khẩu không được trùng username.');
  }
  if (/^\d+$/.test(value) && value.length < 8) {
    throw new Error('PASSWORD_INVALID: Không dùng mật khẩu toàn số quá ngắn.');
  }
}

function findUserRowByUsername_(username) {
  const sheet = getSheet('Users');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const { map, headers } = getHeaderIndexMap(sheet);
  const usernameCol = map['username'];
  if (usernameCol === undefined) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const search = String(username || '').trim().toLowerCase();
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (String(row[usernameCol] || '').trim().toLowerCase() === search) {
      return {
        sheet,
        rowIndex: i + 2,
        headers,
        map,
        row,
        user: rowToObject(row, headers)
      };
    }
  }

  return null;
}

function updateUserPasswordFields_(username, password, mustChangePassword, resetAt) {
  const userRow = findUserRowByUsername_(username);
  if (!userRow) throw new Error('User not found');

  const fields = buildPasswordFields_(password, mustChangePassword);
  if (resetAt) fields.passwordResetAt = new Date().toISOString();

  const values = sheetRowWithPatch_(userRow, fields);
  userRow.sheet.getRange(userRow.rowIndex, 1, 1, userRow.headers.length).setValues([values]);
  return rowToObject(values, userRow.headers);
}

function sheetRowWithPatch_(rowInfo, patch) {
  const values = rowInfo.sheet.getRange(rowInfo.rowIndex, 1, 1, rowInfo.sheet.getLastColumn()).getValues()[0];
  rowInfo.headers.forEach((header, index) => {
    const key = toCamelCase(header);
    if (patch[key] !== undefined) values[index] = patch[key];
  });
  return values.slice(0, rowInfo.headers.length);
}

function migratePlaintextPasswordIfNeeded_(username, password, user) {
  if (!user || user.passwordHash) return user;
  if (String(user.password || '') !== String(password || '')) return user;

  const migratedUser = updateUserPasswordFields_(username, password, toBool(user.mustChangePassword), false);
  logAuditEvent_({
    actorUsername: username || '',
    actorName: user.fullName || '',
    actorRole: user.role || '',
    module: 'auth',
    action: 'password_migrated',
    entityType: 'User',
    entityId: username || '',
    entityLabel: user.fullName || username || '',
    source: 'gas:loginUser',
    beforeJson: '',
    afterJson: '',
    changesJson: safeJsonStringify_({ passwordMigrated: true }),
    status: 'success',
    errorMessage: ''
  });
  return migratedUser;
}

function normalizeRole_(role) {
  const raw = String(role || '').trim();
  const ascii = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (ascii === 'ADMIN') return 'TRUONG_KHOA';
  if (ascii === 'TRUONG_KHOA' || ascii === 'TRUONGKHOA') return 'TRUONG_KHOA';
  if (ascii === 'DIEU_DUONG_TRUONG' || ascii === 'DIEUDUONGTRUONG') return 'DIEU_DUONG_TRUONG';
  if (ascii === 'NHAN_VIEN' || ascii === 'NHANVIEN' || ascii === 'STAFF') return 'NHAN_VIEN';

  return ascii;
}

function normalizePermissionAction_(action) {
  const value = String(action || '').toLowerCase();
  if (value === 'create' || value === 'add' || value === 'assign') return 'add';
  if (value === 'update' || value === 'edit' || value === 'approve' || value === 'reject' || value === 'reset_password' || value === 'activate' || value === 'deactivate' || value === 'change_progress_status' || value === 'batch_upsert') return 'edit';
  if (value === 'delete' || value === 'remove') return 'delete';
  return value || 'view';
}

function getActorFromContext_(context) {
  if (context && context.__actor) return context.__actor;
  if (context && context.system) {
    return {
      username: context.username || 'system',
      fullName: context.fullName || 'System',
      role: normalizeRole_(context.role || 'TRUONG_KHOA')
    };
  }

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

function findSheetRowByKey_(sheet, map, keyField, value) {
  const keyCol = map[keyField];
  const search = String(value || '').trim().toLowerCase();
  if (keyCol === undefined || !search) return -1;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet.getRange(2, keyCol + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim().toLowerCase() === search) {
      return i + 2;
    }
  }

  return -1;
}

function findMutableRowIndex_(sheetName, sheet, map, id) {
  if (sheetName === 'Users') {
    const usernameRow = findSheetRowByKey_(sheet, map, 'username', id);
    if (usernameRow !== -1) return usernameRow;

    const idRow = findSheetRowByKey_(sheet, map, 'id', id);
    if (idRow !== -1) return idRow;

    return -1;
  }

  return findSheetRowByKey_(sheet, map, 'id', id);
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

function makeCodedError_(code, message) {
  const error = new Error(code + ': ' + message);
  error.code = code;
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
  if (context && context.system) return getActorFromContext_(context);

  let actor = null;

  try {
    actor = validateSession_(context && context.sessionToken ? context.sessionToken : '', context);
    if (context && typeof context === 'object') context.__actor = actor;
  } catch (err) {
    logPermissionDenied_(context, permission, entityId, payload, err && err.code ? err.code : 'AUTH_REQUIRED');
    throw err;
  }

  if (actor.mustChangePassword) {
    const error = new Error('PASSWORD_CHANGE_REQUIRED: Vui lòng đổi mật khẩu trước khi tiếp tục.');
    error.code = 'PASSWORD_CHANGE_REQUIRED';
    logPermissionDenied_(context, permission, entityId, payload, 'PASSWORD_CHANGE_REQUIRED');
    throw error;
  }

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
  actor.role = normalizeRole_(actor.role);

  if (actor.role !== 'TRUONG_KHOA') {
    throw makePermissionDeniedError_();
  }

  const targetUsername = String((beforeRecord && beforeRecord.username) || id || '').trim().toLowerCase();
  const actorUsername = String(actor.username || '').trim().toLowerCase();
  const targetRole = normalizeRole_(beforeRecord && beforeRecord.role);
  const nextRole = normalizeRole_(data && data.role);

  if (action === 'delete' && actorUsername && targetUsername && actorUsername === targetUsername) {
    throw makeCodedError_('CANNOT_DELETE_SELF', 'Không thể xoá tài khoản đang đăng nhập.');
  }

  if (data && nextRole === 'TRUONG_KHOA' && beforeRecord && targetRole !== 'TRUONG_KHOA') {
    if (actor.role !== 'TRUONG_KHOA') throw makePermissionDeniedError_();
  }

  if (action === 'delete' && beforeRecord && targetRole === 'TRUONG_KHOA') {
    const users = apiGet('Users');
    const remainingChiefs = users.filter(user =>
      String(user.username || '').trim().toLowerCase() !== targetUsername &&
      normalizeRole_(user.role) === 'TRUONG_KHOA' &&
      isUserActive_(user)
    );
    if (!remainingChiefs.length) {
      throw makeCodedError_('CANNOT_DELETE_LAST_TRUONG_KHOA', 'Không được xoá TRUONG_KHOA cuối cùng.');
    }
  }
}

function prepareUserMutationData_(action, data) {
  if (!data || action === 'delete') return data;
  const prepared = Object.assign({}, data);

  if (prepared.password !== undefined && String(prepared.password || '') !== '') {
    const passwordFields = buildPasswordFields_(prepared.password, true);
    if (action === 'update') {
      passwordFields.passwordResetAt = new Date().toISOString();
    }
    Object.assign(prepared, passwordFields);
  }

  if (action === 'create' && prepared.mustChangePassword === undefined) {
    prepared.mustChangePassword = true;
  }

  return prepared;
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
  
  const rows = dataRows.map(row => rowToObject(row, headers));
  if (sheetName === 'Users') {
    return rows.map(user => {
      const { password, passwordHash, passwordSalt, ...safeUser } = user;
      return safeUser;
    });
  }
  return rows;
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
  let syncResult = null;
  const permission = mapMutationToPermission_(sheetName, 'create', data);

  try {
    requirePermission_(userRole, permission, id, data);
    if (sheetName === 'Users') data = prepareUserMutationData_('create', data);
    const sheet = getSheet(sheetName);
    const { map, headers } = getHeaderIndexMap(sheet);
    
    // ID Handling: Use provided ID or generate new
    // Trim ID to ensure uniqueness safety
    id = id || Utilities.getUuid();
    if (isBriefingSheet_(sheetName)) data = normalizeBriefingPayload_(data);
    
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
    if (isBriefingSheet_(sheetName)) {
      syncResult = syncBriefingTasksToStaffTasks_(afterRecord, userRole);
    }
    return { success: true, id: id, syncResult: syncResult };
    
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
  let syncResult = null;
  const permission = mapMutationToPermission_(sheetName, 'update', data);

  try {
    requirePermission_(userRole, permission, id, data);
    if (sheetName === 'Users') data = prepareUserMutationData_('update', data);
    if (isBriefingSheet_(sheetName)) data = normalizeBriefingPayload_(data);
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
    
    if (sheetName !== 'Users' && colIndexID === undefined) throw new Error(`Sheet ${sheetName} missing ID column`);
    
    // Find Row
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error(`Record ID ${id} not found (empty sheet)`);
    
    const rowIndex = findMutableRowIndex_(sheetName, sheet, map, id);
    
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
    if (isBriefingSheet_(sheetName)) {
      syncResult = syncBriefingTasksToStaffTasks_(afterRecord, userRole);
    }
    
    return { success: true, syncResult: syncResult };
    
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
    
    if (sheetName !== 'Users' && colIndexID === undefined) throw new Error("Missing ID column");
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("Record not found");
    
    const rowIndex = findMutableRowIndex_(sheetName, sheet, map, id);
    
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

function loginUser(username, password, sessionContext) {
  const userRow = findUserRowByUsername_(username);
  let user = userRow ? userRow.user : null;
  const passwordOk = verifyPassword_(password, user);
  if (passwordOk && user && !user.passwordHash) {
    user = migratePlaintextPasswordIfNeeded_(username, password, user);
  }
  
  if (user && passwordOk) {
    if (!isUserActive_(user)) {
      logAuditEvent_({
        actorUsername: username || '',
        actorName: '',
        actorRole: '',
        module: 'auth',
        action: 'login_failed',
        entityType: 'User',
        entityId: username || '',
        entityLabel: username || '',
        source: 'gas:loginUser',
        beforeJson: '',
        afterJson: '',
        changesJson: '',
        status: 'failed',
        errorMessage: 'inactive user'
      });
      throw new Error('Tai khoan da bi khoa.');
    }
    if (!user.active) throw new Error("Tài khoản đã bị khoá.");
    const { password, passwordHash, passwordSalt, ...safeUser } = user;
    const session = createSession_(safeUser, sessionContext);
    logAuditEvent_({
      actorUsername: safeUser.username || '',
      actorName: safeUser.fullName || '',
      actorRole: safeUser.role || '',
      module: 'auth',
      action: 'login_success',
      entityType: 'User',
      entityId: safeUser.username || '',
      entityLabel: safeUser.fullName || safeUser.username || '',
      source: 'gas:loginUser',
      beforeJson: '',
      afterJson: '',
      changesJson: '',
      status: 'success',
      errorMessage: ''
    });
    return {
      user: safeUser,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt
    };
  }
  logAuditEvent_({
    actorUsername: username || '',
    actorName: '',
    actorRole: '',
    module: 'auth',
    action: 'login_failed',
    entityType: 'User',
    entityId: username || '',
    entityLabel: username || '',
    source: 'gas:loginUser',
    beforeJson: '',
    afterJson: '',
    changesJson: '',
    status: 'failed',
    errorMessage: 'invalid credentials'
  });
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
