
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
      return batchSaveDailyOnCall(args[0]);
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
  return sheet;
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
  
  try {
    const sheet = getSheet(sheetName);
    const { map, headers } = getHeaderIndexMap(sheet);
    
    // ID Handling: Use provided ID or generate new
    // Trim ID to ensure uniqueness safety
    let id = data.id ? String(data.id).trim() : Utilities.getUuid();
    
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
    return { success: true, id: id };
    
  } finally {
    lock.releaseLock();
  }
}

function apiUpdate(sheetName, id, data, userRole) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
     throw new Error("Server is busy. Please try again.");
  }

  try {
    // --- SECURITY CHECK ---
    // Prevent STAFF from approving surgery or modifying approved status
    if (sheetName === 'DS_BenhNhan' && userRole === 'NHAN_VIEN') {
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
    
    return { success: true };
    
  } finally {
    lock.releaseLock();
  }
}

function apiDelete(sheetName, id, userRole) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
     throw new Error("Server is busy. Please try again.");
  }

  try {
    const sheet = getSheet(sheetName);
    const { map } = getHeaderIndexMap(sheet);
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
    
    sheet.deleteRow(rowIndex);
    return { success: true };
    
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

function batchSaveDailyOnCall(shifts) {
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
    
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function toBool(value) {
  return value === true || value === 'TRUE' || value === 'true' || value === '1' || value === 1;
}

function saveRolePermissions(permissions, userRole) {
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
