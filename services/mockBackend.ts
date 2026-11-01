/*
 * Backend giả lập CHỈ dùng khi chạy dev với VITE_USE_MOCK=true.
 * Dữ liệu mẫu nằm trong bộ nhớ trình duyệt (mất khi tải lại trang) — giúp kiểm thử
 * giao diện mà không chạm vào Google Sheets / Supabase thật.
 */
import type { Patient } from '../types';

type Row = Record<string, any>;

const pad = (value: number) => String(value).padStart(2, '0');
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const today = new Date();
const day = (offset: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return keyOf(date);
};
let seq = 1000;
const uid = (prefix: string) => `${prefix}_${++seq}`;

const DOCTORS = ['BS. Nguyễn Xuân Hùng', 'BS. Trần Văn Minh', 'BS. Lê Thị Hoa', 'BS. Phạm Quốc Bảo', 'BS. Hoàng Đức Long'];
const NURSES = ['ĐD. Nguyễn Thị Lan', 'ĐD. Trần Thu Hà', 'ĐD. Lê Văn Nam', 'ĐD. Phan Thị Mai', 'ĐD. Vũ Thị Thảo'];
const NAMES = [
  'Nguyễn Thị Hương', 'Trần Văn Bình', 'Lê Thị Thu', 'Phạm Văn Đức', 'Hoàng Thị Mai', 'Vũ Văn Long', 'Đặng Thị Ngọc', 'Bùi Văn Tuấn',
  'Đỗ Thị Hạnh', 'Hồ Văn Sơn', 'Ngô Thị Lan', 'Dương Văn Hải', 'Lý Thị Kim', 'Phan Văn Toàn', 'Võ Thị Yến', 'Trịnh Văn Khoa',
  'Mai Thị Huyền', 'Cao Văn Thắng', 'Lưu Thị Phương', 'Tạ Văn Quang', 'Đinh Thị Nga', 'Kiều Văn Phúc', 'Hà Thị Oanh', 'Châu Văn Lộc',
];
const DIAGNOSES = [
  'Bướu giáp đa nhân 2 thùy', 'K tuyến giáp thể nhú T1N0M0', 'Basedow kháng điều trị nội khoa', 'Nhân giáp thùy phải TIRADS 4',
  'Tăng tiết mồ hôi tay', 'Nang giáp thùy trái', 'K tuyến giáp di căn hạch cổ', 'Bướu giáp nhân thùy trái',
];

const services: Array<[string, string, string]> = [
  ['TOETVA', 'LOAI_I', 'TOETVA cắt thùy tuyến giáp'],
  ['K_GIAP', 'DAC_BIET', 'Cắt toàn bộ tuyến giáp + nạo vét hạch cổ trung tâm'],
  ['BASEDOW', 'LOAI_I', 'Cắt gần toàn bộ tuyến giáp'],
  ['CAT_1_THUY', 'LOAI_II', 'Cắt 1 thùy + eo tuyến giáp'],
  ['RFA', '', 'Đốt sóng cao tần (RFA) nhân tuyến giáp'],
  ['ETS', 'LOAI_II', 'Phẫu thuật nội soi đốt hạch giao cảm ngực 2 bên'],
];

const buildPatients = (): Patient[] => {
  const list: Patient[] = [];
  let index = 0;
  const make = (overrides: Partial<Patient>): Patient => {
    const name = NAMES[index % NAMES.length];
    index += 1;
    return {
      id: `2600${String(1200 + index)}`,
      name,
      dob: String(1950 + ((index * 7) % 50)),
      gender: /Thị/.test(name) ? 'Nữ' : 'Nam',
      phoneNumber: `09${String(10000000 + index * 7919).slice(0, 8)}`,
      room: String(201 + (index % 6)),
      bed: String(1 + (index % 5)),
      treatmentType: 'Ngoai',
      status: 'ChoMo',
      diagnosis: DIAGNOSES[index % DIAGNOSES.length],
      treatingDoctor: DOCTORS[index % DOCTORS.length],
      admissionDate: day(-(index % 9)),
      ...overrides,
    } as Patient;
  };
  // Chờ mổ
  for (let i = 0; i < 5; i++) list.push(make({ status: 'ChoMo', admissionDate: day(-(i * 2 + 1)) }));
  // Đã duyệt: hôm nay, ngày mai, quá ngày
  [0, 0, 0, 1, 1, -2].forEach((offset, i) => {
    const [service, type, method] = services[i % services.length];
    list.push(
      make({
        status: 'DaDuyet',
        surgeryDate: day(offset),
        surgeryOrder: (i % 3) + 1,
        surgeryService: service,
        surgeryType: type,
        surgeryMethod: method,
        surgeon: DOCTORS[i % 3],
        assistantSurgeon1: DOCTORS[(i + 1) % 5],
        anesthetist: DOCTORS[4],
        anesthetistAssistant: NURSES[(i + 2) % 5],
        scrubNurse: NURSES[i % 5],
        approvalDate: new Date().toISOString(),
        activityType: service === 'RFA' ? 'Thủ thuật' : 'Phẫu thuật',
      }),
    );
  });
  // Hậu phẫu
  for (let i = 0; i < 6; i++) {
    const [service, type, method] = services[i % services.length];
    list.push(
      make({
        status: 'DaMo',
        actualSurgeryDate: day(-(i + 1)),
        surgeryDate: day(-(i + 1)),
        surgeryService: service,
        surgeryType: i === 4 ? '' : type,
        surgeryMethod: method,
        surgeon: DOCTORS[i % 3],
        activityType: service === 'RFA' ? 'Thủ thuật' : 'Phẫu thuật',
      }),
    );
  }
  // Ca thiếu phân loại để thử luồng "Cần phân loại"
  list.push(make({ status: 'DaMo', actualSurgeryDate: day(-2), surgeryService: 'K_GIAP', surgeryMethod: 'Cắt toàn bộ tuyến giáp', surgeon: DOCTORS[0] }));
  // Nội khoa
  for (let i = 0; i < 3; i++) list.push(make({ status: 'DieuTri', treatmentType: 'Noi', diagnosis: 'Viêm giáp bán cấp' }));
  // Ra viện — có dữ liệu mổ trong 6 tháng qua cho biểu đồ
  for (let i = 0; i < 70; i++) {
    const [service, type, method] = services[i % services.length];
    const offset = -(5 + ((i * 3) % 170));
    list.push(
      make({
        status: 'RaVien',
        admissionDate: day(offset - 2),
        actualSurgeryDate: day(offset),
        dischargeDate: day(offset + 3),
        surgeryService: service,
        surgeryType: type,
        surgeryMethod: method,
        surgeon: DOCTORS[i % 4],
        activityType: service === 'RFA' ? 'Thủ thuật' : 'Phẫu thuật',
      }),
    );
  }
  // Một ca nằm ghép để thử sơ đồ giường.
  list[4] = { ...list[4], room: list[0].room, bed: list[0].bed };
  return list;
};

