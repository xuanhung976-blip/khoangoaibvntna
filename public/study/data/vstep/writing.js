export const VSTEP_WRITING = [
  // ==========================================
  // TASK 1: EMAIL & LETTERS (>= 120 words)
  // ==========================================
  {
    id: 'vw_task1_01',
    level: 'B2',
    taskType: 'task1',
    type: 'Formal Letter of Complaint & Request',
    typeVi: 'Thư phàn nàn & Yêu cầu giải quyết (Trang trọng)',
    timeMinutes: 20,
    minWords: 120,
    task: `You recently attended a 3-day professional conference organized by an international medical training institute. However, the event suffered from several significant problems (e.g. last-minute schedule changes, poor audiovisual equipment, and delayed certification).

Write a formal letter to the conference director. In your letter:
- State the purpose of your letter and details of the conference you attended.
- Explain the specific problems you and other attendees experienced.
- State clearly what remedial actions or compensation you expect from the organizers.`,
    tips: [
      'Bắt đầu bằng lời chào trang trọng: "Dear Sir or Madam," hoặc "Dear Mr./Ms. [Tên]"',
      'Đoạn 1 nêu lý do viết thư dứt khoát: "I am writing this letter to express my deep dissatisfaction regarding..."',
      'Đoạn 2 & 3 đi sâu vào 2-3 vấn đề cụ thể, sử dụng từ nối: "First and foremost", "Furthermore", "To make matters worse"',
      'Đoạn kết đưa ra yêu cầu cụ thể (hoàn tiền một phần hoặc gửi chứng chỉ đính chính) và lời kết: "Yours faithfully," hoặc "Yours sincerely,"'
    ],
    template: `Dear Sir or Madam,

I am writing this letter to express my strong dissatisfaction regarding the recent International Healthcare Symposium held at your center from October 15th to 17th.

First and foremost, despite the substantial registration fee, the organizational quality failed to meet professional standards. The presentation schedules were altered repeatedly at the eleventh hour without prior notice, causing considerable inconvenience for attendees who had planned their clinical rounds accordingly.

Furthermore, the audiovisual equipment in the main auditorium malfunctioned persistently during the keynote lectures, making it virtually impossible for participants seated in the rear rows to follow the scientific slides. To make matters worse, certificates of attendance have not yet been distributed, directly impacting our continuing medical education accreditation.

In light of these shortcomings, I would appreciate it if you could expedite the issuance of our verified certificates via email. Additionally, I request a partial refund of the registration fee as appropriate compensation.

Thank you for your prompt attention to this urgent matter. I look forward to your constructive response.

Yours faithfully,
Dr. Nguyen Van Anh`,
    sampleAnswer: `Dear Sir or Madam,

I am writing this letter to express my strong dissatisfaction regarding the recent International Healthcare Symposium held at your center from October 15th to 17th.

First and foremost, despite the substantial registration fee, the organizational quality failed to meet professional standards. The presentation schedules were altered repeatedly at the eleventh hour without prior notice, causing considerable inconvenience for attendees who had planned their clinical rounds accordingly.

Furthermore, the audiovisual equipment in the main auditorium malfunctioned persistently during the keynote lectures, making it virtually impossible for participants seated in the rear rows to follow the scientific slides. To make matters worse, certificates of attendance have not yet been distributed, directly impacting our continuing medical education accreditation.

In light of these shortcomings, I would appreciate it if you could expedite the issuance of our verified certificates via email. Additionally, I request a partial refund of the registration fee as appropriate compensation.

Thank you for your prompt attention to this urgent matter. I look forward to your constructive response.

Yours faithfully,
Dr. Nguyen Van Anh`
  },
  {
    id: 'vw_task1_02',
    level: 'B2',
    taskType: 'task1',
    type: 'Semi-formal Letter of Inquiry & Recommendation',
    typeVi: 'Thư hỏi thông tin & Đề xuất hợp tác',
    timeMinutes: 20,
    minWords: 120,
    task: `You are the coordinator of a university English club. You want to invite a foreign guest lecturer to deliver an online workshop about effective presentation skills for undergraduate students.

Write an email to the lecturer. In your email:
- Introduce yourself and your English club.
- Explain why your members would benefit from the workshop.
- Inquire about their availability and technical requirements for the virtual session.`,
    tips: [
      'Giọng văn lịch sự, tôn trọng nhưng thân thiện (Semi-formal).',
      'Đưa ra các câu hỏi mở về thời gian, nền tảng Zoom/Teams và tài liệu trước buổi học.',
      'Dùng cấu trúc: "We would be honored if you could...", "Could you please inform us whether..."'
    ],
    template: `Dear Dr. Harrison,

I hope this email finds you in good health and high spirits. My name is Tran Minh, and I am the president of the Medical English Club at Hanoi Medical University.

I am writing to respectfully invite you to deliver a virtual guest lecture on "Mastering Scientific Presentations in English" for our undergraduate students next month. As our members are actively preparing for international academic conferences, your extensive expertise in clinical communication would provide invaluable guidance.

Specifically, our students would greatly benefit from learning how to structure scientific abstracts, design compelling slides, and confidently answer questions from peer review panels.

Could you please let us know if you would be available for a 90-minute online session on any Saturday morning in late November? Additionally, please inform us of any technical software or preparation materials you might require so that we can make the necessary arrangements.

We would be truly honored by your participation. Thank you very much for considering our invitation, and I eagerly await your reply.

Warm regards,
Tran Minh
President, HMU Medical English Club`,
    sampleAnswer: `Dear Dr. Harrison,

I hope this email finds you in good health and high spirits. My name is Tran Minh, and I am the president of the Medical English Club at Hanoi Medical University.

I am writing to respectfully invite you to deliver a virtual guest lecture on "Mastering Scientific Presentations in English" for our undergraduate students next month. As our members are actively preparing for international academic conferences, your extensive expertise in clinical communication would provide invaluable guidance.

Specifically, our students would greatly benefit from learning how to structure scientific abstracts, design compelling slides, and confidently answer questions from peer review panels.

Could you please let us know if you would be available for a 90-minute online session on any Saturday morning in late November? Additionally, please inform us of any technical software or preparation materials you might require so that we can make the necessary arrangements.

We would be truly honored by your participation. Thank you very much for considering our invitation, and I eagerly await your reply.

Warm regards,
Tran Minh
President, HMU Medical English Club`
  },

  // ==========================================
  // TASK 2: ESSAYS (>= 250 words)
  // ==========================================
  {
    id: 'vw_task2_01',
    level: 'B2',
    taskType: 'task2',
    type: 'Opinion Essay (Agree or Disagree)',
    typeVi: 'Bài luận đồng ý / Không đồng ý (Chủ đề Y tế & Lối sống)',
    timeMinutes: 40,
    minWords: 250,
    task: `Some people believe that regular health check-ups and screening tests are unnecessary for individuals who feel completely healthy and show no symptoms of disease. To what extent do you agree or disagree with this statement? Give reasons and relevant examples from your knowledge or experience.`,
    tips: [
      'Khẳng định lập trường rõ ràng ngay ở phần Introduction (hoàn toàn phản đối quan điểm trên).',
      'Thân bài 1: Nêu tính chất phát triển âm thầm của các bệnh mạn tính (tăng huyết áp, đái tháo đường, ung thư giai đoạn sớm).',
      'Thân bài 2: Lợi ích kinh tế và y tế dự phòng (chi phí tầm soát rẻ hơn nhiều so với điều trị biến chứng nặng).',
      'Dùng các cụm B2: "asymptomatic nature", "preventive screening", "mitigate healthcare expenditure", "early therapeutic intervention".'
    ],
    template: `In contemporary society, an increasing number of individuals question the necessity of routine medical examinations, arguing that asymptomatic people need not undergo periodic health screenings. From my perspective, I firmly disagree with this viewpoint because preventive health check-ups play a pivotal role in early disease detection and long-term public well-being.

First and foremost, it is indisputable that numerous life-threatening ailments develop silently without overt clinical symptoms during their early stages. Chronic conditions such as hypertension, type 2 diabetes, and early-stage malignancies often remain asymptomatic until substantial physiological damage has already occurred. For example, a routine biochemical blood panel can detect elevated fasting glucose or abnormal lipid profiles years before an individual experiences cardiovascular complications. Regular screening empowers physicians to implement lifestyle modifications and early therapeutic interventions, which dramatically enhances survival rates.

Furthermore, periodic health assessments prove far more cost-effective than emergency interventions. Treating advanced degenerative illnesses, such as chronic kidney disease requiring dialysis or acute myocardial infarction, imposes tremendous financial burdens on both personal savings and national healthcare systems. Conversely, periodic check-ups require modest financial investment while averting debilitating long-term consequences. As the age-old medical adage asserts, prevention is invariably superior to cure.

Admittedly, opponents may argue that routine screenings can occasionally trigger health anxiety and incur minor procedural expenses. However, this concern is vastly outweighed by the peace of mind and physical protection that accurate diagnostic baseline data affords.

In conclusion, for the reasons outlined above, I strongly maintain that periodic medical examinations are indispensable for every adult, regardless of how healthy they feel. Governments and public health authorities should actively incentivize preventive screening programs to foster a healthier society.`,
    sampleAnswer: `In contemporary society, an increasing number of individuals question the necessity of routine medical examinations, arguing that asymptomatic people need not undergo periodic health screenings. From my perspective, I firmly disagree with this viewpoint because preventive health check-ups play a pivotal role in early disease detection and long-term public well-being.

First and foremost, it is indisputable that numerous life-threatening ailments develop silently without overt clinical symptoms during their early stages. Chronic conditions such as hypertension, type 2 diabetes, and early-stage malignancies often remain asymptomatic until substantial physiological damage has already occurred. For example, a routine biochemical blood panel can detect elevated fasting glucose or abnormal lipid profiles years before an individual experiences cardiovascular complications. Regular screening empowers physicians to implement lifestyle modifications and early therapeutic interventions, which dramatically enhances survival rates.

Furthermore, periodic health assessments prove far more cost-effective than emergency interventions. Treating advanced degenerative illnesses, such as chronic kidney disease requiring dialysis or acute myocardial infarction, imposes tremendous financial burdens on both personal savings and national healthcare systems. Conversely, periodic check-ups require modest financial investment while averting debilitating long-term consequences. As the age-old medical adage asserts, prevention is invariably superior to cure.

Admittedly, opponents may argue that routine screenings can occasionally trigger health anxiety and incur minor procedural expenses. However, this concern is vastly outweighed by the peace of mind and physical protection that accurate diagnostic baseline data affords.

In conclusion, for the reasons outlined above, I strongly maintain that periodic medical examinations are indispensable for every adult, regardless of how healthy they feel. Governments and public health authorities should actively incentivize preventive screening programs to foster a healthier society.`
  },
  {
    id: 'vw_task2_02',
    level: 'B2',
    taskType: 'task2',
    type: 'Problem & Solution Essay',
    typeVi: 'Bài luận Nguyên nhân & Giải pháp (Lối sống & Sức khỏe)',
    timeMinutes: 40,
    minWords: 250,
    task: `In many nations today, a growing percentage of young people and working adults lead a sedentary lifestyle, spending long hours sitting in front of computer screens. What are the primary causes of this issue, and what viable solutions can be implemented to address it?`,
    tips: [
      'Bố cục 4 đoạn chuẩn: Mở bài - Đoạn nguyên nhân (Causes) - Đoạn giải pháp (Solutions) - Kết bài.',
      'Nguyên nhân: Sự bùng nổ của công việc văn phòng/số hóa + nghiện giải trí kỹ thuật số (mạng xã hội, game).',
      'Giải pháp: Doanh nghiệp thiết kế nơi làm việc vận động (bàn đứng, giờ giải lao thể dục) + Giáo dục nâng cao nhận thức cộng đồng.',
      'Dùng liên từ: "A primary catalyst for this dilemma is...", "To counteract this detrimental habit, concerted actions must be taken."'
    ],
    template: `In recent decades, sedentary living has emerged as one of the most pressing public health dilemmas worldwide. A considerable proportion of modern adults and youths spend the vast majority of their waking hours seated before electronic screens. This essay will examine the principal catalysts behind this phenomenon and delineate pragmatic measures to mitigate its consequences.

A primary cause of this widespread physical inactivity is the radical transformation of contemporary employment and leisure habits. The advent of the digital economy has transformed traditional manual occupations into sedentary desk jobs, compelling office personnel to sit motionless for eight to ten hours daily. Furthermore, digital entertainment platforms, including video streaming and algorithmic social media, are engineered to captivate users' attention, displacing traditional outdoor recreations and physical sports during their leisure hours.

To counteract this detrimental lifestyle, concerted actions must be undertaken by both employers and public health institutions. First and foremost, corporate organizations should foster dynamic workplace environments by introducing ergonomic standing desks, organizing mandatory hourly stretching breaks, and subsidizing fitness memberships for their workforce. Encouraging active commuting, such as walking or cycling to work, can also effortlessly incorporate physical exertion into daily routines.

In addition, governments and municipal planners must invest heavily in accessible public sports infrastructure. Expanding well-maintained park networks, outdoor gym stations, and dedicated bicycle lanes in urban centers provides citizens with convenient and free venues to exercise. Concurrently, public health campaigns should educate communities about the insidious hazards of prolonged sitting, equating its physical toll to that of smoking.

In conclusion, while technological modernization and desk-bound employment have inadvertently fostered a sedentary culture, this crisis can be successfully overcome through workplace ergonomic reforms and robust public investment in community recreation spaces.`,
    sampleAnswer: `In recent decades, sedentary living has emerged as one of the most pressing public health dilemmas worldwide. A considerable proportion of modern adults and youths spend the vast majority of their waking hours seated before electronic screens. This essay will examine the principal catalysts behind this phenomenon and delineate pragmatic measures to mitigate its consequences.

A primary cause of this widespread physical inactivity is the radical transformation of contemporary employment and leisure habits. The advent of the digital economy has transformed traditional manual occupations into sedentary desk jobs, compelling office personnel to sit motionless for eight to ten hours daily. Furthermore, digital entertainment platforms, including video streaming and algorithmic social media, are engineered to captivate users' attention, displacing traditional outdoor recreations and physical sports during their leisure hours.

To counteract this detrimental lifestyle, concerted actions must be undertaken by both employers and public health institutions. First and foremost, corporate organizations should foster dynamic workplace environments by introducing ergonomic standing desks, organizing mandatory hourly stretching breaks, and subsidizing fitness memberships for their workforce. Encouraging active commuting, such as walking or cycling to work, can also effortlessly incorporate physical exertion into daily routines.

In addition, governments and municipal planners must invest heavily in accessible public sports infrastructure. Expanding well-maintained park networks, outdoor gym stations, and dedicated bicycle lanes in urban centers provides citizens with convenient and free venues to exercise. Concurrently, public health campaigns should educate communities about the insidious hazards of prolonged sitting, equating its physical toll to that of smoking.

In conclusion, while technological modernization and desk-bound employment have inadvertently fostered a sedentary culture, this crisis can be successfully overcome through workplace ergonomic reforms and robust public investment in community recreation spaces.`
  }
];

export default VSTEP_WRITING;
