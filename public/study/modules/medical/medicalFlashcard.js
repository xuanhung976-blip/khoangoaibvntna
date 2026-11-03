import { renderFlashcardSession } from '../flashcard.js';

export function renderMedicalFlashcard(container, vocabulary, options = {}) {
  const { title = 'Medical Flashcard', moduleGradient = 'var(--gradient-medical)', moduleId = 'medical' } = options;
  renderFlashcardSession(container, vocabulary, { title, moduleGradient, moduleId });
}
