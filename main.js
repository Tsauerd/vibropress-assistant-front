import { CONFIG } from "./config.js";
import {
    sendToAPI as sendToAPIModule,
    sendFeedback,
    improveAnswer as improveAnswerModule,
    sendImproveFeedback as sendImproveFeedbackModule,
} from "./api.js";
import {
    sendMessage as sendMessageModule,
    addBotResponse as addBotResponseModule,
    addMessageToUI as addMessageToUIModule,
} from "./chat.js";
import {
    initializeModeButtons as initializeModeButtonsModule,
    updateExampleQuestions as updateExampleQuestionsModule,
    showTypingIndicator as showTypingIndicatorModule,
} from "./ui.js";
import {
    saveChatMessage as saveChatMessageModule,
    loadChatHistory as loadChatHistoryModule,
    clearChat,
} from "./storage.js";
/**
 * Строительный помощник AI - Frontend Script
 * С рейтингом ответов и раскрывающимися источниками
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// CONFIG is imported from config.js

// ============================================================================
// STATE
// ============================================================================

let currentMode = 'auto';
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
    
    console.log('✅ Строительный помощник AI initialized');
    console.log('Session:', sessionId);
});

function initializeChat() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('input', autoResizeTextarea);
    }
}

function initializeModeButtons() {
    initializeModeButtonsModule({
        config: CONFIG,
        getCurrentMode: () => currentMode,
        setCurrentMode: (mode) => {
            currentMode = mode;
        },
        onModeChanged: () => updateExampleQuestions(),
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
    return sendMessageModule({
        state: {
            get isLoading() {
                return isLoading;
            },
        },
        sendToAPI,
        addMessageToUI,
        addBotResponse,
        saveChatMessage,
        autoResizeTextarea,
        setLoading,
        showTypingIndicator,
        removeTypingIndicator,
    });
}

async function sendToAPI(message) {
    return sendToAPIModule({
        config: CONFIG,
        message,
        sessionId: sessionId,
        mode: null,
    });
}
// FEEDBACK / RATING (формат из /docs)
// ============================================================================

async function submitRating(messageId, rating, comment = '') {
    const ok = await sendFeedback({
        config: CONFIG,
        messageId,
        rating,
        sessionId,
        comment,
    });

    if (!ok) {
        console.error("Feedback save failed");
    }
    return ok;
}

async function submitImproveAnswer(messageId) {
    return improveAnswerModule({
        config: CONFIG,
        messageId,
        sessionId,
    });
}

async function submitImproveFeedback(messageId, liked) {
    return sendImproveFeedbackModule({
        config: CONFIG,
        messageId,
        sessionId,
        liked,
    });
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

function finalizeImproveFeedback(container, text, liked) {
    if (!container) return;
    container.querySelectorAll('.improve-feedback-btn').forEach(btn => {
        btn.disabled = true;
        btn.classList.toggle('selected', btn.dataset.liked === String(liked));
    });
    let thanks = container.querySelector('.improve-feedback-thanks');
    if (!thanks) {
        thanks = document.createElement('div');
        thanks.className = 'improve-feedback-thanks';
        container.appendChild(thanks);
    }
    thanks.textContent = text;
}

async function handleImproveFeedbackClick(button, messageId, liked) {
    const container = button.closest('.improve-feedback-container');
    if (!container) return;
    container.querySelectorAll('.improve-feedback-btn').forEach(btn => {
        btn.disabled = true;
        btn.classList.remove('selected');
    });
    button.classList.add('selected');

    try {
        const result = await submitImproveFeedback(messageId, liked);
        finalizeImproveFeedback(container, result.message || 'Спасибо за ответ.', liked);
    } catch (error) {
        console.error('Improve feedback save failed:', error);
        container.querySelectorAll('.improve-feedback-btn').forEach(btn => {
            btn.disabled = false;
        });
    }
}

// ============================================================================
// UI RENDERING
// ============================================================================

function addMessageToUI(role, content) {
    return addMessageToUIModule({
        role,
        content,
        sanitizeHtml,
        formatMessageContent,
        scrollToBottom,
    });
}

function addBotResponse(response, userQuery) {
    return addBotResponseModule({
        response,
        userQuery,
        counters: {
            get messageCounter() {
                return messageCounter;
            },
            set messageCounter(v) {
                messageCounter = v;
            },
        },
        setLastMessageId: (id) => {
            lastMessageId = id;
        },
        formatMessageContent,
        renderCollapsibleSources,
        renderImages,
        renderEntities,
        renderRating: (messageId) => renderRating(messageId, response),
        sanitizeHtml,
        bindDynamicMessageActions,
        scrollToBottom,
    });
}

function renderRating(messageId, response = {}) {
    const safeMessageId = escapeHtml(String(messageId));
    const improveEnabled = Boolean(response?.improve_enabled);
    const feedbackType = String(response?.feedback_type || '').toLowerCase();

    if (feedbackType === 'improved_binary') {
        return `
            <div class="rating-container improve-feedback-container">
                <span class="rating-label">Ответ устроил?</span>
                <div class="improve-feedback-buttons">
                    <button class="improve-feedback-btn" data-liked="true" data-message-id="${safeMessageId}">
                        Да
                    </button>
                    <button class="improve-feedback-btn" data-liked="false" data-message-id="${safeMessageId}">
                        Нет
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="rating-container">
            <span class="rating-label">Оцените ответ:</span>
            <div class="rating-buttons">
                ${[0, 1, 2, 3, 4, 5].map(num => `
                    <button class="rating-btn" 
                            data-rating="${num}" 
                            data-message-id="${safeMessageId}"
                            title="${getRatingTitle(num)}">
                        ${num}
                    </button>
                `).join('')}
            </div>
            ${improveEnabled ? `
                <button class="improve-btn" data-message-id="${safeMessageId}" title="Запросить улучшенную версию ответа">
                    Улучшить ответ
                </button>
            ` : ''}
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

function renderEntities(entities) {
    let html = `<div class="entities">`;
    entities.forEach(entity => {
        const text = typeof entity === 'string' ? entity : entity.text || entity.name;
        html += `<span class="entity-tag">${escapeHtml(text)}</span>`;
    });
    html += `</div>`;
    return html;
}

// Safe overrides for API-rendered blocks (avoid inline event handlers).
function renderCollapsibleSources(sources) {
    const sourcesId = 'sources_' + (++messageCounter);

    let html = `
        <div class="sources-container">
            <button class="sources-toggle" data-sources-id="${escapeHtml(sourcesId)}">
                <span class="toggle-icon">▶</span>
                <span>📚 Источники (${sources.length})</span>
            </button>
            <div class="sources-content" id="${escapeHtml(sourcesId)}" hidden>
    `;

    sources.forEach((source, index) => {
        const rawDocName = source.document_name || source.doc_name || source.source ||
            source.metadata?.source || source.title || `Источник ${index + 1}`;
        const docName = String(rawDocName).replace(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i, '');

        html += `
            <div class="source-item">
                <div class="source-header">
                    <strong>${escapeHtml(docName.trim())}</strong>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    return html;
}

function toggleSources(sourcesId) {
    const content = document.getElementById(sourcesId);
    if (!content) return;

    const toggle = content.previousElementSibling;
    if (!toggle) return;

    const icon = toggle.querySelector('.toggle-icon');
    if (!icon) return;

    if (content.hasAttribute('hidden')) {
        content.removeAttribute('hidden');
        icon.textContent = '▼';
        toggle.classList.add('expanded');
    } else {
        content.setAttribute('hidden', '');
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
        const imageDataRaw = img.image_data || img.data || img.base64;
        const mimeType = sanitizeMimeType(img.mime_type || 'image/png');
        const description = String(img.description || img.caption || `Изображение ${index + 1}`);
        const pageNum = Number.parseInt(String(img.page_number || ''), 10);
        const safePage = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : null;

        if (!imageDataRaw) return;

        const imageData = String(imageDataRaw).replace(/\s+/g, '');
        if (!isSafeBase64(imageData)) return;

        const imageSrc = `data:${mimeType};base64,${imageData}`;
        html += `
            <div class="image-card" data-image-src="${escapeHtml(imageSrc)}">
                <div class="image-wrapper">
                    <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(description)}">
                </div>
                <div class="image-caption">
                    <div class="image-caption-text">${escapeHtml(description)}</div>
                    ${safePage ? `<div class="image-meta"><span>📄 стр. ${safePage}</span></div>` : ''}
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
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
    return showTypingIndicatorModule({ scrollToBottom });
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function updateExampleQuestions() {
    return updateExampleQuestionsModule({
        config: CONFIG,
        currentMode,
        sanitizeHtml,
        escapeHtml,
        onQuestionSelected: (question) => {
            const input = document.getElementById("chat-input");
            if (!input) return;
            input.value = question;
            sendMessage();
        },
    });
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function sanitizeHtml(html) {
    if (typeof html !== 'string') return '';
    if (typeof DOMPurify === 'undefined') return html;

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div', 'span', 'strong', 'p', 'button', 'ul', 'ol', 'li', 'br', 'code', 'em', 'img'],
        ALLOWED_ATTR: [
            'class',
            'id',
            'title',
            'hidden',
            'src',
            'alt',
            'data-question',
            'data-message-id',
            'data-rating',
            'data-sources-id',
            'data-drive-file-id',
            'data-doc-name',
            'data-page',
            'data-original-file-name',
            'data-image-src',
        ],
    });
}

function sanitizeMimeType(mimeType) {
    const value = String(mimeType || '').toLowerCase().trim();
    if (/^image\/(png|jpe?g|gif|webp|bmp|svg\+xml)$/.test(value)) return value;
    return 'image/png';
}

function isSafeBase64(value) {
    if (!value) return false;
    return /^[A-Za-z0-9+/=]+$/.test(value);
}

function bindDynamicMessageActions(root) {
    if (!root) return;

    root.querySelectorAll('.rating-btn[data-message-id]').forEach(button => {
        if (button.dataset.boundClick === '1') return;
        button.dataset.boundClick = '1';
        button.addEventListener('click', () => {
            const messageId = button.dataset.messageId || '';
            if (!messageId) return;
            handleRatingClick(button, messageId);
        });
    });

    root.querySelectorAll('.sources-toggle[data-sources-id]').forEach(button => {
        if (button.dataset.boundClick === '1') return;
        button.dataset.boundClick = '1';
        button.addEventListener('click', () => {
            const sourcesId = button.dataset.sourcesId || '';
            if (!sourcesId) return;
            toggleSources(sourcesId);
        });
    });

    root.querySelectorAll('.image-card[data-image-src]').forEach(card => {
        if (card.dataset.boundClick === '1') return;
        card.dataset.boundClick = '1';
        card.addEventListener('click', () => {
            const imageSrc = card.dataset.imageSrc || '';
            if (!imageSrc.startsWith('data:image/')) return;
            openLightbox(imageSrc);
        });
    });

    root.querySelectorAll('.improve-btn[data-message-id]').forEach(button => {
        if (button.dataset.boundClick === '1') return;
        button.dataset.boundClick = '1';
        button.addEventListener('click', async () => {
            const messageId = button.dataset.messageId || '';
            if (!messageId || button.disabled) return;

            const initialText = button.textContent;
            button.disabled = true;
            button.classList.add('loading');
            button.textContent = 'Улучшаю...';

            try {
                const improved = await submitImproveAnswer(messageId);
                addBotResponse(improved, '');
                button.classList.remove('loading');
                button.classList.add('done');
                button.textContent = 'Улучшено';
            } catch (error) {
                console.error('Improve answer failed:', error);
                button.disabled = false;
                button.classList.remove('loading');
                button.textContent = initialText || 'Улучшить ответ';
                addMessageToUI('bot', `Не удалось улучшить ответ: ${error.message}`);
            }
        });
    });

    root.querySelectorAll('.improve-feedback-btn[data-message-id]').forEach(button => {
        if (button.dataset.boundClick === '1') return;
        button.dataset.boundClick = '1';
        button.addEventListener('click', async () => {
            const messageId = button.dataset.messageId || '';
            const liked = button.dataset.liked === 'true';
            if (!messageId || button.disabled) return;
            await handleImproveFeedbackClick(button, messageId, liked);
        });
    });
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
    chatHistory = saveChatMessageModule(chatHistory, {
        userMessage,
        botResponse,
        mode: currentMode,
        config: CONFIG,
    });
    updateChatHistoryUI();
}

function loadChatHistory() {
    chatHistory = loadChatHistoryModule(CONFIG);
    updateChatHistoryUI();
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

    addMessageToUI('user', entry.userMessage);
    addMessageToUI('bot', entry.botResponse);
    toggleChatHistory();
}

function deleteChatEntry(id) {
    chatHistory = chatHistory.filter(e => e.id !== id);
    try {
        localStorage.setItem(CONFIG.HISTORY_STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (e) {}
    updateChatHistoryUI();
}

function clearHistory() {
    if (!confirm("Очистить всю историю?")) return;
    chatHistory = clearChat(CONFIG);
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
                    <p>Здравствуйте! Я <strong>Строительный помощник AI</strong>.</p>
                    <p>Задайте вопрос одним сообщением. Я сам определю, нужен ли поиск по ГОСТам, оборудованию, материалам, претензиям или рецептурам.</p>
                    <p>Если часть разделов закрыта, их можно открыть промокодом.</p>
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

window.newChat = newChat;
window.toggleChatHistory = toggleChatHistory;
window.clearHistory = clearHistory;
window.closeLightbox = closeLightbox;
window.closePdfModal = closePdfModal;
window.loadChatEntry = loadChatEntry;
window.deleteChatEntry = deleteChatEntry;
window.askQuestion = askQuestion;