const users = [
  { username: 'admin', fullName: 'BS. Nguyễn Xuân Hùng', role: 'TRUONG_KHOA', nhomChuyenMon: 'BS' },
  { username: 'bs.minh', fullName: 'BS. Trần Văn Minh', role: 'NHAN_VIEN', nhomChuyenMon: 'BS' },
  { username: 'bs.hoa', fullName: 'BS. Lê Thị Hoa', role: 'NHAN_VIEN', nhomChuyenMon: 'BS' },
  { username: 'bs.bao', fullName: 'BS. Phạm Quốc Bảo', role: 'NHAN_VIEN', nhomChuyenMon: 'BS' },
  { username: 'bs.long', fullName: 'BS. Hoàng Đức Long', role: 'NHAN_VIEN', nhomChuyenMon: 'BS' },
  { username: 'dd.lan', fullName: 'ĐD. Nguyễn Thị Lan', role: 'DIEU_DUONG_TRUONG', nhomChuyenMon: 'DD' },
  { username: 'dd.ha', fullName: 'ĐD. Trần Thu Hà', role: 'NHAN_VIEN', nhomChuyenMon: 'DD' },
  { username: 'dd.nam', fullName: 'ĐD. Lê Văn Nam', role: 'NHAN_VIEN', nhomChuyenMon: 'DD' },
  { username: 'dd.mai', fullName: 'ĐD. Phan Thị Mai', role: 'NHAN_VIEN', nhomChuyenMon: 'DD' },
  { username: 'dd.thao', fullName: 'ĐD. Vũ Thị Thảo', role: 'NHAN_VIEN', nhomChuyenMon: 'DD', active: false },
].map((user, index) => ({ id: `U${index + 1}`, active: true, createdAt: day(-200 + index), canDeletePatient: index === 0, mustChangePassword: false, ...user }));

