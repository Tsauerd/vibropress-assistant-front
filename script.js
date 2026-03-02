/**
 * VibroPress AI - Frontend Script
 * С рейтингом ответов и раскрывающимися источниками
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    API_URL: 'https://vibropress-assistant-backend.onrender.com',
    CHAT_ENDPOINT: '/chat',
    FEEDBACK_ENDPOINT: '/feedback',  // POST {message_id, rating, session_id, comment}
    
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
let messageCounter = 0;
let lastMessageId = null;  // ID сообщения от сервера для рейтинга

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
    console.log('Session:', sessionId);
});

function initializeChat() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('input', autoResizeTextarea);
    }
}

function initializeModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
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
    
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
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
        addBotResponse(response, message);
        saveChatMessage(message, response);
    } catch (error) {
        console.error('API Error:', error);
        removeTypingIndicator(loadingId);
        addMessageToUI('bot', `❌ Ошибка: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

async function sendToAPI(message) {
    const url = `${CONFIG.API_URL}${CONFIG.CHAT_ENDPOINT}`;
    
    // Формат из /docs: messages, use_rag, max_results, session_id
    const payload = {
        query: message,
        messages: [{ role: 'user', content: message }],
        use_rag: true,
        max_results: 5,
        session_id: sessionId,
        mode: currentMode
    };
    
    console.log('📤 Request:', payload);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📥 Response:', data);
    return data;
}

// ============================================================================
// FEEDBACK / RATING (формат из /docs)
// ============================================================================

async function submitRating(messageId, rating, comment = '') {
    try {
        // Формат из скриншота: {message_id, rating, session_id, comment}
        const payload = {
            message_id: messageId,
            rating: rating,
            session_id: sessionId,
            comment: comment
        };
        
        console.log('⭐ Отправляем оценку:', payload);
        
        const response = await fetch(`${CONFIG.API_URL}${CONFIG.FEEDBACK_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log('✅ Оценка сохранена');
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ Ошибка сохранения оценки:', errorText);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка отправки оценки:', error);
        return false;
    }
}

function handleRatingClick(button, messageId) {
    const rating = parseInt(button.dataset.rating);
    const container = button.closest('.rating-buttons');
    
    // Убираем selected у всех кнопок
    container.querySelectorAll('.rating-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Добавляем selected к нажатой
    button.classList.add('selected');
    
    // Отправляем на сервер
    submitRating(messageId, rating).then(success => {
        if (success) {
            // Показываем подтверждение
            const ratingContainer = button.closest('.rating-container');
            let thanks = ratingContainer.querySelector('.rating-thanks');
            if (!thanks) {
                thanks = document.createElement('span');
                thanks.className = 'rating-thanks';
                thanks.textContent = '✓ Спасибо!';
                ratingContainer.appendChild(thanks);
            }
        }
    });
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

function addBotResponse(response, userQuery) {
    const chatMessages = document.getElementById('chat-messages');
    
    // Получаем message_id из ответа сервера (если есть)
    const serverMessageId = response.message_id || response.id || response.request_id;
    const messageId = serverMessageId || ('msg_' + (++messageCounter) + '_' + Date.now());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.setAttribute('data-message-id', messageId);
    
    // Получаем текст ответа
    const answer = response.answer || response.response || response.content || 
                   response.text || response.message || JSON.stringify(response);
    
    let html = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            ${formatMessageContent(answer)}
    `;
    
    // Источники (раскрывающиеся)
    const sources = response.sources || response.chunks || response.documents || [];
    if (sources.length > 0) {
        html += renderCollapsibleSources(sources);
    }
    
    // Изображения
    if (response.images && response.images.length > 0) {
        html += renderImages(response.images);
    }
    
    // Entities
    if (response.entities && response.entities.length > 0) {
        html += renderEntities(response.entities);
    }
    
    // Рейтинг 0-5
    html += renderRating(messageId);
    
    html += `</div>`;
    
    messageDiv.innerHTML = html;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // Сохраняем последний message_id
    lastMessageId = messageId;
    
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

function renderRating(messageId) {
    return `
        <div class="rating-container">
            <span class="rating-label">Оцените ответ:</span>
            <div class="rating-buttons">
                ${[0, 1, 2, 3, 4, 5].map(num => `
                    <button class="rating-btn" 
                            data-rating="${num}" 
                            onclick="handleRatingClick(this, '${messageId}')"
                            title="${getRatingTitle(num)}">
                        ${num}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function getRatingTitle(rating) {
    const titles = {
        0: 'Совсем не помог',
        1: 'Очень плохо',
        2: 'Плохо',
        3: 'Удовлетворительно',
        4: 'Хорошо',
        5: 'Отлично!'
    };
    return titles[rating] || '';
}

function renderCollapsibleSources(sources) {
    const sourcesId = 'sources_' + (++messageCounter);
    
    // ID папки с ГОСТами (только эти файлы показываем с превью)
    const ALLOWED_FOLDER_ID = '18GV0KaL4Wy_1AGAyhEpVpBorFpX5wesj';
    
    let html = `
        <div class="sources-container">
            <button class="sources-toggle" onclick="toggleSources('${sourcesId}')">
                <span class="toggle-icon">▶</span>
                <span>📚 Источники (${sources.length})</span>
            </button>
            <div class="sources-content" id="${sourcesId}" style="display: none;">
    `;
    
    sources.forEach((source, index) => {
        let docName = source.document_name || source.doc_name || source.source || 
                        source.metadata?.source || source.title || `Источник ${index + 1}`;
        
        // Убираем расширения файлов (.pdf, .PDF, .doc, .docx и т.д.)
        const docNameClean = String(docName).replace(/\.(pdf|PDF|doc|docx|DOCX|xls|xlsx|ppt|pptx)$/i, '');
        
        const page = source.page_number || source.page || source.metadata?.page || '';
        const text = source.text || source.content || source.snippet || source.page_content || '';
        const score = source.score || source.similarity || source.relevance || '';
        const driveFileId = source.drive_file_id || source.file_id || '';
        const folderParentId = source.folder_parent_id || source.parent_folder_id || '';
        
        // Показываем кнопку "Открыть" ТОЛЬКО если файл из разрешённой папки
        const canOpen = driveFileId && folderParentId === ALLOWED_FOLDER_ID;
        
        html += `
            <div class="source-item">
                <div class="source-header">
                    <strong>${escapeHtml(docNameClean)}</strong>
                    ${page ? `<span class="source-page">стр. ${page}</span>` : ''}
                    ${score ? `<span class="source-score">${(parseFloat(score) * 100).toFixed(0)}%</span>` : ''}
                    ${canOpen ? `<button class="source-open-btn" onclick="openPdfPreview('${driveFileId || ''}', '${escapeHtml(docNameClean)}', ${page || 1}, '${escapeHtml(String(docName))}')">📄 Открыть</button>` : ''}
                </div>
                ${text ? `<p class="source-text">${escapeHtml(String(text).substring(0, 350))}${text.length > 350 ? '...' : ''}</p>` : ''}
            </div>
        `;
    });
    
    html += `</div></div>`;
    return html;
}

function toggleSources(sourcesId) {
    const content = document.getElementById(sourcesId);
    const toggle = content.previousElementSibling;
    const icon = toggle.querySelector('.toggle-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
        toggle.classList.add('expanded');
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
        toggle.classList.remove('expanded');
    }
}

function renderImages(images) {
    let html = `
        <div class="message-images">
            <div class="images-title">📷 Изображения из документов</div>
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

function formatMessageContent(content) {
    if (!content) return '';
    
    let formatted = escapeHtml(content);
    
    // Markdown
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
            const listItems = items.map(item => `<li>${item.replace(/^[\s]*[-•*]\s*/, '')}</li>`).join('');
            return `<ul>${listItems}</ul>`;
        }
        if (p.match(/^[\s]*\d+[.)]\s/m)) {
            const items = p.split(/\n/).filter(line => line.trim());
            const listItems = items.map(item => `<li>${item.replace(/^[\s]*\d+[.)]\s*/, '')}</li>`).join('');
            return `<ol>${listItems}</ol>`;
        }
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');
    
    return formatted;
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
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function updateExampleQuestions() {
    const container = document.getElementById('example-questions');
    if (!container) return;
    
    const examples = CONFIG.modes[currentMode].examples;
    container.innerHTML = examples.map(q => 
        `<button class="example-question" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button>`
    ).join('');
    
    // Добавляем обработчики кликов
    container.querySelectorAll('.example-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const question = btn.dataset.question;
            document.getElementById('chat-input').value = question;
            sendMessage();
        });
    });
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function autoResizeTextarea() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
}

function setLoading(loading) {
    isLoading = loading;
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    if (sendBtn) sendBtn.disabled = loading;
    if (chatInput) chatInput.disabled = loading;
}

function askQuestion(question) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.value = question;
        sendMessage();
    }
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
        botResponse: botResponse.answer || botResponse.response || ''
    };
    
    chatHistory.push(entry);
    
    try {
        const saved = JSON.parse(localStorage.getItem('vibropress_history') || '[]');
        saved.push(entry);
        if (saved.length > 50) saved.shift();
        localStorage.setItem('vibropress_history', JSON.stringify(saved));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            try {
                localStorage.removeItem('vibropress_history');
                localStorage.setItem('vibropress_history', JSON.stringify([entry]));
            } catch (_) {}
        }
    }
    
    updateChatHistoryUI();
}

function loadChatHistory() {
    try {
        chatHistory = JSON.parse(localStorage.getItem('vibropress_history') || '[]');
        updateChatHistoryUI();
    } catch (e) {
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
    
    let html = '';
    [...chatHistory].reverse().forEach(entry => {
        const preview = entry.userMessage.substring(0, 50) + (entry.userMessage.length > 50 ? '...' : '');
        const date = new Date(entry.timestamp).toLocaleDateString('ru-RU');
        const time = new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="chat-history-item" onclick="loadChatEntry(${entry.id})">
                <div class="chat-item-title">${escapeHtml(preview)}</div>
                <div class="chat-item-meta">
                    <span>${date} ${time}</span>
                    <span>${CONFIG.modes[entry.mode]?.name || entry.mode}</span>
                </div>
                <button class="chat-item-delete" onclick="event.stopPropagation(); deleteChatEntry(${entry.id})">🗑️</button>
            </div>
        `;
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
    } catch (e) {}
    updateChatHistoryUI();
}

