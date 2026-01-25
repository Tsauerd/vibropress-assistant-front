// =============================================================================
// VIBROPRESS AI - УЛУЧШЕННЫЙ FRONTEND SCRIPT
// С поддержкой изображений, lightbox и улучшенного форматирования
// =============================================================================

const API_URL = 'https://vibropress-assistant-backend.onrender.com'; // Замените на ваш URL

// Конфигурация режимов
const MODES = {
    gost: {
        name: 'ГОСТ/СП',
        icon: '📋',
        examples: [
            'Какие требования к истираемости тротуарной плитки?',
            'Прочность бетона М300 по ГОСТ',
            'Морозостойкость бордюрного камня'
        ],
        taskType: 'norm'
    },
    equipment: {
        name: 'Оборудование',
        icon: '⚙️',
        examples: [
            'Настройка вибростола для плитки',
            'Режимы работы вибропресса',
            'Диагностика неисправностей'
        ],
        taskType: 'equipment'
    },
    defects: {
        name: 'Претензии',
        icon: '🔍',
        examples: [
            'Почему плитка крошится?',
            'Высолы на бетонных изделиях',
            'Трещины в бордюрах - причины'
        ],
        taskType: 'defects'
    },
    recipes: {
        name: 'Рецептуры',
        icon: '🧪',
        examples: [
            'Состав бетона для тротуарной плитки',
            'Водоцементное отношение для М400',
            'Добавки для морозостойкости'
        ],
        taskType: 'recipes'
    }
};

let currentMode = 'gost';
let isLoading = false;
let currentSessionId = null;

// =============================================================================
// ИНИЦИАЛИЗАЦИЯ
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initModeButtons();
    initChatInput();
    initExampleQuestions();
    initLightbox();
    
    // Создаем новую сессию
    currentSessionId = generateSessionId();
});

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// =============================================================================
// ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ
// =============================================================================

function initModeButtons() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем active у всех
            modeButtons.forEach(b => b.classList.remove('active'));
            // Добавляем active к текущей
            btn.classList.add('active');
            
            // Меняем режим
            const mode = btn.dataset.mode;
            currentMode = mode;
            
            // Обновляем UI
            document.getElementById('current-mode').textContent = MODES[mode].name;
            updateExampleQuestions();
        });
    });
}

function updateExampleQuestions() {
    const container = document.getElementById('example-questions');
    const examples = MODES[currentMode].examples;
    
    container.innerHTML = examples.map(q => 
        `<button class="example-question" onclick="askQuestion('${q.replace(/'/g, "\\'")}')">
            ${q}
        </button>`
    ).join('');
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
    
    // Автоматическое изменение высоты textarea
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    });
    
    // Enter для отправки (Shift+Enter для новой строки)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    sendBtn.addEventListener('click', sendMessage);
}

