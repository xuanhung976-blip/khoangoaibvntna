/**
 * Authentic VSTEP B2 Listening Practice Tests
 * Follows the official 3-Part VSTEP Test Matrix:
 * - Part 1: Short announcements / messages (8 items)
 * - Part 2: Conversations (3 dialogues, 4 questions each)
 * - Part 3: Academic Lectures / Talks (3 lectures, 5 questions each)
 */

export const VSTEP_LISTENING = {
  part1: [
    {
      id: 'p1_1',
      title: 'Airport Gate & Flight Departure Announcement',
      topic: 'Travel & Transportation',
      level: 'B1-B2',
      duration: '45s',
      audioScript: `Attention all passengers on Vietnam Airlines flight VN246 to Da Nang. Due to adverse weather conditions at the destination airport, our departure has been temporarily delayed by approximately forty-five minutes. Furthermore, please be advised that our departure gate has been relocated from Gate 12 to Gate 18B at the end of Concourse B. We apologize for any inconvenience caused and kindly ask all passengers to proceed to Gate 18B immediately for updated boarding passes and complimentary refreshments. Thank you for your patience.`,
      questions: [
        {
          question: 'What is the main reason for the flight delay?',
          options: [
            'Technical maintenance on the aircraft',
            'Severe weather conditions at Da Nang',
            'Congestion on the departure runway',
            'A change of flight crew members'
          ],
          answer: 1,
          explanation: 'Dẫn chứng trong audio: "Due to adverse weather conditions at the destination airport, our departure has been temporarily delayed..." -> Đáp án B đúng.'
        }
      ]
    },
    {
      id: 'p1_2',
      title: 'University Library Weekend Schedule Notice',
      topic: 'Campus Life',
      level: 'B2',
      duration: '50s',
      audioScript: `Good evening students and faculty members. This is an important notice from the Central University Library. Please note that starting this upcoming Saturday, our main reading halls will be undergoing scheduled electrical system upgrades. Consequently, the second and third floor study carrels will be completely closed throughout the weekend. However, the ground floor computer lab and reserve collection desk will remain operational between 9:00 AM and 5:00 PM for borrowing and returning reference materials. Normal library operations will resume promptly at 7:30 AM on Monday morning.`,
      questions: [
        {
          question: 'Which library facility will remain accessible during the weekend?',
          options: [
            'The third floor study carrels',
            'The entire second floor reading room',
            'The ground floor computer lab',
            'All study rooms on upper floors'
          ],
          answer: 2,
          explanation: 'Dẫn chứng: "However, the ground floor computer lab and reserve collection desk will remain operational between 9:00 AM and 5:00 PM..." -> Đáp án C đúng.'
        }
      ]
    },
    {
      id: 'p1_3',
      title: 'Radio Weather Forecast for the Northern Coastal Region',
      topic: 'Weather & Environment',
      level: 'B2',
      duration: '50s',
      audioScript: `And now for your regional weather outlook. Residents along the northern coastal provinces should prepare for a significant drop in temperature over the next forty-eight hours as an intense cold front sweeps down from the northeast. Gale force winds reaching up to sixty kilometers per hour are anticipated along coastal areas, accompanied by persistent drizzle and localized thunderstorms. Small fishing vessels and offshore boats are strongly advised to return to designated harbors before sunset. Drier and milder conditions are expected to return by mid-week.`,
      questions: [
        {
          question: 'What precaution are fishermen advised to take?',
          options: [
            'Wear heavy protective thermal suits',
            'Anchor offshore until the storm passes',
            'Return to designated harbors before sunset',
            'Postpone fishing activities until next month'
          ],
          answer: 2,
          explanation: 'Dẫn chứng: "Small fishing vessels and offshore boats are strongly advised to return to designated harbors before sunset." -> Đáp án C đúng.'
        }
      ]
    }
  ],

  part2: [
    {
      id: 'p2_1',
      title: 'Dialogue: Academic Advising & Course Selection',
      topic: 'Education & University',
      level: 'B2',
      duration: '2m 15s',
      dialogue: [
        { speaker: 'Advisor (Male)', text: 'Good morning, Minh. Come on in and take a seat. What can I help you with regarding your upcoming semester schedule?' },
        { speaker: 'Student (Female)', text: 'Good morning, Professor Davis. I am feeling a bit overwhelmed choosing between Advanced Macroeconomics and International Trade Law. Both are electives, but I am worried about handling the heavy reading load alongside my graduation thesis.' },
        { speaker: 'Advisor (Male)', text: 'I completely understand your concern. Macroeconomics involves rigorous quantitative modeling and weekly problem sets, whereas Trade Law requires analyzing extensive legal case studies and submitting two twenty-page research essays.' },
        { speaker: 'Student (Female)', text: 'In that case, Trade Law sounds much more writing-intensive. Since my thesis already demands intensive literature reviews and academic writing, perhaps Macroeconomics would offer a better balance of analytical problem-solving?' },
        { speaker: 'Advisor (Male)', text: 'That is a very astute observation. Diversifying your cognitive load is crucial during your final semester. Furthermore, Professor Miller, who teaches Macroeconomics, offers dedicated tutorial sessions on Friday mornings which students find immensely helpful.' },
        { speaker: 'Student (Female)', text: 'That settles it then! I will register for Macroeconomics and finalize my thesis proposal by Friday. Thank you so much for your guidance, Professor.' }
      ],
      questions: [
        {
          question: 'What is the student primary dilemma?',
          options: [
            'She failed her prerequisite economics course',
            'She is struggling to balance two heavy electives with her thesis',
            'She wants to change her academic major in her final year',
            'She cannot find a suitable professor for her thesis'
          ],
          answer: 1,
          explanation: 'Người học giải thích: "I am feeling a bit overwhelmed choosing between Advanced Macroeconomics and International Trade Law... alongside my graduation thesis."'
        },
        {
          question: 'What does International Trade Law require students to do?',
          options: [
            'Solve complex weekly mathematical formulas',
            'Undertake an overseas internship',
            'Analyze legal cases and write extensive research essays',
            'Attend lab experiments every Friday morning'
          ],
          answer: 2,
          explanation: 'Giáo sư cho biết: "Trade Law requires analyzing extensive legal case studies and submitting two twenty-page research essays."'
        },
        {
          question: 'Why does the student decide to choose Advanced Macroeconomics?',
          options: [
            'It offers a better balance with quantitative analysis instead of essay writing',
            'It does not require any midterm or final examinations',
            'Her best friend is taking the same course',
            'It is held fully online without attendance requirements'
          ],
          answer: 0,
          explanation: 'Sinh viên nhận định: "Macroeconomics would offer a better balance of analytical problem-solving" thay vì phải viết thêm bài luận dài.'
        },
        {
          question: 'What additional support does Professor Miller provide for the course?',
          options: [
            'Free digital textbooks for all enrolled students',
            'Friday morning tutorial sessions',
            'Individual thesis supervision',
            'Guaranteed passing grades for seniors'
          ],
          answer: 1,
          explanation: 'Giáo sư cố vấn nói: "Professor Miller... offers dedicated tutorial sessions on Friday mornings which students find immensely helpful."'
        }
      ]
    }
  ],

  part3: [
    {
      id: 'p3_1',
      title: 'Academic Lecture: Circadian Rhythms and Cognitive Performance',
      topic: 'Neuroscience & Health',
      level: 'B2-C1',
      duration: '3m 10s',
      audioScript: `Good afternoon, class. Today we will explore the fascinating biological mechanism known as the circadian rhythm, and examine how it directly governs human cognitive function and academic productivity.

Derived from the Latin 'circa dies', meaning 'around a day', circadian rhythms are internal twenty-four-hour clocks synchronized primarily by external light cues detected by specialized cells in the retina. These retinal photoreceptors transmit signals directly to the suprachiasmatic nucleus, or SCN, located within the hypothalamus. The SCN acts as the body's master pacemaker, regulating the synthesis of vital neurochemicals, most notably melatonin, which facilitates restorative sleep, and cortisol, which promotes alertness and metabolic activity.

Recent empirical research published in cognitive neuroscience demonstrates that human attention, working memory capacity, and logical deduction fluctuate predictably across the diurnal cycle. For the vast majority of diurnal individuals—often categorized as morning larks or intermediate chronotypes—peak analytical ability occurs between 9:30 AM and 11:30 AM. During this morning window, blood cortisol levels remain elevated, and neural connectivity in the prefrontal cortex operates with optimal efficiency. This makes the late morning the golden window for tackling intellectually demanding tasks such as mathematical problem solving, foreign language syntax parsing, and statistical analysis.

Conversely, between 1:30 PM and 3:00 PM, humans typically experience what chronobiologists term the 'post-prandial dip'. Contrary to common folklore, this temporary cognitive slump is not merely the consequence of a heavy carbohydrate-laden lunch; rather, it is hardwired into our evolutionary biology as a minor circadian nadir in core body temperature and alertness. Rather than forcing high-stakes memorization during this trough, researchers recommend dedicating early afternoons to collaborative discussions, organizational chores, or brief twenty-minute power naps.

Finally, chronic misalignment of this delicate endogenous rhythm—common among shift workers and university students pulling late-night cramming sessions—carries severe neural consequences. Sleep deprivation inhibits the glymphatic system, which cleanses metabolic waste products from the brain during deep slow-wave sleep. Over time, disrupted circadian cycles lead to synaptic pruning impairment, substantial deficits in memory consolidation, and heightened susceptibility to stress and anxiety. Therefore, aligning your rigorous study schedule with your innate biological chronotype is not merely a lifestyle choice; it is an evidence-based pedagogical necessity.`,
      questions: [
        {
          question: 'What serves as the primary master clock regulating circadian rhythms in the human brain?',
          options: [
            'The cerebral cortex',
            'The suprachiasmatic nucleus (SCN)',
            'The adrenal glands',
            'The visual retina'
          ],
          answer: 1,
          explanation: 'Dẫn chứng trong bài giảng: "These retinal photoreceptors transmit signals directly to the suprachiasmatic nucleus, or SCN... acts as the body master pacemaker."'
        },
        {
          question: 'According to the lecture, what makes the late morning (9:30 - 11:30 AM) optimal for studying?',
          options: [
            'Decreased cortisol levels in the bloodstream',
            'Optimal neural connectivity in the prefrontal cortex',
            'A total absence of background environmental noise',
            'The release of large quantities of melatonin'
          ],
          answer: 1,
          explanation: 'Dẫn chứng: "During this morning window... neural connectivity in the prefrontal cortex operates with optimal efficiency."'
        },
        {
          question: 'What true cause of the afternoon slump (1:30 - 3:00 PM) is emphasized by the lecturer?',
          options: [
            'Eating excessive amounts of carbohydrates at lunch',
            'An evolutionary circadian nadir in core body temperature and alertness',
            'Dehydration caused by prolonged indoor heating',
            'A sudden surge in blood glucose and adrenaline'
          ],
          answer: 1,
          explanation: 'Dẫn chứng: "Contrary to common folklore... it is hardwired into our evolutionary biology as a minor circadian nadir in core body temperature and alertness."'
        },
        {
          question: 'What is the vital function of the glymphatic system during slow-wave sleep?',
          options: [
            'To cleanse metabolic waste products from the brain',
            'To accelerate heart rate and muscle repair',
            'To synthesize adrenaline for morning activities',
            'To prevent dreams from disrupting REM sleep'
          ],
          answer: 0,
          explanation: 'Dẫn chứng: "...the glymphatic system, which cleanses metabolic waste products from the brain during deep slow-wave sleep."'
        },
        {
          question: 'What concluding advice does the lecturer give students?',
          options: [
            'Rely on caffeinated beverages to stay awake at night',
            'Avoid studying in groups during early morning hours',
            'Align study schedules with their innate biological chronotypes',
            'Study exclusively between midnight and 6:00 AM'
          ],
          answer: 2,
          explanation: 'Dẫn chứng: "Therefore, aligning your rigorous study schedule with your innate biological chronotype is not merely a lifestyle choice; it is an evidence-based pedagogical necessity."'
        }
      ]
    }
  ]
};

export default VSTEP_LISTENING;
