// =============================================================================
// VIBROPRESS AI - ОКОНЧАТЕЛЬНО ПРАВИЛЬНАЯ ВЕРСИЯ
// =============================================================================

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://vibropress-assistant-backend.onrender.com';

console.log('🔗 API URL:', API_URL);

let currentMode = 'norm';
let isLoading = false;
let sessionId = null;
let conversationHistory = [];

// Генерируем session_id
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

sessionId = generateSessionId();

// =============================================================================
// ИНИЦИАЛИЗАЦИЯ
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initModeButtons();
    initChatInput();
    initExampleQuestions();
});

// =============================================================================
// РЕЖИМЫ РАБОТЫ
// =============================================================================

const MODES = {
    norm: {
        name: 'ГОСТ/СП',
        taskType: 'norm',
        examples: [
            'Какие требования к истираемости тротуарной плитки?',
            'Прочность бетона М300 по ГОСТ',
            'Морозостойкость бордюрного камня'
        ]
    },
    equipment: {
        name: 'Оборудование',
        taskType: 'equipment',
        examples: [
            'Настройка вибростола для плитки',
            'Режимы работы вибропресса',
            'Диагностика неисправностей'
        ]
    },
    defects: {
        name: 'Претензии',
        taskType: 'defects',
        examples: [
            'Почему плитка крошится?',
            'Высолы на бетонных изделиях',
            'Трещины в бордюрах - причины'
        ]
    },
    recipes: {
        name: 'Рецептуры',
        taskType: 'recipes',
        examples: [
            'Состав бетона для тротуарной плитки',
            'Водоцементное отношение для М400',
            'Добавки для морозостойкости'
        ]
    }
};

function initModeButtons() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const mode = btn.dataset.mode;
            currentMode = mode;
            
            document.getElementById('current-mode').textContent = MODES[mode].name;
            updateExampleQuestions();
        });
    });
}

function updateExampleQuestions() {
    const container = document.getElementById('example-questions');
    const examples = MODES[currentMode].examples;
    
    if (container) {
        container.innerHTML = examples.map(q => 
            `<button class="example-question" onclick="askQuestion('${q.replace(/'/g, "\\'")}')">
                ${q}
            </button>`
        ).join('');
    }
}

function initExampleQuestions() {
    updateExampleQuestions();
}

function askQuestion(question) {
    const input = document.getElementById('chat-input');
    input.value = question;
    sendMessage();
}

// =============================================================================
// ОТПРАВКА СООБЩЕНИЙ
// =============================================================================

function initChatInput() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (input) {
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 150) + 'px';
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
}

