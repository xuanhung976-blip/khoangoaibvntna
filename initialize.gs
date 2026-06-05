
// FILE: initialize.gs
// Tác vụ: Đồng bộ Cấu trúc Database (Non-destructive)

/**
 * SOURCE OF TRUTH
 */
function getDetectedSchemas() {
  return [
    {
      name: 'Users',
      columns: [
        'ID', 'Username', 'Password', 'FullName', 'Role', 'NhomChuyenMon', 'Active',
        'CreatedAt', 'CanDeletePatient', 'passwordHash', 'passwordSalt',
        'passwordUpdatedAt', 'mustChangePassword', 'passwordResetAt', 'passwordVersion'
      ]
    },
    {
      name: 'Roles_Permission',
      columns: ['ID', 'Role', 'Module', 'CanView', 'CanAdd', 'CanEdit', 'CanDelete']
    },
    {
      name: 'Config',
      columns: ['Key', 'Value', 'Description']
    },
    {
      name: 'DS_BenhNhan',
      columns: [
        'ID', 'Name', 'Dob', 'Gender', 'Room', 'Bed', 
        'TreatmentType', 'Status', 'Diagnosis', 'TreatingDoctor', 
        'AdmissionDate', 'Notes', 
        'SurgeryDate', 'Surgeon', 'SurgeryMethod', 
        'AssistantSurgeon1', 'AssistantSurgeon2', 'AssistantSurgeon3',
        'Anesthetist', 'AnesthetistAssistant', 'ScrubNurse',
        'ApprovalDate', 'ApprovalNote',
        'ActualSurgeryDate', 'SurgeryClassification', 'InterventionType', 'ActivityType',
        'PhoneNumber', 'DischargeDate' // NEW: Phone and Discharge
      ]
    },
    {
      name: 'BN_LuuY', 
      columns: ['ID', 'PatientId', 'Priority', 'Reason', 'Room', 'Bed']
    },
    {
      name: 'Thuoc_Kho',
      columns: ['ID', 'Name', 'Content', 'Quantity', 'Unit', 'ExpiryDate', 'Notes']
    },
    {
      name: 'May_Moc',
      columns: ['ID', 'Name', 'Code', 'InCharge', 'PurchaseDate', 'LastMaintenanceDate', 'MaintenanceCycle', 'Condition', 'Notes']
    },
    {
      name: 'DeTai_CoSo',
      columns: ['ID', 'Topic', 'Author', 'StartDate', 'Deadline', 'Progress', 'Notes']
    },
    {
      name: 'SinhHoat_KH',
      columns: ['ID', 'Time', 'Topic', 'Presenter', 'Location', 'Notes']
    },
    {
      name: 'GiaoBan_Log',
      columns: ['ID', 'Date', 'Host', 'Content', 'CongViecJson', 'Notes']
    },
    {
      name: 'CongViec_NhanVien',
      columns: [
        'ID', 'UserId', 'TieuDe', 'NoiDung', 'NguoiGiao', 'NgayGiao', 'HanHoanThanh',
        'MucDoUuTien', 'TrangThai', 'TienDo', 'KetQua', 'GhiChu', 'sourceType',
        'sourceId', 'sourceTaskId', 'sourceTaskIndex', 'assigneeUsername',
        'assigneeName', 'sourceDate', 'sourceLabel', 'syncStatus', 'syncedAt'
      ]
    },
    {
      name: 'DanhGia_NhanVien',
      columns: [
        'ID', 'UserId', 'LoaiDanhGia', 'Quy', 'Nam', 'DiemHoanThanhCongViec',
        'DiemThaiDo', 'DiemKyLuat', 'DiemPhoiHop', 'DiemSangKien', 'DiemTong',
        'XepLoai', 'NhanXet', 'NguoiDanhGia', 'NgayDanhGia'
      ]
    },
    {
      name: 'KyThuat_Moi',
      columns: ['ID', 'Name', 'Leader', 'Description', 'StartDate', 'Progress', 'Count', 'Status', 'Results']
    },
    {
      name: 'NoiDung_TT',
      columns: ['ID', 'Title', 'Content', 'Platform', 'Leader', 'PublishDate', 'Status', 'Link']
    },
    {
      name: 'Vung_5S',
      columns: ['ID', 'Name', 'Type', 'Pic', 'CurrentScore', 'LastCheckDate', 'Notes']
    },
    {
      name: 'DanhGia_5S',
      columns: ['ID', 'ZoneId', 'Date', 'Assessor', 'Score', 'Comments']
    },
    {
      name: 'CaiTien_5S',
      columns: ['ID', 'ZoneId', 'Content', 'Proposer', 'Status', 'Result']
    },
    {
      name: 'Phan_Truc_Ngay',
      columns: ['ID', 'Date', 'Doctor', 'Nurse1', 'Nurse2', 'Note']
    },
    {
      name: 'CongTac_DieuDuong',
      columns: ['ID', 'Date', 'Shift', 'Task', 'Status']
    },
    {
      name: 'Logs',
      columns: ['ID', 'Timestamp', 'User', 'Action', 'Target', 'Detail']
    },
    {
      name: 'AuditLogs',
      columns: [
        'id', 'timestamp', 'actorUsername', 'actorName', 'actorRole', 'module',
        'action', 'entityType', 'entityId', 'entityLabel', 'source', 'beforeJson',
        'afterJson', 'changesJson', 'ip', 'userAgent', 'status', 'errorMessage'
      ]
    },
    {
      name: 'Sessions',
      columns: [
        'id', 'tokenHash', 'username', 'fullName', 'role', 'createdAt', 'expiresAt',
        'lastSeenAt', 'revokedAt', 'userAgent', 'ip', 'active'
      ]
    }
  ];
}