function clearHistory() {
    if (!confirm('Очистить всю историю?')) return;
    chatHistory = [];
    localStorage.removeItem('vibropress_history');
    updateChatHistoryUI();
}

function newChat() {
    sessionId = generateSessionId();
    messageCounter = 0;
    
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <p>Здравствуйте! Я <strong>VibroPress AI</strong> — ваш интеллектуальный помощник.</p>
                    <p>Выберите режим работы и задайте вопрос.</p>
                </div>
            </div>
        `;
    }
    
    const sidebar = document.getElementById('chat-history-sidebar');
    if (sidebar?.classList.contains('open')) toggleChatHistory();
}

function toggleChatHistory() {
    document.getElementById('chat-history-sidebar')?.classList.toggle('open');
    document.getElementById('chat-history-overlay')?.classList.toggle('active');
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

// ============================================================================
// PDF PREVIEW MODAL
// ============================================================================

/**
 * Открывает PDF в модальном окне
 * @param {string} driveFileId - Google Drive file ID (может быть пустым)
 * @param {string} docName - Название документа (без расширения)
 * @param {number} page - Номер страницы
 * @param {string} originalFileName - Оригинальное имя файла с расширением
 */
function openPdfPreview(driveFileId, docName, page = 1, originalFileName = '') {
    const modal = document.getElementById("pdf-modal");
    const iframe = document.getElementById("pdf-iframe");
    const title = document.getElementById("pdf-modal-title");
    
    if (!modal || !iframe || !title) {
        console.error("PDF modal elements not found");
        return;
    }
    
    // Устанавливаем заголовок (без расширения)
    title.textContent = `${docName} — стр. ${page}`;
    
    // Если есть drive_file_id - показываем ОДНУ страницу через PDF.js
    if (driveFileId && driveFileId.trim() !== '') {
        // PDF.js viewer с Google Drive файлом
        // Формат: viewer.html?file=URL#page=N
        const googleDriveDirectUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
        const pdfJsUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(googleDriveDirectUrl)}#page=${page}`;
        
        iframe.src = pdfJsUrl;
        
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
        
        console.log(`📄 Opening PDF page ${page}: ${docName}`);
        return;
    }
    
    // FALLBACK: Если нет drive_file_id - пытаемся получить его через backend
    console.log(`⚠️ No drive_file_id, fetching from backend: ${originalFileName}`);
    
    // Показываем модальное окно с индикатором загрузки
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    iframe.style.display = '';
    iframe.parentElement.querySelectorAll('.pdf-error').forEach(el => el.remove());
    iframe.src = ''; // Очищаем iframe
    
    // Показываем loading
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'pdf-loading';
    loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Поиск документа...</p>
    `;
    iframe.parentElement.appendChild(loadingDiv);
    
    // Запрос к backend для получения drive_file_id по имени файла
    fetch(`${CONFIG.API_URL}/get-file-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: originalFileName || docName
        })
    })
    .then(response => response.json())
    .then(data => {
        loadingDiv.remove();
        
        if (data.drive_file_id) {
            const pdfUrl = `https://drive.google.com/file/d/${data.drive_file_id}/preview`;
            iframe.src = pdfUrl;
            console.log(`✅ Got drive_file_id from backend: ${data.drive_file_id}`);
        } else {
            // Если backend тоже не нашел - показываем ошибку
            const errDiv = document.createElement('div');
            errDiv.className = 'pdf-error';
            errDiv.innerHTML = `<p>❌ Не удалось загрузить документ</p><p class="pdf-error-details">Файл: ${escapeHtml(docName)}</p><button class="btn-primary-small" onclick="closePdfModal()">Закрыть</button>`;
            iframe.style.display = 'none';
            iframe.parentElement.appendChild(errDiv);
        }
    })
    .catch(error => {
        loadingDiv.remove();
        console.error('Error fetching PDF URL:', error);

        const errDiv = document.createElement('div');
        errDiv.className = 'pdf-error';
        errDiv.innerHTML = `<p>❌ Ошибка загрузки документа</p><button class="btn-primary-small" onclick="closePdfModal()">Закрыть</button>`;
        iframe.style.display = 'none';
        iframe.parentElement.appendChild(errDiv);
    });
}

/**
 * Закрывает модальное окно PDF
 */
function closePdfModal() {
    const modal = document.getElementById("pdf-modal");
    const iframe = document.getElementById("pdf-iframe");
    
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
    
    if (iframe) {
        iframe.src = "";
        iframe.style.display = '';
        iframe.parentElement.querySelectorAll('.pdf-error').forEach(el => el.remove());
    }
}

// Закрытие по Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const modal = document.getElementById("pdf-modal");
        if (modal && modal.classList.contains("active")) {
            closePdfModal();
        }
    }
});
