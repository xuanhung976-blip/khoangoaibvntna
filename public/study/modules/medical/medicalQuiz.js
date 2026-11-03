import { renderQuizSession } from '../quiz.js';
import quizEngine from '../../utils/quizEngine.js';

export function renderMedicalQuiz(container, data, mod) {
  const { vocabulary, quiz } = data;
  const autoQuiz = quiz && quiz.length > 0 ? quiz : quizEngine.generateFromVocabulary(vocabulary, Math.min(15, vocabulary.length));

  container.innerHTML = `
    <div class="animate-fade-in">
      <h3 class="font-bold mb-md" style="font-size:1rem">🎯 Chọn dạng quiz</h3>
      <div class="module-grid mb-xl">
        <div class="module-card" id="btn-quick-quiz"
             style="--module-gradient:${mod.gradient};--module-color:var(--purple)">
          <div class="module-icon-wrap" style="background:${mod.gradient}">⚡</div>
          <div class="module-card-title">Quiz nhanh</div>
          <div class="module-card-subtitle">10 câu ngẫu nhiên</div>
        </div>
        <div class="module-card" id="btn-full-quiz"
             style="--module-gradient:${mod.gradient};--module-color:var(--purple)">
          <div class="module-icon-wrap" style="background:${mod.gradient}">📚</div>
          <div class="module-card-title">Quiz đầy đủ</div>
          <div class="module-card-subtitle">${autoQuiz.length} câu hỏi</div>
        </div>
        <div class="module-card" id="btn-vocab-quiz"
             style="--module-gradient:${mod.gradient};--module-color:var(--teal)">
          <div class="module-icon-wrap" style="background:${mod.gradient}">🔤</div>
          <div class="module-card-title">Từ vựng</div>
          <div class="module-card-subtitle">Tự động từ flashcard</div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-quick-quiz').addEventListener('click', () =>
    renderQuizSession(container, autoQuiz, { title: mod.name, moduleId: mod.id, limit: 10 })
  );
  container.querySelector('#btn-full-quiz').addEventListener('click', () =>
    renderQuizSession(container, autoQuiz, { title: mod.name, moduleId: mod.id })
  );
  container.querySelector('#btn-vocab-quiz').addEventListener('click', () => {
    const vocabQuestions = quizEngine.generateFromVocabulary(vocabulary, Math.min(20, vocabulary.length));
    renderQuizSession(container, vocabQuestions, { title: mod.name + ' Vocabulary', moduleId: mod.id });
  });
}
