import storage from './storage.js';

class StatisticsEngine {
  getOverallStats() {
    const flashcardData = storage.get(storage.namespaces.FLASHCARD_PROGRESS, {});
    const entries = Object.values(flashcardData);
    const learned = entries.filter(e => e.confidence >= 1).length;
    const mastered = entries.filter(e => e.confidence >= 4).length;
    return {
      totalLearned: learned,
      totalMastered: mastered,
      totalWords: entries.length,
    };
  }

  getWeeklyActivity() {
    const streak = storage.getStreak();
    const studyDates = streak.studyDates || [];
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toDateString();
      result.push({
        label: days[d.getDay()],
        active: studyDates.includes(dateStr),
      });
    }
    return result;
  }

  getModuleStats(moduleId) {
    const results = storage.getQuizResults(moduleId);
    if (!results.length) return { quizCount: 0, avgScore: 0, lastPlayed: null };
    const avg = Math.round(results.reduce((sum, r) => sum + (r.percentage || r.score || 0), 0) / results.length);
    return {
      quizCount: results.length,
      avgScore: avg,
      lastPlayed: results[0]?.timestamp || null,
    };
  }

  getMedicalModuleStats(moduleId) {
    const flashcardData = storage.get(storage.namespaces.FLASHCARD_PROGRESS, {});
    const entries = Object.entries(flashcardData);
    
    // Map module ID to its prefix
    const prefixMap = {
      thyroid: ['thy_', 'thy_ex_'],
      diabetes: ['dm_', 'dm_ex_']
    };
    const prefixes = prefixMap[moduleId] || [moduleId + '_'];
    
    const moduleEntries = entries.filter(([key]) => 
      prefixes.some(p => key.startsWith(p))
    );
    const learned = moduleEntries.filter(([, v]) => v.confidence >= 2).length;
    
    // Exact totals from combined vocabulary files
    const VOCAB_TOTALS = {
      thyroid: 222,
      diabetes: 213
    };
    const total = VOCAB_TOTALS[moduleId] || 50;
    const percent = total > 0 ? Math.round((learned / total) * 100) : 0;

    const quizResults = storage.getQuizResults(moduleId);
    const avgScore = quizResults.length
      ? Math.round(quizResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / quizResults.length)
      : 0;

    return {
      learned,
      total,
      percent,
      avgScore,
      quizCount: quizResults.length,
      lastPlayed: quizResults[0]?.timestamp || null,
    };
  }
}

export default new StatisticsEngine();