async function sendMessage() {
    if (isLoading) return;
    
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Добавляем сообщение пользователя
    addMessage('user', message);
    
    // Очищаем input
    input.value = '';
    input.style.height = 'auto';
    
    // Показываем индикатор загрузки
    isLoading = true;
    updateSendButton(true);
    const loadingId = addLoadingMessage();
    
    try {
        // Отправляем запрос к API
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: message,
                task_type: MODES[currentMode].taskType,
                session_id: currentSessionId
            })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка сервера');
        }
        
        const data = await response.json();
        
        // Удаляем индикатор загрузки
        removeMessage(loadingId);
        
        // Добавляем ответ бота
        addBotResponse(data);
        
    } catch (error) {
        console.error('Ошибка:', error);
        removeMessage(loadingId);
        addMessage('bot', 'Произошла ошибка. Попробуйте еще раз.');
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
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"/>
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
                <p>${escapeHtml(text)}</p>
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
    const messageId = 'msg_' + Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.id = messageId;
    
    // Форматируем текст ответа
    const formattedAnswer = formatAnswer(data.answer);
    
    let html = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            ${formattedAnswer}
    `;
    
    // НОВОЕ: Добавляем изображения если они есть
    if (data.images && data.images.length > 0) {
        html += renderImages(data.images);
    }
    
    // Добавляем источники
    if (data.context_used && data.context_used.length > 0) {
        html += renderSources(data.context_used);
    }
    
    // Добавляем метаданные
    html += renderMetadata(data);
    
    html += `</div>`;
    
    messageDiv.innerHTML = html;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    // Инициализируем lightbox для изображений
    initImageClickHandlers(messageDiv);
}

// =============================================================================
// ФОРМАТИРОВАНИЕ ОТВЕТА
// =============================================================================

function formatAnswer(text) {
    // Экранируем HTML
    text = escapeHtml(text);
    
    // Форматируем жирный текст **текст**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Форматируем код `код`
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Форматируем заголовки ### Заголовок
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    
    // Форматируем списки
    text = formatLists(text);
    
    // Форматируем таблицы
    text = formatTables(text);
    
    // Форматируем параграфы
    text = text.split('\n\n').map(p => {
        if (p.trim() && !p.startsWith('<')) {
            return `<p>${p.trim()}</p>`;
        }
        return p;
    }).join('\n');
    
    return text;
}

function formatLists(text) {
    // Нумерованные списки
    text = text.replace(/^(\d+\.\s+.+)(\n\d+\.\s+.+)*/gm, (match) => {
        const items = match.split('\n').map(item => {
            const content = item.replace(/^\d+\.\s+/, '');
            return `<li>${content}</li>`;
        }).join('\n');
        return `<ol>${items}</ol>`;
    });
    
    // Маркированные списки
    text = text.replace(/^(-|\*)\s+.+(\n(-|\*)\s+.+)*/gm, (match) => {
        const items = match.split('\n').map(item => {
            const content = item.replace(/^(-|\*)\s+/, '');
            return `<li>${content}</li>`;
        }).join('\n');
        return `<ul>${items}</ul>`;
    });
    
    return text;
}

function formatTables(text) {
    // Простое форматирование таблиц в Markdown стиле
    const tableRegex = /(\|.+\|[\s\n]*)+/g;
    
    text = text.replace(tableRegex, (match) => {
        const rows = match.trim().split('\n').filter(row => !row.match(/^[\s|:-]+$/));
        
        if (rows.length < 2) return match;
        
        const headerRow = rows[0].split('|').filter(c => c.trim()).map(c => c.trim());
        const dataRows = rows.slice(1).map(row => 
            row.split('|').filter(c => c.trim()).map(c => c.trim())
        );
        
        let table = '<table><thead><tr>';
        headerRow.forEach(cell => {
            table += `<th>${cell}</th>`;
        });
        table += '</tr></thead><tbody>';
        
        dataRows.forEach(row => {
            table += '<tr>';
            row.forEach(cell => {
                table += `<td>${cell}</td>`;
            });
            table += '</tr>';
        });
        
        table += '</tbody></table>';
        return table;
    });
    
    return text;
}

// =============================================================================
// РЕНДЕРИНГ ИЗОБРАЖЕНИЙ
// =============================================================================

function renderImages(images) {
    if (!images || images.length === 0) return '';
    
    let html = `
        <div class="message-images">
            <div class="images-title">Изображения из документации:</div>
            <div class="images-grid">
    `;
    
    images.forEach((img, index) => {
        const imageData = img.image_data.startsWith('data:') 
            ? img.image_data 
            : `data:${img.image_type};base64,${img.image_data}`;
        
        html += `
            <div class="image-card" data-image-index="${index}">
                <div class="image-wrapper">
                    <img src="${imageData}" alt="${img.caption || 'Изображение из документа'}" loading="lazy">
                </div>
                <div class="image-caption">
                    ${img.caption ? `<div class="image-caption-text">${escapeHtml(img.caption)}</div>` : ''}
                    <div class="image-meta">
                        ${img.source ? `<span>📄 ${escapeHtml(img.source)}</span>` : ''}
                        ${img.page_number ? `<span>📖 Стр. ${img.page_number}</span>` : ''}
                        ${img.section ? `<span>📑 ${escapeHtml(img.section)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// =============================================================================
// LIGHTBOX ДЛЯ ИЗОБРАЖЕНИЙ
// =============================================================================

function initLightbox() {
    // Создаем lightbox элемент
    const lightbox = document.createElement('div');
    lightbox.className = 'image-lightbox';
    lightbox.id = 'image-lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close" onclick="closeLightbox()">×</button>
            <img src="" alt="Увеличенное изображение">
        </div>
    `;
    document.body.appendChild(lightbox);
    
    // Закрытие по клику на фон
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
}

function initImageClickHandlers(messageDiv) {
    const imageCards = messageDiv.querySelectorAll('.image-card');
    
    imageCards.forEach(card => {
        card.addEventListener('click', () => {
            const img = card.querySelector('img');
            openLightbox(img.src);
        });
    });
}

function openLightbox(imageSrc) {
    const lightbox = document.getElementById('image-lightbox');
    const img = lightbox.querySelector('img');
    
    img.src = imageSrc;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// =============================================================================
// РЕНДЕРИНГ ИСТОЧНИКОВ
// =============================================================================

function renderSources(sources) {
    if (!sources || sources.length === 0) return '';
    
    let html = `
        <div class="sources">
            <h4>Использованные источники:</h4>
    `;
    
    sources.slice(0, 3).forEach((source, index) => {
        // Извлекаем первые 150 символов
        const preview = source.length > 150 ? source.substring(0, 150) + '...' : source;
        
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

// =============================================================================
// РЕНДЕРИНГ МЕТАДАННЫХ
// =============================================================================

function renderMetadata(data) {
    let html = '<div class="message-meta">';
    
    if (data.reasoning_effort_used === 'high') {
        html += '<span class="complaint-badge">Режим претензии</span>';
    }
    
    if (data.model_used) {
        html += `<span class="model-badge">${data.model_used}</span>`;
    }
    
    html += '</div>';
    return html;
}

// =============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function newChat() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <p>Здравствуйте! Я VibroPress AI.</p>
                <p>Выберите режим работы и задайте вопрос. Я помогу найти информацию в базе знаний.</p>
            </div>
        </div>
    `;
    currentSessionId = generateSessionId();
}

// =============================================================================
// CSS ДЛЯ АНИМАЦИИ ЗАГРУЗКИ
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
    background: var(--primary);
    animation: bounce 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) {
    animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
    animation-delay: -0.16s;
}

@keyframes bounce {
    0%, 80%, 100% {
        transform: scale(0);
    }
    40% {
        transform: scale(1);
    }
}

.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
`;
document.head.appendChild(style);