/**
 * MAIN FUNCTION: Initialize without data loss
 */
function initializeSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schemas = getDetectedSchemas();
  
  schemas.forEach(schema => {
    let sheet = ss.getSheetByName(schema.name);
    
    // 1. Create if missing
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
      sheet.appendRow(schema.columns);
      // Basic styling
      sheet.getRange(1, 1, 1, schema.columns.length).setFontWeight('bold').setBackground('#eee');
      sheet.setFrozenRows(1);
      Logger.log('Created sheet: ' + schema.name);
    } else {
      // 2. Check for missing columns and append them
      const lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        sheet.appendRow(schema.columns);
      } else {
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const existingMap = {};
        headers.forEach(h => existingMap[String(h).toLowerCase()] = true);
        
        const missing = [];
        schema.columns.forEach(col => {
          if (!existingMap[String(col).toLowerCase()]) {
            missing.push(col);
          }
        });
        
        if (missing.length > 0) {
          sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
          // Style new headers
          sheet.getRange(1, lastCol + 1, 1, missing.length).setFontWeight('bold').setBackground('#eee');
          Logger.log(`Updated sheet ${schema.name}: Added columns ${missing.join(', ')}`);
        }
      }
    }
  });
  
  // Setup Default User if Users is empty
  const userSheet = ss.getSheetByName('Users');
  if (userSheet && userSheet.getLastRow() === 1) {
    userSheet.appendRow([
      Utilities.getUuid(), 'admin', 'admin', 'Administrator', 'TRUONG_KHOA', 'BS', true, new Date(), true
    ]);
    Logger.log('Created default admin user');
  }

  seedDefaultClinicalPermissions_(ss);
}

function seedDefaultClinicalPermissions_(ss) {
  const sheet = ss.getSheetByName('Roles_Permission');
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const headerMap = {};
  headers.forEach((header, index) => headerMap[String(header).trim().toLowerCase()] = index);

  const existing = [];
  if (sheet.getLastRow() > 1) {
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    values.forEach(row => {
      existing.push({
        role: String(row[headerMap['role']] || '').trim(),
        module: String(row[headerMap['module']] || '').trim()
      });
    });
  }

  const defaults = [
    { role: 'TRUONG_KHOA', module: 'clinical', canView: true, canAdd: true, canEdit: true, canDelete: true },
    { role: 'DIEU_DUONG_TRUONG', module: 'clinical', canView: true, canAdd: true, canEdit: true, canDelete: false },
    { role: 'NHAN_VIEN', module: 'clinical', canView: true, canAdd: true, canEdit: true, canDelete: false },
    { role: 'BAC_SI', module: 'clinical', canView: true, canAdd: true, canEdit: true, canDelete: false },
    { role: 'DIEU_DUONG', module: 'clinical', canView: true, canAdd: true, canEdit: true, canDelete: false },
    { role: 'ADMIN', module: 'clinical', canView: true, canAdd: true, canEdit: true, canDelete: true }
  ];

  defaults.forEach(permission => {
    const exists = existing.some(item =>
      initializeNormalizeSeedRole_(item.role) === initializeNormalizeSeedRole_(permission.role) &&
      initializeNormalizeClinicalModule_(item.module) === 'clinical'
    );
    if (exists) return;

    const row = headers.map(header => {
      const key = String(header).trim().toLowerCase();
      if (key === 'id') return permission.role + '_' + permission.module;
      if (key === 'role') return permission.role;
      if (key === 'module') return permission.module;
      if (key === 'canview') return permission.canView;
      if (key === 'canadd') return permission.canAdd;
      if (key === 'canedit') return permission.canEdit;
      if (key === 'candelete') return permission.canDelete;
      return '';
    });
    sheet.appendRow(row);
    existing.push({ role: permission.role, module: permission.module });
    Logger.log('Seeded clinical permission: ' + permission.role);
  });
}

function initializeNormalizeRole_(role) {
  const ascii = String(role || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (ascii === 'ADMIN') return 'TRUONG_KHOA';
  if (ascii === 'BAC_SI' || ascii === 'BACSI' || ascii === 'BS' || ascii === 'DOCTOR') return 'NHAN_VIEN';
  if (ascii === 'DIEU_DUONG' || ascii === 'DIEUDUONG' || ascii === 'DD' || ascii === 'NURSE') return 'NHAN_VIEN';
  if (ascii === 'DIEU_DUONG_TRUONG' || ascii === 'DIEUDUONGTRUONG') return 'DIEU_DUONG_TRUONG';
  if (ascii === 'NHAN_VIEN' || ascii === 'NHANVIEN' || ascii === 'STAFF') return 'NHAN_VIEN';
  if (ascii === 'TRUONG_KHOA' || ascii === 'TRUONGKHOA') return 'TRUONG_KHOA';
  return ascii;
}

function initializeNormalizeSeedRole_(role) {
  return String(role || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

function initializeNormalizeClinicalModule_(moduleName) {
  const ascii = String(moduleName || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (ascii === 'clinical' || ascii === 'patient' || ascii === 'patients' || ascii === 'benhnhan' || ascii === 'benh_nhan' || ascii === 'ds_benhnhan' || ascii === 'ds_benh_nhan') return 'clinical';
  return ascii;
}
