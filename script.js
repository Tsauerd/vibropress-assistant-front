/**
 * VibroPress AI - Frontend Script
 * Интерактивный чат-бот для производства вибропрессованных изделий
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // API URL - ваш backend на Render
    API_URL: 'https://vibropress-assistant-backend.onrender.com',
    
    // Правильный endpoint (из /docs)
    CHAT_ENDPOINT: '/chat',
    
    // Режимы работы и примеры вопросов
    modes: {
        gost: {
            name: 'ГОСТ/СП',
            examples: [
                'Какие требования к морозостойкости тротуарной плитки?',
                'Допуски по размерам для бордюрного камня',
                'Марки бетона для вибропрессованных изделий'
            ]
        },
        equipment: {
            name: 'Оборудование',
            examples: [
                'Как настроить вибропресс для производства плитки?',
                'Типичные ошибки при работе с Hess',
                'Параметры вибрации для тротуарной плитки'
            ]
        },
        defects: {
            name: 'Претензии',
            examples: [
                'Плитка крошится после зимы — в чем причина?',
                'Клиент жалуется на неравномерный цвет',
                'Появились трещины на бордюрах'
            ]
        },
        recipes: {
            name: 'Рецептуры',
            examples: [
                'Состав бетона для плитки М300',
                'Какие добавки повышают морозостойкость?',
                'Оптимальное В/Ц для вибропрессования'
            ]
        }
    }
};

// ============================================================================
// STATE
// ============================================================================

let currentMode = 'gost';
let sessionId = generateSessionId();
let isLoading = false;
let chatHistory = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeChat();
    initializeModeButtons();
    initializeInputHandlers();
    loadChatHistory();
    updateExampleQuestions();
    
    console.log('✅ VibroPress AI initialized');
    console.log('API URL:', CONFIG.API_URL);
    console.log('Chat endpoint:', CONFIG.CHAT_ENDPOINT);
});

function initializeChat() {
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    
    if (!chatMessages || !chatInput) {
        console.error('Chat elements not found');
        return;
    }
    
    chatInput.addEventListener('input', autoResizeTextarea);
}

function initializeModeButtons() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            document.getElementById('current-mode').textContent = CONFIG.modes[currentMode].name;
            updateExampleQuestions();
        });
    });
}

function initializeInputHandlers() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    sendBtn.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// ============================================================================
// MESSAGING
// ============================================================================

async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message || isLoading) return;
    
    addMessageToUI('user', message);
    chatInput.value = '';
    autoResizeTextarea.call(chatInput);
    
    setLoading(true);
    const loadingId = showTypingIndicator();
    
    try {
        const response = await sendToAPI(message);
        removeTypingIndicator(loadingId);
        addBotResponse(response);
        saveChatMessage(message, response);
        
    } catch (error) {
        console.error('API Error:', error);
        removeTypingIndicator(loadingId);
        addMessageToUI('bot', `❌ Ошибка: ${error.message}\n\n💡 Проверьте консоль браузера (F12) для деталей.`);
    } finally {
        setLoading(false);
    }
}

async function sendToAPI(message) {
    const url = `${CONFIG.API_URL}${CONFIG.CHAT_ENDPOINT}`;
    
    // Пробуем разные форматы payload
    const payloads = [
        // Формат 1: query + session_id (наиболее вероятный)
        {
            query: message,
            session_id: sessionId,
            task_type: currentMode
        },
        // Формат 2: message
        {
            message: message,
            session_id: sessionId
        },
        // Формат 3: question
        {
            question: message,
            session_id: sessionId
        },
        // Формат 4: text
        {
            text: message,
            session_id: sessionId
        },
        // Формат 5: messages array (OpenAI style)
        {
            messages: [{ role: 'user', content: message }],
            session_id: sessionId
        }
    ];
    
    let lastError = null;
    
    for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        
        try {
            console.log(`🔄 Пробуем формат ${i + 1}:`, payload);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log(`Response status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Успешный ответ:', data);
                return data;
            }
            
            // 422 = неправильный формат, пробуем следующий
            if (response.status === 422) {
                const errorData = await response.json().catch(() => ({}));
                console.log(`❌ Формат ${i + 1} не подошёл (422):`, errorData);
                lastError = new Error(`Неверный формат запроса: ${JSON.stringify(errorData)}`);
                continue;
            }
            
            // Другие ошибки
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
            
        } catch (fetchError) {
            console.log(`❌ Формат ${i + 1} ошибка:`, fetchError.message);
            lastError = fetchError;
            
            // Если это не 422, прерываем цикл
            if (!fetchError.message.includes('422') && !fetchError.message.includes('Неверный формат')) {
                throw fetchError;
            }
        }
    }
    
    throw lastError || new Error('Не удалось отправить запрос');
}

// ============================================================================
// UI RENDERING
// ============================================================================

function addMessageToUI(role, content) {
    const chatMessages = document.getElementById('chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const avatar = role === 'user' ? '👤' : '🤖';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${formatMessageContent(content)}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addBotResponse(response) {
    const chatMessages = document.getElementById('chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    // Пробуем разные поля для ответа
    const answer = response.answer || response.response || response.content || 
                   response.text || response.message || response.result || 
                   (typeof response === 'string' ? response : JSON.stringify(response));
    
    let html = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            ${formatMessageContent(answer)}
    `;
    
    // Sources
    if (response.sources && response.sources.length > 0) {
        html += renderSources(response.sources);
    }
    
    // Chunks (альтернативное название для sources)
    if (response.chunks && response.chunks.length > 0) {
        html += renderSources(response.chunks);
    }
    
    // Images
    if (response.images && response.images.length > 0) {
        html += renderImages(response.images);
    }
    
    // Entities
    if (response.entities && response.entities.length > 0) {
        html += renderEntities(response.entities);
    }
    
    // Complaint badge
    if (response.is_complaint || currentMode === 'defects') {
        html += `<div class="message-meta">
            <span class="complaint-badge">Работа с претензией</span>
        </div>`;
    }
    
    html += `</div>`;
    
    messageDiv.innerHTML = html;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // KaTeX
    if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(messageDiv, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
}

function formatMessageContent(content) {
    if (!content) return '';
    
    let formatted = escapeHtml(content);
    
    // Markdown formatting
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Paragraphs
    const paragraphs = formatted.split(/\n\n+/);
    formatted = paragraphs.map(p => {
        if (p.match(/^[\s]*[-•*]\s/m)) {
            const items = p.split(/\n/).filter(line => line.trim());
            const listItems = items.map(item => {
                const text = item.replace(/^[\s]*[-•*]\s*/, '');
                return `<li>${text}</li>`;
            }).join('');
            return `<ul>${listItems}</ul>`;
        }
        
        if (p.match(/^[\s]*\d+[.)]\s/m)) {
            const items = p.split(/\n/).filter(line => line.trim());
            const listItems = items.map(item => {
                const text = item.replace(/^[\s]*\d+[.)]\s*/, '');
                return `<li>${text}</li>`;
            }).join('');
            return `<ol>${listItems}</ol>`;
        }
        
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');
    
    return formatted;
}

