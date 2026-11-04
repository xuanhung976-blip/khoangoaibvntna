/**
 * VSTEP AI 1-on-1 Virtual Examiner & Speaking Partner
 * Powered by Google Gemini AI with Speech-to-Text & Text-to-Speech
 * Replicates the authentic VSTEP Speaking Room & 24/7 AI Tutor
 */

import gemini from '../utils/gemini.js';
import { speak, showToast } from '../utils/helpers.js';
import { openGeminiConfigModal } from './aiConfig.js';

export function renderAITutor(container) {
  let activeMode = 'speaking_part1'; // 'speaking_part1', 'speaking_part2', 'speaking_part3', 'free_chat'
  let chatHistory = [];
  let isRecording = false;
  let recognition = null;

  // Initialize Speech Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSpeechSupported = !!SpeechRecognition;

  if (isSpeechSupported) {
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
    } catch (e) {
      console.warn('SpeechRecognition init error:', e);
    }
  }

  // Pre-seed greetings based on mode
  function getModeGreeting(mode) {
    switch (mode) {
      case 'speaking_part1':
        return {
          role: 'model',
          text: `👋 **Hello and welcome to your VSTEP Speaking Test!** I am your Virtual AI Examiner.\n\nIn this session, we will practice **Part 1: Social Interaction**. Let's start with your hometown and daily routine:\n\n👉 **"Could you tell me a little bit about your hometown? What do you like most about living there?"**\n\n*(You can click the 🎙️ **Microphone** button below to answer with your voice, or type your answer in the box!)*`
        };
      case 'speaking_part2':
        return {
          role: 'model',
          text: `🎯 **Welcome to VSTEP Speaking Part 2: Solution Discussion!**\n\nHere is your situation:\n> *"Your younger brother has just graduated from high school and wants to spend his 3-month summer vacation productively. Three options are suggested: **taking an intensive English course**, **working part-time at a coffee shop**, or **volunteering at a local community project**."*\n\n👉 **Which option do you think is the best, and why do you eliminate the other two?**\n\nTake your time to structure your answer using the **A-R-E formula** (Answer - Reason - Example)!`
        };
      case 'speaking_part3':
        return {
          role: 'model',
          text: `🧠 **Welcome to VSTEP Speaking Part 3: Topic Development!**\n\nLet's discuss the following statement:\n> *"Online learning has become increasingly popular in higher education."*\n\n👉 **What are the key advantages of online learning for university students? And do you think it will ever completely replace traditional face-to-face classrooms?**`
        };
      case 'free_chat':
      default:
        return {
          role: 'model',
          text: `🤖 **Xin chào! Tôi là Trợ lý AI Gia sư VSTEP Master.**\n\nTôi có thể giúp bạn:\n- ✍️ **Chữa bài luận Writing** (Task 1 & Task 2) chi tiết từng câu\n- 🗣️ **Luyện phát âm & ngữ điệu Speaking**\n- 🔍 **Giải thích ngữ pháp B2-C1** (câu điều kiện hỗn hợp, đảo ngữ, bị động học thuật)\n- 🚀 **Nâng cấp từ vựng A2/B1 thành B2/C1**\n\nBạn muốn ôn luyện hoặc thắc mắc điều gì hôm nay?`
        };
    }
  }

  function resetChatForMode(mode) {
    activeMode = mode;
    chatHistory = [getModeGreeting(mode)];
    renderChatMessages();
  }

  function render() {
    container.innerHTML = `
      <div class="page-view animate-fade-in" style="max-width: 960px; margin: 0 auto;">
        
        <!-- Page Header -->
        <div class="page-header" style="margin-bottom: 20px;">
          <div class="flex items-center justify-between flex-wrap gap-md">
            <div>
              <h2 class="page-title" style="display:flex; align-items:center; gap:8px;">
                🤖 VSTEP AI Virtual Examiner & 24/7 Tutor
                <span class="chip chip-purple" style="font-size:0.75rem; font-weight:700">Gemini 3.8 / 3.6</span>
              </h2>
              <p class="page-subtitle">Phòng thi ảo 1-kèm-1: Giám khảo AI đối thoại, phản xạ giọng nói, chấm điểm & gợi ý nâng cấp B2 tức thì</p>
            </div>
            <div class="flex items-center gap-xs">
              <button class="btn btn-secondary btn-sm" id="btn-config-ai-tutor">
                ⚙️ Cài đặt AI
              </button>
              <button class="btn btn-ghost btn-sm" id="btn-clear-chat" title="Xóa lịch sử hội thoại">
                🧹 Xóa chat
              </button>
            </div>
          </div>
        </div>

        <!-- Mode Tabs -->
        <div class="tabs mb-md" id="ai-mode-tabs" style="display:flex; flex-wrap:wrap; gap:6px;">
          <button class="tab-btn ${activeMode === 'speaking_part1' ? 'active' : ''}" data-mode="speaking_part1">
            🗣️ Part 1: Giao tiếp xã hội
          </button>
          <button class="tab-btn ${activeMode === 'speaking_part2' ? 'active' : ''}" data-mode="speaking_part2">
            💡 Part 2: Thảo luận giải pháp
          </button>
          <button class="tab-btn ${activeMode === 'speaking_part3' ? 'active' : ''}" data-mode="speaking_part3">
            🧠 Part 3: Phát triển chủ đề
          </button>
          <button class="tab-btn ${activeMode === 'free_chat' ? 'active' : ''}" data-mode="free_chat">
            💬 Hỏi đáp & Gia sư 24/7
          </button>
        </div>

        <!-- Main Chat Box Container -->
        <div class="glass-card mb-md" style="padding:0; overflow:hidden; display:flex; flex-direction:column; height: 600px; border:1px solid var(--border-glass);">
          
          <!-- Chat Transcript Scrollable Area -->
          <div id="ai-chat-transcript" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px;">
            <!-- Dynamic Messages will render here -->
          </div>

          <!-- Typing Indicator (Hidden by default) -->
          <div id="ai-typing-indicator" class="hidden" style="padding:8px 24px; font-size:0.82rem; color:var(--text-secondary); display:flex; align-items:center; gap:8px; background:rgba(99,102,241,0.04);">
            <div class="spinner" style="width:16px; height:16px; border-width:2px;"></div>
            <span>Giám khảo AI đang chấm và suy nghĩ câu trả lời...</span>
          </div>

          <!-- Quick Suggestion Starter Pills -->
          <div style="padding:8px 16px; background:#f8fafc; border-top:1px solid var(--border-glass); display:flex; align-items:center; gap:6px; overflow-x:auto; white-space:nowrap;" id="ai-quick-prompts">
            <span class="text-xs text-muted" style="font-weight:700;">Gợi ý nhanh:</span>
            <button class="chip chip-prompt" data-prompt="Could you give me feedback on my previous answer and rate my CEFR band?">📊 Chấm điểm câu vừa rồi</button>
            <button class="chip chip-prompt" data-prompt="How would a native speaker or C1 candidate answer this question?">✨ Cho em câu trả lời mẫu C1</button>
            <button class="chip chip-prompt" data-prompt="Ask me the next realistic VSTEP question, please.">👉 Hỏi em câu tiếp theo</button>
            <button class="chip chip-prompt" data-prompt="What are some high-scoring collocations for this topic?">📚 Gợi ý từ vựng ăn điểm B2</button>
          </div>

          <!-- Chat Input Bar -->
          <div style="padding:14px 18px; background:#ffffff; border-top:1px solid var(--border-glass); display:flex; align-items:flex-end; gap:10px;">
            <button 
              id="btn-ai-mic" 
              class="btn btn-secondary" 
              style="padding:10px 14px; border-radius:12px; display:flex; align-items:center; gap:6px; font-weight:700; transition:all 0.2s;"
              title="${isSpeechSupported ? 'Nhấn để nói tiếng Anh qua Micro' : 'Trình duyệt không hỗ trợ Web Speech API'}"
            >
              <span id="ai-mic-icon">🎙️</span>
              <span id="ai-mic-label" class="hidden-mobile">Nói</span>
            </button>

            <textarea 
              id="ai-chat-input" 
              rows="1" 
              style="flex:1; resize:none; padding:10px 14px; font-size:0.95rem; line-height:1.5; border-radius:12px; border:1px solid var(--border-glass); outline:none; font-family:inherit; max-height:120px; transition:border-color 0.2s;" 
              placeholder="Nhập câu trả lời tiếng Anh hoặc câu hỏi của bạn... (Bấm Enter để gửi)"
            ></textarea>

            <button 
              id="btn-ai-send" 
              class="btn btn-primary" 
              style="padding:10px 20px; border-radius:12px; font-weight:700; display:flex; align-items:center; gap:6px;"
            >
              <span>Gửi</span>
              <span>🚀</span>
            </button>
          </div>

        </div>

      </div>
    `;

    // Initialize greeting
    chatHistory = [getModeGreeting(activeMode)];
    renderChatMessages();

    // Mode switch handler
    container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        resetChatForMode(btn.dataset.mode);
      });
    });

    // Config AI modal trigger
    container.querySelector('#btn-config-ai-tutor').addEventListener('click', openGeminiConfigModal);

    // Clear chat
    container.querySelector('#btn-clear-chat').addEventListener('click', () => {
      resetChatForMode(activeMode);
      showToast('Đã làm mới phòng thi AI!', 'info');
    });

    // Quick prompt buttons
    container.querySelectorAll('.chip-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        sendMessage(btn.dataset.prompt);
      });
    });

    // Send on click
    container.querySelector('#btn-ai-send').addEventListener('click', () => {
      const input = container.querySelector('#ai-chat-input');
      const text = input.value.trim();
      if (text) {
        sendMessage(text);
        input.value = '';
        input.style.height = 'auto';
      }
    });

    // Send on Enter (Shift+Enter for newline)
    const chatInput = container.querySelector('#ai-chat-input');
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) {
          sendMessage(text);
          chatInput.value = '';
          chatInput.style.height = 'auto';
        }
      }
    });

    // Auto-expand textarea
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    // Microphone Voice Input
    setupMicrophone();
  }

  function renderChatMessages() {
    const transcript = container.querySelector('#ai-chat-transcript');
    if (!transcript) return;

    transcript.innerHTML = chatHistory.map((msg, idx) => {
      const isUser = msg.role === 'user';
      return `
        <div class="chat-message-row animate-fade-in" style="display:flex; justify-content:${isUser ? 'flex-end' : 'flex-start'}; align-items:flex-start; gap:10px;">
          ${!isUser ? `
            <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, var(--purple), #818cf8); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.1rem; flex-shrink:0; box-shadow:0 2px 6px rgba(99,102,241,0.25);">
              🤖
            </div>
          ` : ''}

          <div style="max-width:82%; display:flex; flex-direction:column; align-items:${isUser ? 'flex-end' : 'flex-start'};">
            <div style="padding:14px 18px; border-radius:${isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px'}; background:${isUser ? 'linear-gradient(135deg, var(--purple), #4f46e5)' : '#ffffff'}; color:${isUser ? '#ffffff' : 'var(--text-primary)'}; box-shadow:0 2px 8px rgba(0,0,0,0.05); border:${isUser ? 'none' : '1px solid var(--border-glass)'}; font-size:0.92rem; line-height:1.65; white-space:pre-wrap;">
              ${formatMarkdownText(msg.text)}
            </div>

            ${!isUser ? `
              <div class="flex items-center gap-xs mt-xs">
                <button class="btn btn-ghost btn-sm btn-tts" data-idx="${idx}" style="font-size:0.75rem; padding:2px 8px; color:var(--purple); border-radius:6px;" title="Nghe giám khảo phát âm">
                  🔊 Nghe
                </button>
                <button class="btn btn-ghost btn-sm btn-copy-msg" data-idx="${idx}" style="font-size:0.75rem; padding:2px 8px; color:var(--text-secondary); border-radius:6px;" title="Sao chép nội dung">
                  📋 Chép
                </button>
              </div>
            ` : ''}
          </div>

          ${isUser ? `
            <div style="width:36px; height:36px; border-radius:50%; background:#10b981; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.1rem; flex-shrink:0;">
              🧑‍🎓
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach TTS listeners
    transcript.querySelectorAll('.btn-tts').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const msg = chatHistory[idx];
        if (msg) {
          // Strip markdown symbols before speaking
          const cleanText = msg.text.replace(/[*_#>`~]/g, '');
          speak(cleanText);
        }
      });
    });

    // Attach Copy listeners
    transcript.querySelectorAll('.btn-copy-msg').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const msg = chatHistory[idx];
        if (msg) {
          navigator.clipboard.writeText(msg.text).then(() => {
            showToast('Đã sao chép phản hồi vào clipboard!', 'success');
          });
        }
      });
    });

    // Auto-scroll to bottom
    transcript.scrollTop = transcript.scrollHeight;
  }

  function formatMarkdownText(raw) {
    if (!raw) return '';
    return raw
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^>\s?(.*)$/gm, '<blockquote style="border-left:3px solid var(--purple); padding-left:10px; margin:6px 0; color:var(--text-secondary); font-style:italic;">$1</blockquote>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,0.08); color:var(--purple-dark); padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.88em;">$1</code>');
  }

  async function sendMessage(text) {
    chatHistory.push({ role: 'user', text });
    renderChatMessages();

    const indicator = container.querySelector('#ai-typing-indicator');
    if (indicator) indicator.classList.remove('hidden');

    try {
      let systemPrompt = '';
      if (activeMode === 'speaking_part1') {
        systemPrompt = `You are a certified VSTEP Speaking Examiner conducting Part 1 (Social Interaction). 
Evaluate the candidate's response briefly (Praise strengths, give 1 specific B2 grammar/lexical upgrade), assign a predicted CEFR Band (B1, B2, or C1), and then ask the NEXT natural Part 1 question related to hobbies, travel, studies, or daily life.`;
      } else if (activeMode === 'speaking_part2') {
        systemPrompt = `You are a certified VSTEP Speaking Examiner conducting Part 2 (Solution Discussion). 
Listen to candidate's choice of option. Evaluate their reasoning (Answer, Reason, Example). Challenge them with a realistic counter-argument or ask them why the rejected options wouldn't work, simulating authentic B2 defense.`;
      } else if (activeMode === 'speaking_part3') {
        systemPrompt = `You are a certified VSTEP Speaking Examiner conducting Part 3 (Topic Development).
Discuss the topic deeply. Point out academic collocations they could use. Ask a thought-provoking follow-up question on social implications.`;
      } else {
        systemPrompt = `You are VSTEP AI Master, an expert English examiner and 1-on-1 private tutor. Assist with writing, grammar, vocabulary, and test-taking strategies with detailed, encouraging explanations.`;
      }

      const reply = await gemini.chatTutor(chatHistory, systemPrompt);
      chatHistory.push({ role: 'model', text: reply || 'I heard you! Let\'s continue.' });
    } catch (err) {
      chatHistory.push({
        role: 'model',
        text: `⚠️ **Không thể kết nối với Gemini AI:** ${err.message}\n\n*Vui lòng kiểm tra lại kết nối mạng hoặc Gemini API Key trong phần Cài đặt AI.*`
      });
    } finally {
      if (indicator) indicator.classList.add('hidden');
      renderChatMessages();
    }
  }

  function setupMicrophone() {
    const btnMic = container.querySelector('#btn-ai-mic');
    const micIcon = container.querySelector('#ai-mic-icon');
    const micLabel = container.querySelector('#ai-mic-label');
    const chatInput = container.querySelector('#ai-chat-input');

    if (!btnMic) return;

    if (!isSpeechSupported) {
      btnMic.style.opacity = '0.7';
      btnMic.title = 'Trình duyệt chưa hỗ trợ Web Speech API. Bạn có thể gõ câu trả lời hoặc mở trong Chrome/Edge.';
      btnMic.addEventListener('click', () => {
        showToast('Trình duyệt chưa hỗ trợ Web Speech. Vui lòng gõ tin nhắn trực tiếp hoặc mở bằng Chrome/Edge.', 'info');
      });
      return;
    }

    let shouldKeepRecording = false;

    function initRecognition() {
      if (recognition) {
        try { recognition.abort(); } catch (_) {}
      }
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isRecording = true;
          btnMic.style.background = '#ef4444';
          btnMic.style.color = '#ffffff';
          btnMic.style.borderColor = '#ef4444';
          if (micIcon) micIcon.textContent = '⏹️';
          if (micLabel) micLabel.textContent = 'Gửi';
          chatInput.placeholder = 'Đang lắng nghe giọng nói tiếng Anh của bạn... (Nói xong bấm Gửi)'; 
        };

        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              chatInput.value = (chatInput.value + ' ' + event.results[i][0].transcript).trim();
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          if (interim) chatInput.placeholder = interim;
        };

        recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
          }
          stopRecording();
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            showToast('Vui lòng cấp quyền truy cập Micro trên trình duyệt để luyện nói.', 'warning');
          }
        };

        recognition.onend = () => {
          if (shouldKeepRecording) {
            try {
              recognition.start();
              return;
            } catch (_) {}
          }
          stopRecording();
          chatInput.placeholder = 'Nhập câu trả lời tiếng Anh hoặc câu hỏi của bạn... (Bấm Enter để gửi)';
        };
      } catch (e) {
        console.warn('SpeechRecognition init error:', e);
      }
    }

    initRecognition();

    btnMic.addEventListener('click', async () => {
      if (isRecording) {
        shouldKeepRecording = false;
        if (recognition) {
          try { recognition.stop(); } catch (_) {}
        }
        stopRecording();

        // Auto-send spoken text to AI
        const text = chatInput.value.trim();
        if (text) {
          sendMessage(text);
          chatInput.value = '';
          chatInput.style.height = 'auto';
        } else {
          showToast('Chưa nghe rõ giọng nói. Bạn có thể nói lại vào micro hoặc gõ tin nhắn.', 'info');
        }
      } else {
        shouldKeepRecording = true;
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
          }
        } catch (permErr) {
          console.warn('Microphone permission request error:', permErr);
          if (permErr.name === 'NotAllowedError') {
            showToast('Vui lòng cấp quyền Micro trên trình duyệt.', 'warning');
            return;
          }
        }

        initRecognition();
        try {
          recognition.start();
        } catch (e) {
          console.warn('Speech start error:', e);
          try {
            recognition.stop();
            setTimeout(() => { try { recognition.start(); } catch (_) {} }, 200);
          } catch (_) {}
        }
      }
    });

    function stopRecording() {
      shouldKeepRecording = false;
      isRecording = false;
      btnMic.style.background = '';
      btnMic.style.color = '';
      btnMic.style.borderColor = '';
      if (micIcon) micIcon.textContent = '🎙️';
      if (micLabel) micLabel.textContent = 'Nói';
    }
  }

  render();
}

export default { renderAITutor };
