// Medical Module Registry — add new modules here ONLY
// Do NOT modify core engines to add a new module

export const MEDICAL_REGISTRY = [
  {
    id: 'thyroid',
    name: 'Thyroid',
    vietnameseName: 'Tuyến giáp',
    icon: '🫀',
    description: 'Học tiếng Anh về tuyến giáp, bao gồm giải phẫu, sinh lý, bệnh lý, chẩn đoán và điều trị.',
    color: 'purple',
    gradient: 'linear-gradient(135deg, #6c63ff, #a855f7)',
    termCount: '300+ terms',
    enabled: true,
    dataPath: './data/medical/thyroid/'
  },
  {
    id: 'diabetes',
    name: 'Diabetes',
    vietnameseName: 'Đái tháo đường',
    icon: '🩸',
    description: 'Học tiếng Anh về đái tháo đường, bao gồm phân loại, triệu chứng, biến chứng và điều trị.',
    color: 'teal',
    gradient: 'linear-gradient(135deg, #00d4d4, #06b6d4)',
    termCount: '300+ terms',
    enabled: true,
    dataPath: './data/medical/diabetes/'
  },
  {
    id: 'endocrinology',
    name: 'Endocrinology',
    vietnameseName: 'Nội tiết học',
    icon: '🧬',
    description: 'Tiếng Anh nội tiết học tổng quát.',
    color: 'blue',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    termCount: 'Coming soon',
    enabled: false,
    dataPath: null
  },
  {
    id: 'pituitary',
    name: 'Pituitary',
    vietnameseName: 'Tuyến yên',
    icon: '🧠',
    description: 'Tiếng Anh về tuyến yên và các rối loạn liên quan.',
    color: 'indigo',
    gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    termCount: 'Coming soon',
    enabled: false,
    dataPath: null
  },
  {
    id: 'adrenal',
    name: 'Adrenal',
    vietnameseName: 'Tuyến thượng thận',
    icon: '⚡',
    description: 'Tiếng Anh về tuyến thượng thận: Cushing, Addison, pheochromocytoma...',
    color: 'orange',
    gradient: 'linear-gradient(135deg, #f97316, #dc2626)',
    termCount: 'Coming soon',
    enabled: false,
    dataPath: null
  },
  {
    id: 'obesity',
    name: 'Obesity',
    vietnameseName: 'Béo phì',
    icon: '⚖️',
    description: 'Tiếng Anh về béo phì và hội chứng chuyển hóa.',
    color: 'amber',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    termCount: 'Coming soon',
    enabled: false,
    dataPath: null
  },
  {
    id: 'dyslipidemia',
    name: 'Dyslipidemia',
    vietnameseName: 'Rối loạn lipid máu',
    icon: '💊',
    description: 'Tiếng Anh về rối loạn lipid máu và xơ vữa động mạch.',
    color: 'red',
    gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    termCount: 'Coming soon',
    enabled: false,
    dataPath: null
  },
  {
    id: 'bone',
    name: 'Calcium & Bone',
    vietnameseName: 'Calci & Xương',
    icon: '🦴',
    description: 'Tiếng Anh về chuyển hóa calci, loãng xương và các bệnh xương.',
    color: 'stone',
    gradient: 'linear-gradient(135deg, #78716c, #57534e)',
    termCount: 'Coming soon',
    enabled: false,
    dataPath: null
  }
];

export function getEnabledModules() {
  return MEDICAL_REGISTRY.filter(m => m.enabled);
}

export function getModuleById(id) {
  return MEDICAL_REGISTRY.find(m => m.id === id);
}

export default MEDICAL_REGISTRY;
