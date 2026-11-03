// VSTEP Speaking Master Dataset (B1 - B2 - C1)
// Architecture inspired by duonghh/VSTEP-Level4-B2 & authentic VSTEP exam format

export const VSTEP_SPEAKING = {
  part1: [
    {
      id: 'sp1_health',
      topic: 'Health and Physical Fitness',
      topicVi: 'Sức khỏe & Luyện tập thể chất',
      level: 'B2',
      questions: [
        {
          q: 'What do you do to stay healthy?',
          tip: 'Dùng công thức A-R-E (Answer - Reason - Example). Nêu thói quen tập luyện và ăn uống.',
          sample: 'To stay in good shape, I make it a priority to maintain a balanced diet and engage in moderate physical exercise. For example, I usually go jogging for 30 minutes every morning and avoid consuming sugary beverages and fast food.',
          keywords: ['balanced diet', 'physical exercise', 'moderate', 'nutritious meals']
        },
        {
          q: 'How much sleep do you usually get every night?',
          tip: 'Nêu số giờ thực tế, cảm giác khi ngủ đủ vs thiếu ngủ, liên hệ lối sống.',
          sample: 'On average, I get around six to seven hours of sleep each night. Although I occasionally have to burn the midnight oil due to heavy workloads, I always try to catch up on sleep during the weekend to restore my cognitive energy.',
          keywords: ['burn the midnight oil', 'cognitive energy', 'adequate rest', 'recharge']
        },
        {
          q: 'Do you prefer exercising outdoors or going to a fitness center?',
          tip: 'Đưa ra lựa chọn dứt khoát và so sánh 2 phương án (không khí trong lành vs trang thiết bị hiện đại).',
          sample: 'Personally, I have a strong preference for exercising outdoors. Working out in open green spaces like public parks not only gives me access to fresh air but also significantly reduces my daily stress levels compared to staying in an enclosed gym.',
          keywords: ['strong preference', 'open green spaces', 'alleviate stress', 'enclosed gym']
        }
      ]
    },
    {
      id: 'sp1_tech',
      topic: 'Technology and Digital Devices',
      topicVi: 'Công nghệ & Thiết bị kỹ thuật số',
      level: 'B2',
      questions: [
        {
          q: 'What electronic device do you use most frequently?',
          tip: 'Chọn điện thoại/laptop, nêu mục đích công việc và học tập, thời lượng dùng.',
          sample: 'Without a doubt, my smartphone is the device I rely on most heavily on a daily basis. It serves as an indispensable tool for managing work schedules, communicating with colleagues, and reading academic articles during my commute.',
          keywords: ['rely heavily on', 'indispensable tool', 'streamline communication', 'daily routine']
        },
        {
          q: 'Do you think modern technology saves people time or wastes their time?',
          tip: 'Thừa nhận tính 2 mặt (con dao hai lưỡi - double-edged sword), nhưng nhấn mạnh kỹ năng quản lý.',
          sample: 'I believe technology is a double-edged sword. On one hand, automated software and digital tools tremendously boost productivity. On the other hand, social media algorithms can easily distract individuals and lead to significant time-wasting if not controlled properly.',
          keywords: ['double-edged sword', 'tremendously boost', 'productivity', 'unproductive distraction']
        },
        {
          q: 'How often do you read news online compared to reading print newspapers?',
          tip: 'So sánh thói quen đọc tin tức online và báo in truyền thống.',
          sample: 'I read news online on a daily basis via reputable digital publications. To be completely honest, I rarely purchase print newspapers anymore because digital platforms provide real-time updates and interactive multimedia content.',
          keywords: ['reputable publications', 'real-time updates', 'multimedia content', 'instant access']
        }
      ]
    },
    {
      id: 'sp1_career',
      topic: 'Work and Professional Life',
      topicVi: 'Công việc & Sự nghiệp',
      level: 'B2',
      questions: [
        {
          q: 'What do you enjoy most about your current job or study?',
          tip: 'Nêu sự hài lòng về giá trị công việc mang lại cho cộng đồng hoặc cơ hội học hỏi.',
          sample: 'What I find most fulfilling about my professional career is the opportunity to solve complex problems and make a tangible difference in people\'s lives. Every single day brings novel challenges that foster continuous professional growth.',
          keywords: ['fulfilling', 'tangible difference', 'continuous growth', 'rewarding']
        },
        {
          q: 'Do you prefer working independently or in a team?',
          tip: 'Nêu ưu điểm của cả hai nhưng chọn một cái phù hợp với bản thân.',
          sample: 'While I can work autonomously when thorough concentration is required, I generally prefer collaborating within a multidisciplinary team. Collective brainstorming often leads to more innovative solutions than working in isolation.',
          keywords: ['autonomously', 'multidisciplinary team', 'brainstorming', 'collaborative spirit']
        },
        {
          q: 'How do you unwind after a demanding workday?',
          tip: 'Chia sẻ hoạt động thư giãn (nghe nhạc, nấu ăn, đi dạo, trò chuyện cùng người thân).',
          sample: 'After an intense shift, I like to disconnect completely from digital screens. Listening to classical melodies or having a home-cooked dinner with my family helps me decompress and achieve a healthy work-life balance.',
          keywords: ['disconnect', 'decompress', 'work-life balance', 'recharge mental stamina']
        }
      ]
    }
  ],

  part2: [
    {
      id: 'sp2_patient_satisfaction',
      situation: 'A community medical center wants to significantly improve patient satisfaction and reduce complaints. Three options are being considered: (1) Implementing an online appointment and digital records portal, (2) Conducting comprehensive communication training for all medical staff, (3) Upgrading physical waiting room amenities with comfortable chairs and entertainment.',
      level: 'B2',
      title: 'Improving Healthcare Service Quality',
      titleVi: 'Nâng cao chất lượng dịch vụ y tế',
      options: [
        { id: 'opt1', text: 'Online appointment & digital portal', pros: 'Cắt giảm thời gian xếp hàng, quản lý hồ sơ bệnh án thông suốt, giảm thiểu sai sót hành chính', cons: 'Người cao tuổi có thể gặp khó khăn công nghệ ban đầu' },
        { id: 'opt2', text: 'Communication training for staff', pros: 'Tạo cảm giác được lắng nghe, cải thiện mối quan hệ bác sĩ - bệnh nhân', cons: 'Không giải quyết được vấn đề cơ sở hạ tầng quá tải' },
        { id: 'opt3', text: 'Upgrading physical waiting rooms', pros: 'Không gian chờ đợi dễ chịu hơn', cons: 'Chỉ giải quyết phần ngọn, không giải quyết được nguồn cơn của việc chờ đợi lâu' }
      ],
      recommended: 'opt1',
      template: {
        opening: "Given the situation where the medical center aims to enhance patient satisfaction, among the three proposed alternatives, I strongly believe that implementing an online appointment portal is the most effective and sustainable solution.",
        reasons: "First and foremost, the primary complaint in most outpatient clinics stems from excruciatingly long waiting times. A digital scheduling portal streamlines patient intake, allowing individuals to book specific time slots and track estimated wait times in real time. Consequently, crowding is substantially mitigated. Furthermore, centralizing patient records digitally prevents lost paperwork and boosts clinical diagnostic efficiency.",
        counter: "On the other hand, although communication workshops for healthcare professionals are undeniably beneficial, they do not resolve the systemic bottleneck of administrative congestion. Likewise, upgrading physical waiting room amenities only makes the waiting experience marginally more tolerable without tackling the root problem of waiting delays.",
        conclusion: "Taking all factors into consideration, the online appointment system represents the highest return on investment and provides a long-term solution for patient satisfaction."
      }
    },
    {
      id: 'sp2_weekend_destress',
      situation: 'You and your close colleagues are planning a two-day weekend getaway to recharge after finishing a strenuous high-pressure project. Three destinations are proposed: (1) A peaceful camping retreat in a national park, (2) A luxurious seaside resort with spa services, (3) A cultural sightseeing tour in a bustling historic city.',
      level: 'B2',
      title: 'Weekend Getaway to Recharge',
      titleVi: 'Kỳ nghỉ cuối tuần phục hồi năng lượng',
      options: [
        { id: 'opt1', text: 'Camping in a national park', pros: 'Hòa mình vào thiên nhiên hoang dã, chi phí hợp lý, hoàn toàn tách biệt khỏi công việc', cons: 'Thiếu thốn tiện nghi, cần chuẩn bị nhiều đồ đạc cồng kềnh' },
        { id: 'opt2', text: 'Luxurious seaside resort with spa', pros: 'Nghỉ dưỡng trọn gói, thư giãn cơ bắp và tinh thần tối đa, không cần bận tâm chuẩn bị', cons: 'Chi phí cao hơn một chút nhưng xứng đáng' },
        { id: 'opt3', text: 'Cultural tour in a historic city', pros: 'Mở mang kiến thức lịch sử, ẩm thực đa dạng', cons: 'Đi bộ nhiều và đông đúc, có thể gây thêm mệt mỏi về thể chất' }
      ],
      recommended: 'opt2',
      template: {
        opening: "After enduring weeks of immense professional pressure, our primary objective is total physical and psychological rejuvenation. Therefore, between the three options, I firmly believe that spending the weekend at a luxurious seaside spa resort is the ideal choice.",
        reasons: "The main justification is that a spa resort delivers an all-inclusive therapeutic environment. Listening to soothing ocean waves while receiving professional massage therapies alleviates physical exhaustion and mental tension. Moreover, having meals and room service prepared allows everyone to genuinely rest without lifting a finger.",
        counter: "In contrast, while camping in a national park sounds adventurous, pitching tents and dealing with insects or unpredictable weather might add unnecessary physical exertion. Furthermore, exploring a bustling historic city involves extensive walking among crowded tourist spots, which runs contrary to the concept of restful recovery.",
        conclusion: "In conclusion, the coastal resort provides the ultimate sanctuary to decompress and return to work fully revitalized."
      }
    }
  ],

  part3: [
    {
      id: 'sp3_exercise',
      topic: 'Regular Physical Exercise',
      topicVi: 'Lợi ích toàn diện của việc tập thể dục đều đặn',
      level: 'B2',
      centralIdea: 'Engaging in regular exercise yields extensive benefits for individuals and society.',
      branches: [
        { title: 'Physical Health', detail: 'Improves cardiovascular performance, maintains ideal weight, boosts metabolic rate, and reduces risk of chronic diseases.' },
        { title: 'Mental Well-being', detail: 'Stimulates the release of endorphins, alleviates symptoms of anxiety and depression, and enhances emotional resilience.' },
        { title: 'Cognitive Function', detail: 'Promotes neuroplasticity, sharpens working memory, and improves concentration during academic or professional tasks.' },
        { title: 'Your Own Idea: Social Connection', detail: 'Joining sports clubs fosters teamwork, expands social circles, and creates supportive peer communities.' }
      ],
      modelSpeech: "Today, I would like to elaborate on the profound merits of engaging in regular physical exercise. It is widely acknowledged that maintaining consistent physical activity is pivotal for holistic well-being.\n\nFirst and foremost, the physical benefits are undeniable. Routine exercise strengthens the cardiovascular system, regulates blood pressure, and boosts metabolism. This significantly curtails the prevalence of chronic ailments like type 2 diabetes and hypertension.\n\nSecondly, physical exertion has an immediate positive impact on mental health. During physical activity, the brain triggers the release of neurotransmitters, particularly endorphins and dopamine, which act as natural mood elevators. This helps individuals effectively mitigate chronic anxiety and workplace burnout.\n\nFurthermore, exercise remarkably sharpens cognitive faculties. Scientific studies confirm that aerobic exercise stimulates neurogenesis in the hippocampus, thereby enhancing memory retention and executive decision-making.\n\nLast but not least, in my personal view, participating in group sports or fitness communities nurtures valuable social bonds, combating modern feelings of isolation.\n\nTo summarize, regular exercise is not merely a hobby, but a cornerstone of physical vitality, psychological balance, and cognitive longevity.",
      followUpQuestions: [
        'Why do many modern individuals fail to exercise regularly despite knowing its benefits?',
        'Should workplaces allocate paid working time for employee fitness routines?'
      ]
    },
    {
      id: 'sp3_remote_work',
      topic: 'The Rise of Remote Work',
      topicVi: 'Xu hướng làm việc từ xa trong kỷ nguyên số',
      level: 'B2',
      centralIdea: 'Remote working arrangements are reshaping contemporary employment dynamics.',
      branches: [
        { title: 'Enhanced Flexibility', detail: 'Enables workers to customize their daily schedules and balance familial commitments.' },
        { title: 'Cost & Time Savings', detail: 'Eliminates stressful daily commutes and reduces office overhead expenditures for employers.' },
        { title: 'Broader Talent Pool', detail: 'Allows organizations to hire skilled professionals globally regardless of geographic limitations.' },
        { title: 'Your Own Idea: Challenges of Isolation', detail: 'Risk of blurring boundaries between work and personal life, requiring high self-discipline.' }
      ],
      modelSpeech: "I would like to discuss the burgeoning trend of remote working in today's digital era. This employment paradigm shift presents substantial transformations for both employees and organizations.\n\nTo begin with, the foremost advantage of remote working is unmatched temporal flexibility. Professionals can structure their workdays around peak productivity hours while effectively managing family responsibilities, which elevates overall job satisfaction.\n\nIn addition, eliminating the daily commute saves tremendous amounts of time and financial resources. Instead of enduring rush-hour traffic jams, workers can reinvest that saved time into personal development, hobbies, or quality sleep, which in turn diminishes chronic fatigue.\n\nMoreover, from an organizational standpoint, telecommuting dismantles geographical frontiers, granting enterprises access to a global talent pool while economizing on expensive office leases.\n\nNevertheless, from my perspective, telecommuting poses distinct hurdles, specifically the blur between domestic and professional boundaries, which necessitates strict self-discipline to avert burnout.\n\nIn conclusion, when supported by adequate digital infrastructure and clear policies, remote work stands as a progressive model of modern labor.",
      followUpQuestions: [
        'What skills are most vital for an employee to thrive in a telecommuting setup?',
        'Do you believe virtual collaboration can ever fully replace face-to-face interaction?'
      ]
    }
  ]
};

export default VSTEP_SPEAKING;
