
// FILE: initialize.gs
// Tác vụ: Đồng bộ Cấu trúc Database (Non-destructive)

/**
 * SOURCE OF TRUTH
 */
function getDetectedSchemas() {
  return [
    {
      name: 'Users',
      columns: ['ID', 'Username', 'Password', 'FullName', 'Role', 'NhomChuyenMon', 'Active', 'CreatedAt', 'CanDeletePatient']
    },
    {
      name: 'Roles_Permission',
      columns: ['Role', 'Module', 'CanView', 'CanAdd', 'CanEdit', 'CanDelete']
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
}