function renderSources(sources) {
    let html = `<div class="sources"><h4>Источники</h4>`;
    
    sources.forEach(source => {
        const docName = source.document_name || source.doc_name || source.source || 
                        source.metadata?.source || source.title || 'Документ';
        const page = source.page_number || source.page || source.metadata?.page || '';
        const text = source.text || source.content || source.snippet || source.page_content || '';
        
        html += `
            <div class="source-item">
                <strong>${escapeHtml(docName)}</strong>
                ${page ? `<span> • стр. ${page}</span>` : ''}
                ${text ? `<p>${escapeHtml(text.substring(0, 250))}${text.length > 250 ? '...' : ''}</p>` : ''}
            </div>
        `;
    });
    
    html += `</div>`;
    return html;
}

function renderImages(images) {
    let html = `
        <div class="message-images">
            <div class="images-title">Изображения из документов</div>
            <div class="images-grid">
    `;
    
    images.forEach((img, index) => {
        const imageData = img.image_data || img.data || img.base64;
        const mimeType = img.mime_type || 'image/png';
        const description = img.description || img.caption || `Изображение ${index + 1}`;
        const page = img.page_number || '';
        
        if (imageData) {
            html += `
                <div class="image-card" onclick="openLightbox('data:${mimeType};base64,${imageData}')">
                    <div class="image-wrapper">
                        <img src="data:${mimeType};base64,${imageData}" alt="${escapeHtml(description)}">
                    </div>
                    <div class="image-caption">
                        <div class="image-caption-text">${escapeHtml(description)}</div>
                        ${page ? `<div class="image-meta"><span>📄 стр. ${page}</span></div>` : ''}
                    </div>
                </div>
            `;
        }
    });
    
    html += `</div></div>`;
    return html;
}

function renderEntities(entities) {
    let html = `<div class="entities">`;
    entities.forEach(entity => {
        const text = typeof entity === 'string' ? entity : entity.text || entity.name;
        html += `<span class="entity-tag">${escapeHtml(text)}</span>`;
    });
    html += `</div>`;
    return html;
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const id = 'typing-' + Date.now();
    
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'message bot-message';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    
    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
}