const sheets: Record<string, Row[]> = {
  Users: users,
  Phan_Truc_Ngay: Array.from({ length: 24 }, (_, i) => ({
    id: uid('S'),
    date: day(i - 14),
    doctor: DOCTORS[i % 5],
    nurse1: NURSES[i % 5],
    nurse2: NURSES[(i + 2) % 5],
    note: '',
  })).filter((_, i) => i !== 15), // để trống ngày mai
  Thuoc_Kho: [
    { id: uid('M'), name: 'Cefazolin 1g', content: 'Bột pha tiêm', quantity: 40, unit: 'Lọ', expiryDate: day(200) },
    { id: uid('M'), name: 'Paracetamol 1g/100ml', content: 'Dịch truyền', quantity: 6, unit: 'Chai', expiryDate: day(20) },
    { id: uid('M'), name: 'Calci clorid 10%', content: 'Ống 5ml', quantity: 25, unit: 'Ống', expiryDate: day(-5) },
    { id: uid('M'), name: 'Chỉ Vicryl 3/0', content: 'Vật tư', quantity: 18, unit: 'Sợi', expiryDate: day(60) },
    { id: uid('M'), name: 'Gạc vô khuẩn', content: '10x10cm', quantity: 200, unit: 'Gói', expiryDate: day(400) },
  ],
  May_Moc: [
    { id: uid('E'), name: "Dao mổ điện cao tần tích hợp chức năng hàn mạch", code: "DM.3[CHOMUON].T4G79595DX", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2025-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Valleylab FT10 (VLFT10GEN) | Hãng: Medtronic (Covidien)- Mỹ (Mỹ) | SL: 1" },
    { id: uid('E'), name: "Bơm tiêm truyền dịch", code: "BTD.2.40065.8712212", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2012-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: InfusomatP | Hãng: B.Braun (Đức) | SL: 1" },
    { id: uid('E'), name: "Dao mổ cao tần", code: "DM.1.F6A75156AX", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2016-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Force FX-8C | Hãng: Covidien (Mỹ) | SL: 1" },
    { id: uid('E'), name: "Máy tạo Ôxy 5 lít/phút", code: "MTO.2.40065.60601-1", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2012-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: IRC 5LXO2AW | Hãng: Invacare Mỹ (Trung quốc) | SL: 1" },
    { id: uid('E'), name: "Đèn mổ SOLA DRAGER G16920", code: "ĐM.1.ASCL-0778", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2012-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: G16920/22 | Hãng: Draeger Medical GmbH (Đức) | SL: 1" },
    { id: uid('E'), name: "Dao siêu âm Ethicon Endo-Surgery", code: "DM.3[TUMUA].1111224119", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2012-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Ethicon_Endo-Surgery | Hãng: Ethicon (Đức) | SL: 3" },
    { id: uid('E'), name: "Dao siêu âm Ethicon Endo-Surgery", code: "DM.3[TUMUA].1111533053", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2015-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Ethicon_Endo-Surgery | Hãng: Ethicon (Đức) | SL: 1" },
    { id: uid('E'), name: "Máy xông khí dung NARITA", code: "KD.3[TUMUA].15050048", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2019-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: NT-0911 | Hãng: NARITA (Nhật Bản) | SL: 1" },
    { id: uid('E'), name: "Máy hút liên tục áp lực thấp", code: "MH.1.1112057U", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2012-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: CD-2800 | Hãng: Power Carry (Nhật Bản) | SL: 1" },
    { id: uid('E'), name: "Máy hút dịch: Surgical Suction Unit", code: "MHD.1.18063308269", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2019-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Novela | Hãng: OzOmco (Thổ Nhĩ Kỳ) | SL: 1" },
    { id: uid('E'), name: "Monitor enmove", code: "MNT.3.40065.W-1B108783", inCharge: 'Tổ TTBYT Khoa Ngoại', lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: ENMOVE 1200 | Hãng: USA (Mennen medical) | SL: 1" },
    { id: uid('E'), name: "Máy đo đường huyết GluNEO Lite", code: "SH.3[MAYMUON].G103A23J3114862", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2025-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: IGM-1003A | Hãng: OSANG Healthcare Co., Ltd. (Hàn Quốc) | SL: 1" },
    { id: uid('E'), name: "Máy đo đường huyết GluNEO Lite", code: "SH.3[MAYMUON].G103A23J3115189", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2025-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: IGM-1003A | Hãng: OSANG Healthcare Co., Ltd. (Hàn Quốc) | SL: 1" },
    { id: uid('E'), name: "Máy đo đường huyết GluNEO Lite", code: "SH.3[MAYMUON].G103A23J3115268", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2025-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: IGM-1003A | Hãng: OSANG Healthcare Co., Ltd. (Hàn Quốc) | SL: 1" },
    { id: uid('E'), name: "Dao mổ cao tần", code: "DM.1.F6E75835AX", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2016-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Force FX-8C | Hãng: Covidien (Mỹ) | SL: 1" },
    { id: uid('E'), name: "Máy đo đường huyết On Call plus", code: "SH.3[CHOMUON].103A32383BF", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2025-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: On_Call_Flus | Hãng: ACON Biotech (Trung quốc) | SL: 1" },
    { id: uid('E'), name: "Bàn mổ đa năng điện - Thủy lực", code: "BM.1.16061155861", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2017-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: OM-6N | Hãng: Uzumcu (Thổ Nhĩ Kỳ) | SL: 1" },
    { id: uid('E'), name: "Bộ phẫu thuật nội soi tuyến giáp đường miệng", code: "PT.1.26003BA;30114GZG;30160GZG", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2022-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Nhiều bộ phận | Hãng: Karl Storz (Đức/Thụy Sỹ/Mỹ) | SL: 1" },
    { id: uid('E'), name: "Bàn mổ đa năng điện - Thủy lực", code: "BM.1.36155482011", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2011-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: ST280 | Hãng: Sturdy (Đà Loan) | SL: 1" },
    { id: uid('E'), name: "Hệ thống máy hủy khối u sử dụng sóng cao tần", code: "HKU.1.F200-CA-0009", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2021-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: AK-F200 | Hãng: Apro Korea (Hàn Quốc) | SL: 1" },
    { id: uid('E'), name: "Đèn khám ánh sáng lạnh công suất 45.000 LUX", code: "DK.1.EPL2003010", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2020-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: LED SL88A | Hãng: Elpis Medical (Hàn Quốc) | SL: 1" },
    { id: uid('E'), name: "Hệ thống dao điện cao tần thông minh đồng bộ", code: "DM.1.B008399", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2021-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: ESG-400 | Hãng: Olympus (Đức) | SL: 1" },
    { id: uid('E'), name: "Hệ thống phẫu thuật nội soi ổ bụng và tuyến giáp full HD", code: "PT.1.C297PT010/TT749599-P/ST34868", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2016-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: 9627NB/KS-27 | Hãng: Karl Storz (Đức, Ý, Mỹ, Thụy sỹ) | SL: 1" },
    { id: uid('E'), name: "Máy gây mê kèm thở", code: "MGM.2.ASCM-0224", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2011-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Fabius | Hãng: Draeger Medical GmbH (Đức) | SL: 1" },
    { id: uid('E'), name: "Máy gây mê kèm thở kèm monitor 7 thông số", code: "MGM.1.SM616310013MA", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2016-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Carestation620A1 | Hãng: Datex-Ohmeda (Mỹ) | SL: 1" },
    { id: uid('E'), name: "Máy hút dịch", code: "MHD.1.9031021", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2011-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: DF - 600 | Hãng: Doctor's Friend (Đài loan) | SL: 1" },
    { id: uid('E'), name: "Máy hút dịch", code: "MHD.3[TUMUA].35676", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2022-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: New Hospivac 350 | Hãng: Ca-mi S.R.L (Italia) | SL: 1" },
    { id: uid('E'), name: "Máy siêu âm định hướng đường kim Doppler màu", code: "SA.1.Q52ZGZ", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2019-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: M-Turbo | Hãng: Fujifilm/ SonoSite (Mỹ) | SL: 1" },
    { id: uid('E'), name: "Máy theo dõi bệnh nhân 5 thông số (Monitor)", code: "MTD.1.06634", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2015-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: PVM-2701 | Hãng: Nihon Kohden (Nhật bản) | SL: 1" },
    { id: uid('E'), name: "Máy theo dõi bệnh nhân 5 thông số (Monitor)", code: "MNT.1.H1107011", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2020-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: CETUS X12 | Hãng: Axcent (Đức) | SL: 1" },
    { id: uid('E'), name: "Máy thở cho bệnh nhân", code: "MT.1.20576;219339;27182", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2011-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: Servo - S | Hãng: Maquet (Thuỷ điển) | SL: 1" },
    { id: uid('E'), name: "Máy theo dõi bệnh nhân GE B20i (Monitor)", code: "MNT.3[TUMUA].SJW16210041HA", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2016-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: B20i | Hãng: GE Healthcare Finland OY (Phần Lan) | SL: 1" },
    { id: uid('E'), name: "Máy theo dõi bệnh nhân C50 (Monitor)", code: "MNT.1.K5080324049", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2024-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: C50 | Hãng: Shenzhen Comen medical Instruments Co.,LTD (Trung quốc) | SL: 1" },
    { id: uid('E'), name: "Máy theo dõi bệnh nhân C50 (Monitor)", code: "MNT.1.K5080324058", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2024-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: C50 | Hãng: Shenzhen Comen medical Instruments Co.,LTD (Trung quốc) | SL: 1" },
    { id: uid('E'), name: "Máy theo dõi bệnh nhân C50 (Monitor)", code: "MNT.1.K5080324074", inCharge: 'Tổ TTBYT Khoa Ngoại', purchaseDate: "2024-01-01", lastMaintenanceDate: '2026-01-15', maintenanceCycle: 12, condition: 'Normal', notes: "Model: C50 | Hãng: Shenzhen Comen medical Instruments Co.,LTD (Trung quốc) | SL: 1" },
  ],
  DeTai_CoSo: [
    { id: uid('R'), topic: 'Đánh giá kết quả phẫu thuật TOETVA điều trị bướu giáp lành tính', author: 'BS. Nguyễn Xuân Hùng', startDate: day(-200), deadline: day(15), progress: 70, notes: '' },
    { id: uid('R'), topic: 'Kết quả đốt hạch giao cảm ngực điều trị tăng tiết mồ hôi tay', author: 'BS. Trần Văn Minh', startDate: day(-300), deadline: day(-10), progress: 85, notes: 'Chờ phân tích số liệu' },
    { id: uid('R'), topic: 'Hiệu quả RFA nhân giáp lành tính', author: 'BS. Phạm Quốc Bảo', startDate: day(-400), deadline: day(-60), progress: 100, notes: 'Đã nghiệm thu' },
  ],
  SinhHoat_KH: [
    { id: uid('H'), time: `${day(3)}T14:00`, topic: 'Cập nhật hướng dẫn ATA 2025 về nhân giáp', presenter: 'BS. Lê Thị Hoa', location: 'Phòng giao ban', notes: 'Tài liệu: https://example.com/ata' },
    { id: uid('H'), time: `${day(10)}T14:00`, topic: 'Báo cáo ca bệnh: biến chứng hạ calci sau mổ', presenter: 'BS. Hoàng Đức Long', location: 'Hội trường', notes: '' },
    { id: uid('H'), time: `${day(-20)}T14:00`, topic: 'Kỹ thuật bảo tồn tuyến cận giáp', presenter: 'BS. Nguyễn Xuân Hùng', location: 'Phòng giao ban', notes: '' },
  ],
  KyThuat_Moi: [
    { id: uid('K'), name: 'TOETVA', leader: 'BS. Nguyễn Xuân Hùng', startDate: day(-500), progress: 100, count: 12, status: 'HoanThanh', description: 'Phẫu thuật nội soi tuyến giáp qua tiền đình miệng' },
    { id: uid('K'), name: 'Đốt sóng cao tần', leader: 'BS. Phạm Quốc Bảo', startDate: day(-200), progress: 60, count: 8, status: 'DangTrienKhai', description: 'RFA nhân giáp lành tính' },
    { id: uid('K'), name: 'Theo dõi thần kinh thanh quản quặt ngược (IONM)', leader: 'BS. Trần Văn Minh', startDate: day(-20), progress: 10, count: 0, status: 'DeXuat' },
  ],
  NoiDung_TT: [
    { id: uid('T'), title: 'Phẫu thuật tuyến giáp không để lại sẹo vùng cổ', platform: 'Facebook', leader: 'ĐD. Phan Thị Mai', publishDate: day(-3), status: 'DaDang', link: 'https://facebook.com', content: 'Giới thiệu kỹ thuật TOETVA' },
    { id: uid('T'), title: 'Chăm sóc sau mổ tuyến giáp tại nhà', platform: 'Zalo', leader: 'ĐD. Nguyễn Thị Lan', publishDate: day(5), status: 'Duyet', content: '' },
    { id: uid('T'), title: 'Ngày hội khám sàng lọc bướu giáp', platform: 'Website', leader: 'BS. Lê Thị Hoa', publishDate: day(14), status: 'Nhap', content: '' },
  ],
  Vung_5S: [
    { id: 'Z1', name: 'Buồng 201', type: 'Buồng bệnh', pic: 'ĐD. Trần Thu Hà', currentScore: 0, lastCheckDate: '' },
    { id: 'Z2', name: 'Phòng thủ thuật', type: 'Phòng thủ thuật', pic: 'ĐD. Lê Văn Nam', currentScore: 0, lastCheckDate: '' },
    { id: 'Z3', name: 'Kho vật tư', type: 'Kho', pic: 'ĐD. Phan Thị Mai', currentScore: 0, lastCheckDate: '' },
  ],
  DanhGia_5S: [
    { id: uid('V'), zoneId: 'Z1', date: day(-60), score: 82, assessor: 'ĐD. Nguyễn Thị Lan', comments: '' },
    { id: uid('V'), zoneId: 'Z1', date: day(-30), score: 88, assessor: 'ĐD. Nguyễn Thị Lan', comments: '' },
    { id: uid('V'), zoneId: 'Z1', date: day(-2), score: 93, assessor: 'ĐD. Nguyễn Thị Lan', comments: 'Gọn gàng' },
    { id: uid('V'), zoneId: 'Z2', date: day(-45), score: 65, assessor: 'ĐD. Nguyễn Thị Lan', comments: 'Dụng cụ chưa dán nhãn' },
  ],
  CaiTien_5S: [
    { id: uid('I'), zoneId: 'Z2', content: 'Dán nhãn khay dụng cụ theo màu', proposer: 'ĐD. Lê Văn Nam', status: 'DangLam' },
    { id: uid('I'), zoneId: 'Z3', content: 'Sắp xếp vật tư theo nguyên tắc FEFO', proposer: 'ĐD. Phan Thị Mai', status: 'DeXuat' },
  ],
  GiaoBan_Log: [
    {
      id: uid('G'),
      date: day(-1),
      title: 'Giao ban sáng',
      time: '07:30',
      host: 'BS. Nguyễn Xuân Hùng',
      content: 'I. Tình hình bệnh nhân\n- Tổng số 21 BN, chờ mổ 5.\nII. Ý kiến chỉ đạo\n- Tăng cường theo dõi calci sau mổ.',
      congViecJson: JSON.stringify([
        { id: 'T1', taskName: 'Hoàn thiện hồ sơ bệnh án tháng', assigneeUsername: 'bs.minh', assigneeName: 'BS. Trần Văn Minh', deadline: day(2), progress: 30 },
        { id: 'T2', taskName: 'Kiểm kê tủ thuốc trực', assigneeUsername: 'dd.lan', assigneeName: 'ĐD. Nguyễn Thị Lan', deadline: day(-1), progress: 0 },
      ]),
    },
  ],
  CongViec_NhanVien: [
    { id: uid('W'), userId: 'admin', tieuDe: 'Duyệt báo cáo thống kê PT tháng', noiDung: 'Rà soát số liệu trước khi gửi phòng KHTH', nguoiGiao: 'Ban giám đốc', ngayGiao: day(-5), hanHoanThanh: day(-1), mucDoUuTien: 'Cao', trangThai: 'Đang làm', tienDo: 60 },
    { id: uid('W'), userId: 'bs.minh', tieuDe: 'Hoàn thiện hồ sơ bệnh án tháng', noiDung: 'Hoàn thiện hồ sơ bệnh án tháng', nguoiGiao: 'BS. Nguyễn Xuân Hùng', ngayGiao: day(-1), hanHoanThanh: day(2), mucDoUuTien: 'Trung bình', trangThai: 'Đang làm', tienDo: 30, sourceType: 'daily_briefing', sourceDate: day(-1) },
    { id: uid('W'), userId: 'dd.lan', tieuDe: 'Kiểm kê tủ thuốc trực', noiDung: '', nguoiGiao: 'BS. Nguyễn Xuân Hùng', ngayGiao: day(-1), hanHoanThanh: day(-1), mucDoUuTien: 'Khẩn', trangThai: 'Chưa làm', tienDo: 0, sourceType: 'daily_briefing', sourceDate: day(-1) },
    { id: uid('W'), userId: 'admin', tieuDe: 'Chuẩn bị bài SHKH tháng', noiDung: '', nguoiGiao: 'Tự giao', ngayGiao: day(-10), hanHoanThanh: day(5), mucDoUuTien: 'Trung bình', trangThai: 'Hoàn thành', tienDo: 100 },
    // Lịch sử việc 3 tháng gần đây cho bảng so sánh (đúng hạn / trễ / quá hạn khác nhau giữa các người).
    ...(
      [
        ['bs.minh', -80, -82, 'Hoàn thành'], ['bs.minh', -60, -61, 'Hoàn thành'], ['bs.minh', -35, -36, 'Hoàn thành'], ['bs.minh', -20, -22, 'Hoàn thành'],
        ['bs.hoa', -75, -70, 'Hoàn thành'], ['bs.hoa', -50, -50, 'Hoàn thành'], ['bs.hoa', -25, null, 'Đang làm'],
        ['bs.bao', -70, -71, 'Hoàn thành'], ['bs.bao', -45, -40, 'Hoàn thành'], ['bs.bao', -30, -31, 'Hoàn thành'],
        ['bs.long', -65, null, 'Đang làm'], ['bs.long', -40, -33, 'Hoàn thành'], ['bs.long', -15, null, 'Chưa làm'],
        ['dd.lan', -72, -73, 'Hoàn thành'], ['dd.lan', -44, -44, 'Hoàn thành'], ['dd.lan', -28, -30, 'Hoàn thành'],
        ['dd.ha', -68, -69, 'Hoàn thành'], ['dd.ha', -52, -53, 'Hoàn thành'], ['dd.ha', -33, -34, 'Hoàn thành'], ['dd.ha', -18, -19, 'Hoàn thành'],
        ['dd.nam', -62, -55, 'Hoàn thành'], ['dd.nam', -38, null, 'Đang làm'],
        ['dd.mai', -58, -59, 'Hoàn thành'], ['dd.mai', -26, -20, 'Hoàn thành'],
      ] as Array<[string, number, number | null, string]>
    ).map(([userId, due, doneAt, trangThai], index) => ({
      id: uid('W'),
      userId,
      tieuDe: ['Rà soát hồ sơ bệnh án', 'Báo cáo chỉ số chất lượng', 'Tập huấn quy trình mới', 'Kiểm tra cơ số thuốc trực', 'Cập nhật phác đồ'][index % 5],
      noiDung: '',
      nguoiGiao: 'BS. Nguyễn Xuân Hùng',
      ngayGiao: day(due - 10),
      hanHoanThanh: day(due),
      mucDoUuTien: 'Trung bình',
      trangThai,
      tienDo: trangThai === 'Hoàn thành' ? 100 : trangThai === 'Đang làm' ? 50 : 0,
      ngayHoanThanh: doneAt === null ? '' : day(doneAt),
    })),
  ],
  DanhGia_NhanVien: [
    { id: uid('D'), userId: 'bs.minh', loaiDanhGia: 'Quý', quy: 'Q3', nam: today.getFullYear(), diemHoanThanhCongViec: 90, diemThaiDo: 85, diemKyLuat: 95, diemPhoiHop: 88, diemSangKien: 70, diemTong: 86, xepLoai: 'Tốt', nhanXet: 'Chủ động, nhiệt tình', nguoiDanhGia: 'BS. Nguyễn Xuân Hùng', ngayDanhGia: day(-15) },
    { id: uid('D'), userId: 'bs.bao', loaiDanhGia: 'Quý', quy: 'Q3', nam: today.getFullYear(), nhomDanhGia: 'BS', diemHoanThanhCongViec: 90, diemChuyenMon: 85, diemThaiDo: 85, diemKyLuat: 90, diemPhoiHop: 80, diemSangKien: 90, diemTieuChi: 87, diemThuongPhat: 2, diemTong: 89, xepLoai: 'Hoàn thành tốt', nhanXet: 'Có sáng kiến được áp dụng', nguoiDanhGia: 'BS. Nguyễn Xuân Hùng', ngayDanhGia: day(-10), trangThai: 'Đã xác nhận' },
    { id: uid('D'), userId: 'bs.long', loaiDanhGia: 'Quý', quy: 'Q3', nam: today.getFullYear(), nhomDanhGia: 'BS', diemHoanThanhCongViec: 60, diemChuyenMon: 75, diemThaiDo: 70, diemKyLuat: 60, diemPhoiHop: 70, diemSangKien: 60, diemTieuChi: 66, diemThuongPhat: -2, diemTong: 64, xepLoai: 'Hoàn thành', nhanXet: 'Cần cải thiện tiến độ và giờ giấc', nguoiDanhGia: 'BS. Nguyễn Xuân Hùng', ngayDanhGia: day(-10), trangThai: 'Đã đánh giá' },
  ],
  ThuongPhat_NhanVien: [
    { id: uid('TP'), userId: 'bs.minh', ngay: day(-3), loai: 'Thưởng', diem: 5, lyDo: 'Có sáng kiến cải tiến quy trình bàn giao', nguoiGhi: 'BS. Nguyễn Xuân Hùng', ngayGhi: day(-3) },
    { id: uid('TP'), userId: 'dd.lan', ngay: day(-2), loai: 'Phạt', diem: 2, lyDo: 'Đi trễ giao ban', nguoiGhi: 'BS. Nguyễn Xuân Hùng', ngayGhi: day(-2) },
    { id: uid('TP'), userId: 'dd.ha', ngay: day(-40), loai: 'Thưởng', diem: 3, lyDo: 'Được người bệnh khen', nguoiGhi: 'ĐD. Nguyễn Thị Lan', ngayGhi: day(-40) },
    { id: uid('TP'), userId: 'dd.ha', ngay: day(-70), loai: 'Thưởng', diem: 2, lyDo: 'Hỗ trợ ca trực đột xuất', nguoiGhi: 'ĐD. Nguyễn Thị Lan', ngayGhi: day(-70) },
    { id: uid('TP'), userId: 'bs.long', ngay: day(-50), loai: 'Phạt', diem: 3, lyDo: 'Chậm hoàn thiện hồ sơ bệnh án', nguoiGhi: 'BS. Nguyễn Xuân Hùng', ngayGhi: day(-50) },
    { id: uid('TP'), userId: 'bs.long', ngay: day(-30), loai: 'Phạt', diem: 2, lyDo: 'Đi trễ giao ban', nguoiGhi: 'BS. Nguyễn Xuân Hùng', ngayGhi: day(-30) },
    { id: uid('TP'), userId: 'bs.bao', ngay: day(-45), loai: 'Thưởng', diem: 5, lyDo: 'Sáng kiến cải tiến quy trình duyệt mổ', nguoiGhi: 'BS. Nguyễn Xuân Hùng', ngayGhi: day(-45) },
    { id: uid('TP'), userId: 'dd.nam', ngay: day(-55), loai: 'Phạt', diem: 2, lyDo: 'Đi trễ', nguoiGhi: 'ĐD. Nguyễn Thị Lan', ngayGhi: day(-55) },
    { id: uid('TP'), userId: 'dd.nam', ngay: day(-35), loai: 'Thưởng', diem: 2, lyDo: 'Hỗ trợ ca trực', nguoiGhi: 'ĐD. Nguyễn Thị Lan', ngayGhi: day(-35) },
  ],
  CongTac_DieuDuong: [
    { id: uid('N'), date: day(0), ngayGiao: day(0), hanThucHien: day(0), gioHen: '08:00', task: 'Bàn giao ca trực & giao ban điều dưỡng sáng', status: 'Hoàn thành', assignee: 'ĐD. Nguyễn Thị Lan', group: 'Nhóm Hành chính & Bệnh án', priority: 'Thường', category: 'Hành chính & Hồ sơ' },
    { id: uid('N'), date: day(0), ngayGiao: day(0), hanThucHien: day(0), gioHen: '09:00', task: 'Chuẩn bị BN mổ phiên (nhịn ăn, hồ sơ, vệ sinh vùng mổ)', status: 'Đang làm', assignee: 'ĐD. Trần Thu Hà', group: 'Nhóm Chuẩn bị & Phòng mổ', priority: 'Ưu tiên', room: '201', category: 'Chuẩn bị bệnh nhân mổ' },
    { id: uid('N'), date: day(0), ngayGiao: day(0), hanThucHien: day(0), gioHen: '11:30', task: 'Theo dõi calci & tê bì chân tay BN hậu phẫu buồng 202', status: 'Chưa làm', assignee: 'ĐD. Lê Văn Nam', group: 'Nhóm Chăm sóc Buồng bệnh', priority: 'Khẩn', room: '202', category: 'Theo dõi sinh hiệu & Hậu phẫu' },
    { id: uid('N'), date: day(0), ngayGiao: day(0), hanThucHien: day(0), gioHen: '09:30', task: 'Thực hiện y lệnh thuốc tiêm & truyền dịch toàn khoa', status: 'Đang làm', assignee: 'ĐD. Lê Văn Nam', group: 'Nhóm Y lệnh thuốc & Dịch truyền', priority: 'Ưu tiên', category: 'Y lệnh thuốc & Tiêm truyền' },
    { id: uid('N'), date: day(0), ngayGiao: day(0), hanThucHien: day(0), gioHen: '15:30', task: 'Thay băng vết mổ & chăm sóc dẫn lưu buồng 203 - 206', status: 'Chưa làm', assignee: 'Nhóm Chăm sóc Buồng bệnh', group: 'Nhóm Chăm sóc Buồng bệnh', priority: 'Thường', room: '203-206', category: 'Chăm sóc buồng bệnh & Thay băng' },
    { id: uid('N'), date: day(0), ngayGiao: day(0), hanThucHien: day(0), gioHen: '16:30', task: 'Kiểm kê cơ số thuốc tủ trực & hạn dùng hộp chống sốc', status: 'Chưa làm', assignee: 'Kíp trực hôm nay', group: 'Nhóm Kíp trực hôm nay', priority: 'Ưu tiên', category: 'Tủ thuốc & Trang thiết bị' },
    { id: uid('N'), date: day(0), ngayGiao: day(0), hanThucHien: day(0), gioHen: '', task: 'Tư vấn, giáo dục sức khoẻ trước khi ra viện', status: 'Chưa làm', assignee: '', group: '', priority: 'Thường', category: 'Hành chính & Hồ sơ' },
    { id: uid('N'), date: day(-1), ngayGiao: day(-1), hanThucHien: day(-1), gioHen: '16:00', task: 'Rà soát hồ sơ BHYT bệnh nhân chuyển viện', status: 'Chưa làm', assignee: 'ĐD. Phan Thị Mai', group: 'Nhóm Hành chính & Bệnh án', priority: 'Thường', category: 'Hành chính & Hồ sơ', note: 'Chờ kết quả xét nghiệm bổ sung' },
    { id: uid('N'), date: day(-1), ngayGiao: day(-1), hanThucHien: day(-1), gioHen: '17:00', task: 'Kiểm tra máy hút dịch & hệ thống oxy tường', status: 'Hoàn thành', assignee: 'ĐD. Phan Thị Mai', group: 'Nhóm Kíp trực hôm nay', priority: 'Thường', category: 'Tủ thuốc & Trang thiết bị' },
  ],
  Config: [
    { key: 'TEN_KHOA', value: 'Khoa Ngoại Tổng Hợp', description: 'Tên hiển thị trên biểu mẫu' },
    { key: 'SO_GIUONG', value: '27', description: 'Tổng số giường kế hoạch' },
  ],
  Roles_Permission: [{ id: 'P1', role: 'NHAN_VIEN', module: 'inventory', canView: true, canAdd: false, canEdit: false, canDelete: false }],
  AuditLogs: [],
};

let patients = buildPatients();
let vips: Row[] = [
  { id: 'VIP_1', patientId: patients[1].id, priority: 'Cao', reason: 'Người nhà cán bộ, dị ứng kháng sinh nhóm beta-lactam', createdAt: day(-2) },
  { id: 'VIP_2', patientId: patients[8].id, priority: 'Trung bình', reason: 'Bệnh nền tăng huyết áp, đái tháo đường', createdAt: day(-1) },
  { id: 'VIP_3', patientId: patients[patients.length - 1].id, priority: 'Thấp', reason: 'Cần hỗ trợ thủ tục BHYT', createdAt: day(-30) },
];

const audit = (action: string, module: string, label: string, changes: Row = {}) => {
  sheets.AuditLogs.unshift({
    id: uid('A'),
    timestamp: new Date().toISOString(),
    actorUsername: 'admin',
    actorName: 'BS. Nguyễn Xuân Hùng (demo)',
    actorRole: 'TRUONG_KHOA',
    module,
    action,
    entityType: module,
    entityLabel: label,
    changesJson: JSON.stringify(changes),
    status: 'success',
  });
};

const delay = <T,>(value: T, ms = 220): Promise<T> => new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(value))), ms));
const sheet = (name: string) => (sheets[name] ||= []);
const keyField = (name: string) => (name === 'Users' ? 'username' : name === 'Config' ? 'key' : 'id');

export async function mockRpc(funcName: string, args: any[]): Promise<any> {
  switch (funcName) {
    case 'loginUser': {
      const user = users.find(item => item.username === String(args[0] || '').toLowerCase()) || users[0];
      return delay({ user, sessionToken: `mock_${Date.now()}`, expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString() });
    }
    case 'logoutUser':
    case 'changeMyPassword':
      return delay({ success: true });
    case 'apiGet':
      return delay(sheet(args[0]));
    case 'apiAdd': {
      const [name, data] = args;
      if (name === 'DS_BenhNhan') return delay({ success: true, id: data?.id });
      const row = { ...data };
      if (name !== 'Config') row.id = row.id || uid(name);
      if (name === 'Config' && sheet(name).some(item => item.key === row.key)) throw new Error(`Mã cấu hình '${row.key}' đã tồn tại!`);
      sheet(name).push(row);
      audit('create', name, row.name || row.title || row.tieuDe || row.task || row.topic || row.key || row.id);
      return delay({ success: true, id: row.id || row.key });
    }
    case 'apiUpdate': {
      const [name, id, data] = args;
      // Bản sao bệnh nhân trên Sheets (dual-write) không cần mô phỏng ở chế độ demo.
      if (name === 'DS_BenhNhan' || name === 'BN_LuuY') return delay({ success: true });
      const field = keyField(name);
      const row = sheet(name).find(item => String(item[field]) === String(id));
      if (!row) throw new Error(`Record ID "${id}" not found in ${name}`);
      const changes: Row = {};
      Object.keys(data).forEach(key => {
        if (key !== 'password' && String(row[key] ?? '') !== String(data[key] ?? '')) changes[key] = { before: row[key] ?? '', after: data[key] };
      });
      Object.assign(row, data, data.password ? { mustChangePassword: true } : {});
      delete row.password;
      audit(data.password ? 'reset_password' : 'update', name, row.name || row.title || row.tieuDe || row.task || row.fullName || id, changes);
      return delay({ success: true });
    }
    case 'apiDelete': {
      const [name, id] = args;
      if (name === 'DS_BenhNhan' || name === 'BN_LuuY') return delay({ success: true });
      const field = keyField(name);
      sheets[name] = sheet(name).filter(item => String(item[field]) !== String(id));
      audit('delete', name, String(id));
      return delay({ success: true });
    }
    case 'getDoctors':
      return delay(users.filter(user => user.nhomChuyenMon === 'BS' && user.active).map(user => ({ id: user.id, fullName: user.fullName })));
    case 'getPersonnelLists':
      return delay({
        doctors: users.filter(user => user.nhomChuyenMon === 'BS' && user.active).map(user => user.fullName),
        nurses: users.filter(user => user.nhomChuyenMon === 'DD' && user.active).map(user => user.fullName),
      });
    case 'getBriefingBundle':
      return delay({ briefings: sheet('GiaoBan_Log'), users: users.filter(user => user.active).map(user => ({ username: user.username, fullName: user.fullName })) });
    case 'getDashboardOperationsData':
      return delay({
        staffTasks: sheet('CongViec_NhanVien'),
        medicines: sheet('Thuoc_Kho'),
        equipment: sheet('May_Moc'),
        improvements: sheet('CaiTien_5S'),
        evaluations5S: sheet('DanhGia_5S'),
        shifts: sheet('Phan_Truc_Ngay'),
        meetings: sheet('SinhHoat_KH'),
        research: sheet('DeTai_CoSo'),
        nursingTasks: sheet('CongTac_DieuDuong').filter(task => task.date === day(0)),
      });
    case 'getNursingTasks':
      return delay(sheet('CongTac_DieuDuong').filter(task => task.date >= args[0] && task.date <= (args[1] || args[0])));
    case 'batchAddNursingTasks':
      (args[0] || []).forEach((task: Row) => sheet('CongTac_DieuDuong').push({ ...task, id: uid('N') }));
      audit('batch_create', 'CongTac_DieuDuong', `${(args[0] || []).length} việc điều dưỡng`);
      return delay({ success: true });
    case 'batchSaveDailyOnCall':
      (args[0] || []).forEach((shift: Row) => {
        const existing = sheet('Phan_Truc_Ngay').find(item => item.date === shift.date);
        if (existing) Object.assign(existing, shift);
        else sheet('Phan_Truc_Ngay').push({ ...shift, id: uid('S') });
      });
      return delay({ success: true });
    case 'saveRolePermissions':
      (args[0] || []).forEach((perm: Row) => {
        const existing = sheet('Roles_Permission').find(item => item.role === perm.role && item.module === perm.module);
        if (existing) Object.assign(existing, perm);
        else sheet('Roles_Permission').push({ ...perm, id: `${perm.role}_${perm.module}` });
      });
      return delay({ success: true });
    case 'getRecentAuditLogs':
      return delay(sheet('AuditLogs').slice(0, args[0]?.limit || 300));
    case 'addVipPatientSafe':
      return delay({ success: true });
    default:
      return delay({ success: true });
  }
}

export async function mockClinical(action: string, args: any[]): Promise<any> {
  switch (action) {
    case 'patients.list':
      return delay(patients, 350);
    case 'patients.surgeryApprovalList':
      return delay(patients.filter(patient => patient.status === 'ChoMo' || patient.status === 'DaDuyet'));
    case 'patients.add': {
      const patient = args[0] as Patient;
      if (patients.some(item => item.id === patient.id)) throw Object.assign(new Error(`Mã bệnh nhân '${patient.id}' đã tồn tại!`), { code: 'DUPLICATE' });
      patients = [patient, ...patients];
      audit('create', 'patients', patient.name);
      return delay(patient);
    }
    case 'patients.update': {
      const [id, data] = args;
      patients = patients.map(patient => (patient.id === id ? { ...patient, ...data } : patient));
      audit(data.status === 'DaDuyet' ? 'approve' : 'update', 'patients', patients.find(patient => patient.id === id)?.name || id);
      return delay(patients.find(patient => patient.id === id));
    }
    case 'patients.delete':
      patients = patients.filter(patient => patient.id !== args[0]);
      vips = vips.filter(vip => vip.patientId !== args[0]);
      audit('delete', 'patients', args[0]);
      return delay({ success: true });
    case 'vip.list':
      return delay(
        vips.map(vip => {
          const patient = patients.find(item => item.id === vip.patientId);
          return { ...vip, name: patient?.name || '', room: patient?.room || '', bed: patient?.bed || '', diagnosis: patient?.diagnosis || '' };
        }),
      );
    case 'vip.add': {
      const [patientId, priority, reason] = args;
      const row = { id: uid('VIP'), patientId, priority: priority || 'Cao', reason, createdAt: day(0) };
      vips = [row, ...vips];
      return delay(row);
    }
    case 'vip.delete':
      vips = vips.filter(vip => vip.id !== args[0]);
      return delay({ success: true });
    default:
      return delay({});
  }
}