async function sendMessage() {
    if (isLoading) return;
    
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Добавляем сообщение пользователя
    addMessage('user', message);
    
    // Добавляем в историю
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    // Очищаем input
    input.value = '';
    input.style.height = 'auto';
    
    // Показываем индикатор загрузки
    isLoading = true;
    updateSendButton(true);
    const loadingId = addLoadingMessage();
    
    try {
        console.log('📤 Отправка запроса:', {
            messages: conversationHistory,
            use_rag: true,
            max_results: 5,
            session_id: sessionId
        });
        
        // ПРАВИЛЬНЫЙ ФОРМАТ как ожидает ваш API
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory,    // ← ПРАВИЛЬНО!
                use_rag: true,
                max_results: 5,
                session_id: sessionId
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            throw new Error(`Ошибка ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📥 API Response:', data);
        
        // Добавляем ответ бота в историю
        conversationHistory.push({
            role: 'assistant',
            content: data.response
        });
        
        // Удаляем индикатор загрузки
        removeMessage(loadingId);
        
        // Добавляем ответ бота
        addBotResponse(data);
        
    } catch (error) {
        console.error('❌ Error:', error);
        removeMessage(loadingId);
        
        addMessage('bot', `⚠️ Произошла ошибка: ${error.message}\n\n💡 Возможные причины:\n• API загружается после простоя (~60 сек первый запрос)\n• Проблемы с сетью\n• Backend не отвечает\n\n🔄 Попробуйте ещё раз через минуту.`);
    } finally {
        isLoading = false;
        updateSendButton(false);
    }
}

function updateSendButton(loading) {
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('chat-input');
    
    if (loading) {
        sendBtn.disabled = true;
        input.disabled = true;
        sendBtn.innerHTML = `
            <svg class="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/>
            </svg>
        `;
    } else {
        sendBtn.disabled = false;
        input.disabled = false;
        sendBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }
}

// =============================================================================
// ДОБАВЛЕНИЕ СООБЩЕНИЙ
// =============================================================================

function addMessage(type, text) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageId = 'msg_' + Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.id = messageId;
    
    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${escapeHtml(text)}</p>
            </div>
            <div class="message-avatar">👤</div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                ${formatText(text)}
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    return messageId;
}

function addLoadingMessage() {
    const messagesContainer = document.getElementById('chat-messages');
    const messageId = 'loading_' + Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.id = messageId;
    messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    return messageId;
}

function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

function addBotResponse(data) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    let html = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            ${formatText(data.response)}
    `;
    
    // Добавляем источники если есть
    if (data.sources && data.sources.length > 0) {
        html += renderSources(data.sources);
    }
    
    html += `</div>`;
    
    messageDiv.innerHTML = html;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function formatText(text) {
    // Экранируем HTML
    text = escapeHtml(text);
    
    // Форматируем жирный текст **текст**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Форматируем код `код`
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Параграфы
    const lines = text.split('\n');
    const formatted = [];
    let inList = false;
    
    for (let line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            if (!inList) {
                formatted.push('<ul>');
                inList = true;
            }
            formatted.push(`<li>${trimmed.substring(2)}</li>`);
        } else {
            if (inList) {
                formatted.push('</ul>');
                inList = false;
            }
            if (trimmed) {
                formatted.push(`<p>${trimmed}</p>`);
            }
        }
    }
    
    if (inList) {
        formatted.push('</ul>');
    }
    
    return formatted.join('\n');
}

function renderSources(sources) {
    if (!sources || sources.length === 0) return '';
    
    let html = `
        <div class="sources">
            <h4>📚 Источники:</h4>
    `;
    
    sources.slice(0, 3).forEach((source, index) => {
        const preview = typeof source === 'string' 
            ? (source.length > 150 ? source.substring(0, 150) + '...' : source)
            : 'Источник';
            
        html += `
            <div class="source-item">
                <strong>Источник ${index + 1}</strong>
                <p>${escapeHtml(preview)}</p>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function newChat() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <p>Здравствуйте! Я VibroPress AI.</p>
                <p>Выберите режим работы и задайте вопрос.</p>
            </div>
        </div>
    `;
    conversationHistory = [];
    sessionId = generateSessionId();
}

// =============================================================================
// СТИЛИ
// =============================================================================

const style = document.createElement('style');
style.textContent = `
.loading-dots {
    display: flex;
    gap: 8px;
    padding: 8px 0;
}

.loading-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3b82f6;
    animation: bounce 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
}

.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.message {
    animation: fadeInUp 0.4s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.sources {
    margin-top: 16px;
    padding: 12px;
    background: #f0f9ff;
    border-radius: 8px;
    border-left: 4px solid #3b82f6;
}

.sources h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
}

.source-item {
    margin-bottom: 10px;
    padding: 10px;
    background: white;
    border-radius: 6px;
}

.source-item:last-child {
    margin-bottom: 0;
}

.source-item strong {
    color: #3b82f6;
    font-size: 13px;
}

.source-item p {
    margin: 6px 0 0 0;
    color: #6b7280;
    font-size: 12px;
}
`;
document.head.appendChild(style);

console.log('✅ VibroPress AI initialized');