function updateExampleQuestions() {
    const container = document.getElementById('example-questions');
    const examples = CONFIG.modes[currentMode].examples;
    
    container.innerHTML = examples.map(q => 
        `<button class="example-question" onclick="askQuestion('${escapeHtml(q)}')">${escapeHtml(q)}</button>`
    ).join('');
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function autoResizeTextarea() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
}

function setLoading(loading) {
    isLoading = loading;
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    
    sendBtn.disabled = loading;
    chatInput.disabled = loading;
}

function askQuestion(question) {
    const chatInput = document.getElementById('chat-input');
    chatInput.value = question;
    sendMessage();
}

// ============================================================================
// CHAT HISTORY
// ============================================================================

function saveChatMessage(userMessage, botResponse) {
    const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        mode: currentMode,
        userMessage: userMessage,
        botResponse: botResponse.answer || botResponse.response || botResponse.text || ''
    };
    
    chatHistory.push(entry);
    
    try {
        const saved = JSON.parse(localStorage.getItem('vibropress_history') || '[]');
        saved.push(entry);
        if (saved.length > 50) saved.shift();
        localStorage.setItem('vibropress_history', JSON.stringify(saved));
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
    
    updateChatHistoryUI();
}

function loadChatHistory() {
    try {
        chatHistory = JSON.parse(localStorage.getItem('vibropress_history') || '[]');
        updateChatHistoryUI();
    } catch (e) {
        console.warn('Could not load chat history:', e);
        chatHistory = [];
    }
}

function updateChatHistoryUI() {
    const container = document.getElementById('chat-history-list');
    if (!container) return;
    
    if (chatHistory.length === 0) {
        container.innerHTML = '<div class="empty-history">История пуста</div>';
        return;
    }
    
    const grouped = {};
    chatHistory.forEach(entry => {
        const date = new Date(entry.timestamp).toLocaleDateString('ru-RU');
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(entry);
    });
    
    let html = '';
    Object.keys(grouped).reverse().forEach(date => {
        grouped[date].reverse().forEach(entry => {
            const preview = entry.userMessage.substring(0, 50) + (entry.userMessage.length > 50 ? '...' : '');
            const time = new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const modeName = CONFIG.modes[entry.mode]?.name || entry.mode;
            
            html += `
                <div class="chat-history-item" onclick="loadChatEntry(${entry.id})">
                    <div class="chat-item-title">${escapeHtml(preview)}</div>
                    <div class="chat-item-meta">
                        <span>${date} ${time}</span>
                        <span>${modeName}</span>
                    </div>
                    <button class="chat-item-delete" onclick="event.stopPropagation(); deleteChatEntry(${entry.id})">🗑️</button>
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
}

function loadChatEntry(id) {
    const entry = chatHistory.find(e => e.id === id);
    if (!entry) return;
    
    if (entry.mode !== currentMode) {
        const btn = document.querySelector(`[data-mode="${entry.mode}"]`);
        if (btn) btn.click();
    }
    
    addMessageToUI('user', entry.userMessage);
    addMessageToUI('bot', entry.botResponse);
    
    toggleChatHistory();
}

function deleteChatEntry(id) {
    chatHistory = chatHistory.filter(e => e.id !== id);
    
    try {
        localStorage.setItem('vibropress_history', JSON.stringify(chatHistory));
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
    
    updateChatHistoryUI();
}

function clearHistory() {
    if (!confirm('Очистить всю историю чатов?')) return;
    
    chatHistory = [];
    localStorage.removeItem('vibropress_history');
    updateChatHistoryUI();
}

function newChat() {
    sessionId = generateSessionId();
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <p>Здравствуйте! Я <strong>VibroPress AI</strong> — ваш интеллектуальный помощник.</p>
                <p>Выберите режим работы выше и задайте вопрос. Я помогу найти информацию в базе знаний.</p>
            </div>
        </div>
    `;
    
    const sidebar = document.getElementById('chat-history-sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        toggleChatHistory();
    }
}

function toggleChatHistory() {
    const sidebar = document.getElementById('chat-history-sidebar');
    const overlay = document.getElementById('chat-history-overlay');
    
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

// ============================================================================
// LIGHTBOX
// ============================================================================

function openLightbox(imageSrc) {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    
    if (lightbox && lightboxImage) {
        lightboxImage.src = imageSrc;
        lightbox.classList.add('active');
        document.addEventListener('keydown', closeLightboxOnEscape);
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.removeEventListener('keydown', closeLightboxOnEscape);
    }
}

function closeLightboxOnEscape(e) {
    if (e.key === 'Escape') closeLightbox();
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('image-lightbox')) closeLightbox();
});