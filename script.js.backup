// =============================================================================
// API CONFIGURATION
// =============================================================================

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://vibropress-assistant-backend.onrender.com';

console.log('🔗 API URL:', API_URL);

// =============================================================================
// STORAGE & CHAT MANAGEMENT
// =============================================================================

class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.chats = this.loadChats();
        this.ratings = this.loadRatings();
        this.sessionId = this.getOrCreateSessionId();
    }
    
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('vibropress_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('vibropress_session_id', sessionId);
        }
        return sessionId;
    }
    
    loadChats() {
        try {
            const saved = localStorage.getItem('vibropress_chats');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading chats:', e);
            return {};
        }
    }
    
    saveChats() {
        try {
            localStorage.setItem('vibropress_chats', JSON.stringify(this.chats));
        } catch (e) {
            console.error('Error saving chats:', e);
        }
    }
    
    loadRatings() {
        try {
            const saved = localStorage.getItem('vibropress_ratings');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading ratings:', e);
            return {};
        }
    }
    
    saveRatings() {
        try {
            localStorage.setItem('vibropress_ratings', JSON.stringify(this.ratings));
        } catch (e) {
            console.error('Error saving ratings:', e);
        }
    }
    
    createChat(title = null) {
        const chatId = 'chat_' + Date.now();
        const chat = {
            id: chatId,
            title: title || 'Новый чат',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            messages: []
        };
        this.chats[chatId] = chat;
        this.currentChatId = chatId;
        this.saveChats();
        return chatId;
    }
    
    addMessage(message) {
        if (!this.currentChatId) {
            this.createChat();
        }
        
        const chat = this.chats[this.currentChatId];
        chat.messages.push({
            ...message,
            timestamp: new Date().toISOString(),
            messageId: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        });
        
        if (chat.messages.length === 1 && message.role === 'user') {
            chat.title = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
        }
        
        chat.updated = new Date().toISOString();
        this.saveChats();
    }
    
    rateMessage(messageId, rating) {
        this.ratings[messageId] = {
            rating: rating,
            timestamp: new Date().toISOString(),
            chatId: this.currentChatId
        };
        this.saveRatings();
        this.sendRatingToServer(messageId, rating);
    }
    
    async sendRatingToServer(messageId, rating) {
        try {
            await fetch(`${API_URL}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message_id: messageId,
                    rating: rating,
                    session_id: this.sessionId,
                    timestamp: new Date().toISOString()
                })
            });
            console.log('✅ Рейтинг сохранён на сервере');
        } catch (e) {
            console.log('⚠️ Не удалось сохранить рейтинг на сервере:', e.message);
        }
    }
    
    clearCurrentChat() {
        this.currentChatId = null;
    }
}

const chatManager = new ChatManager();

// =============================================================================
// CHAT DEMO FUNCTIONALITY
// =============================================================================

const modeExamples = {
    gost: [
        "Требования к прочности B25 по ГОСТ 6665",
        "Морозостойкость F200 - таблица",
        "Водопоглощение бордюрного камня"
    ],
    equipment: [
        "Настройка виброплощадки Hess 2500",
        "Ошибка E12 на матрице Besser",
        "Режим прессования для тротуарной плитки"
    ],
    defects: [
        "Сколы на торцах блоков - причины",
        "Шелушение поверхности после зимы",
        "Трещины на бордюрном камне B25"
    ],
    recipes: [
        "Состав для B30 F300 с низким В/Ц",
        "Цветной бетон - добавки и пропорции",
        "Оптимизация вибро-режима для ФБС"
    ]
};

const modeNames = {
    gost: "ГОСТ/СП",
    equipment: "Оборудование",
    defects: "Претензии",
    recipes: "Рецептуры"
};

let conversationHistory = [];

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const mode = this.dataset.mode;
        document.getElementById('current-mode').textContent = modeNames[mode];
        updateExampleQuestions(mode);
        addBotMessage(`Режим изменён на "${modeNames[mode]}". Можете задать вопрос!`);
    });
});

function updateExampleQuestions(mode) {
    const container = document.getElementById('example-questions');
    container.innerHTML = '';
    
    modeExamples[mode].forEach(question => {
        const btn = document.createElement('button');
        btn.className = 'example-question';
        btn.textContent = question;
        btn.addEventListener('click', () => {
            document.getElementById('chat-input').value = question;
            document.getElementById('chat-input').focus();
        });
        container.appendChild(btn);
    });
}

updateExampleQuestions('gost');

const chatInput = document.getElementById('chat-input');
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');

function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            <p>${escapeHtml(text)}</p>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    chatManager.addMessage({
        role: 'user',
        content: text
    });
}

// =============================================================================
// RATING SYSTEM
// =============================================================================

function createRatingButtons(messageId) {
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'rating-container';
    
    const label = document.createElement('span');
    label.className = 'rating-label';
    label.textContent = 'Оцените ответ:';
    ratingDiv.appendChild(label);
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'rating-buttons';
    
    for (let i = 0; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'rating-btn';
        btn.textContent = i;
        btn.dataset.rating = i;
        btn.dataset.messageId = messageId;
        
        btn.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            const msgId = this.dataset.messageId;
            
            chatManager.rateMessage(msgId, rating);
            
            buttonsDiv.querySelectorAll('.rating-btn').forEach(b => {
                b.classList.remove('selected');
                if (parseInt(b.dataset.rating) <= rating) {
                    b.classList.add('selected');
                }
            });
            
            label.textContent = `Спасибо за оценку! (${rating}/5)`;
            label.style.color = '#10b981';
            
            console.log('📊 Rating submitted:', { messageId: msgId, rating, timestamp: new Date() });
        });
        
        buttonsDiv.appendChild(btn);
    }
    
    ratingDiv.appendChild(buttonsDiv);
    return ratingDiv;
}

// =============================================================================
// LATEX FORMULA CONVERSION
// =============================================================================

function convertMarkdownMathToLatex(text) {
    // Конвертирует обратные кавычки с М в LaTeX формулы
    // `25М`Па → $25$ МПа
    text = text.replace(/`(\d+)М`\s?(Па|МПа)/gi, (match, num, unit) => {
        return `$${num}$ ${unit}`;
    });
    
    // \( ... \) уже LaTeX, оставляем как есть
    // \frac{}{} тоже LaTeX
    
    // Конвертируем простые выражения в LaTeX если не в формуле
    // n = 4 → $n = 4$
    text = text.replace(/\b([a-zA-Z_]+)\s*=\s*(\d+)\b/g, (match, variable, value) => {
        // Проверяем что не внутри уже существующей формулы
        return `$${variable} = ${value}$`;
    });
    
    return text;
}

// =============================================================================
// SOURCE FORMATTING
// =============================================================================

function formatSourceName(title) {
    return title.replace(/\.(pdf|PDF|docx|DOCX|txt|TXT)$/i, '');
}

function getSourceIcon(type) {
    const icons = {
        'gost': '📋',
        'manual': '⚙️',
        'presentation': '📊',
        'book': '📚',
        'other': '📄'
    };
    return icons[type] || '📄';
}

function extractGOSTInfo(title, section) {
    const gostMatch = title.match(/(ГОСТ|СП|СНиП)[\s_-]*(\d+[\.\-]\d+)/i);
    if (gostMatch) {
        return {
            type: gostMatch[1].toUpperCase(),
            number: gostMatch[2],
            isGOST: true
        };
    }
    return { isGOST: false };
}

function extractPageInfo(contentPreview) {
    const pageMatch = contentPreview.match(/стр\.?\s*(\d+)|страниц[аы]\s*(\d+)|page\s*(\d+)/i);
    if (pageMatch) {
        return pageMatch[1] || pageMatch[2] || pageMatch[3];
    }
    return null;
}

function createCompactSource(source) {
    const formattedName = formatSourceName(source.title);
    const gostInfo = extractGOSTInfo(source.title, source.section);
    const icon = getSourceIcon(source.type);
    const pageInfo = extractPageInfo(source.content_preview);
    
    const sourceDiv = document.createElement('div');
    sourceDiv.className = 'source-item';
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'source-icon';
    iconSpan.textContent = icon;
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'source-info';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'source-title';
    titleDiv.textContent = formattedName;
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'source-meta';
    
    if (gostInfo.isGOST) {
        const gostSpan = document.createElement('span');
        gostSpan.textContent = `${gostInfo.type} ${gostInfo.number}`;
        metaDiv.appendChild(gostSpan);
    }
    
    if (source.section) {
        const sectionSpan = document.createElement('span');
        sectionSpan.textContent = source.section.substring(0, 40) + (source.section.length > 40 ? '...' : '');
        metaDiv.appendChild(sectionSpan);
    }
    
    if (pageInfo) {
        const pageSpan = document.createElement('span');
        pageSpan.textContent = `стр. ${pageInfo}`;
        metaDiv.appendChild(pageSpan);
    }
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'source-preview';
    previewDiv.textContent = source.content_preview;
    
    if (source.entities && source.entities.length > 0) {
        const entitiesDiv = document.createElement('div');
        entitiesDiv.className = 'entities';
        source.entities.slice(0, 5).forEach(entity => {
            const tag = document.createElement('span');
            tag.className = 'entity-tag';
            tag.textContent = entity;
            entitiesDiv.appendChild(tag);
        });
        previewDiv.appendChild(entitiesDiv);
    }
    
    const expandBtn = document.createElement('button');
    expandBtn.className = 'source-expand-btn';
    expandBtn.setAttribute('aria-label', 'Показать детали');
    expandBtn.addEventListener('click', () => {
        sourceDiv.classList.toggle('expanded');
    });
    
    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(metaDiv);
    infoDiv.appendChild(previewDiv);
    
    sourceDiv.appendChild(iconSpan);
    sourceDiv.appendChild(infoDiv);
    sourceDiv.appendChild(expandBtn);
    
    return sourceDiv;
}

function formatResponseText(text) {
    // Конвертируем формулы
    text = convertMarkdownMathToLatex(text);
    
    // НЕ форматируем температуры и размеры - они уже в LaTeX формате
    // text = text.replace(/(\d+)°C/g, '<code>$1°C</code>');
    // text = text.replace(/(\d+[,.]?\d*)\s?(mm|мм|м|см|km|км)/gi, '<code>$1$2</code>');
    
    return text;
}

function addBotMessage(text, sources = null, modelUsed = null, isComplaint = false, messageId = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    if (!messageId) {
        messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    messageDiv.dataset.messageId = messageId;
    
    const formattedText = formatResponseText(escapeHtml(text));
    
    let messageHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            ${formattedText.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('')}
    `;
    
    // УБРАЛИ отображение модели и complaint badge
    // if (isComplaint || modelUsed) {
    //     messageHTML += `<div class="message-meta">`;
    //     if (isComplaint) {
    //         messageHTML += `<span class="complaint-badge">⚠️ Претензия</span>`;
    //     }
    //     if (modelUsed) {
    //         messageHTML += `<span class="model-badge">Модель: ${modelUsed}</span>`;
    //     }
    //     messageHTML += `</div>`;
    // }
    
    messageHTML += `</div>`;
    messageDiv.innerHTML = messageHTML;
    
    if (sources && sources.length > 0) {
        const sourcesContainer = document.createElement('div');
        sourcesContainer.className = 'sources';
        
        const sourcesTitle = document.createElement('h4');
        sourcesTitle.textContent = '📚 Источники';
        sourcesContainer.appendChild(sourcesTitle);
        
        sources.forEach(source => {
            sourcesContainer.appendChild(createCompactSource(source));
        });
        
        messageDiv.querySelector('.message-content').appendChild(sourcesContainer);
    }
    
    const ratingButtons = createRatingButtons(messageId);
    messageDiv.querySelector('.message-content').appendChild(ratingButtons);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    chatManager.addMessage({
        role: 'assistant',
        content: text,
        sources: sources,
        model_used: modelUsed,
        is_complaint: isComplaint,
        messageId: messageId
    });
    
    // Рендерим LaTeX формулы
    if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(messageDiv, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
        });
    }
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================================
// API CALL FUNCTION
// =============================================================================

async function callAPI(userMessage) {
    try {
        conversationHistory.push({
            role: 'user',
            content: userMessage
        });
        
        console.log('📤 Отправка запроса к API:', API_URL + '/chat');
        
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: conversationHistory,
                use_rag: true,
                max_results: 5,
                session_id: chatManager.sessionId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📥 Получен ответ от API:', data);
        
        conversationHistory.push({
            role: 'assistant',
            content: data.response
        });
        
        return data;
        
    } catch (error) {
        console.error('❌ Ошибка при вызове API:', error);
        
        return {
            response: `⚠️ Не удалось подключиться к API. Ошибка: ${error.message}\n\nЭто может быть связано с:\n1. API ещё не задеплоен на Render\n2. Cold start (первый запрос после простоя занимает ~30-60 сек)\n3. Проблемы с сетью\n\nПопробуйте ещё раз через минуту.`,
            sources: null,
            model_used: 'demo',
            is_complaint: false,
            message_id: 'demo_' + Date.now()
        };
    }
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    addUserMessage(text);
    
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    showTypingIndicator();
    
    try {
        const apiResponse = await callAPI(text);
        
        removeTypingIndicator();
        
        addBotMessage(
            apiResponse.response,
            apiResponse.sources,
            apiResponse.model_used,
            apiResponse.is_complaint,
            apiResponse.message_id
        );
        
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addBotMessage('Извините, произошла ошибка. Пожалуйста, попробуйте ещё раз.');
    } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// =============================================================================
// CHECK API STATUS
// =============================================================================

async function checkAPIStatus() {
    try {
        console.log('🔍 Проверка статуса API...');
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API доступен:', data);
            
            const statusDot = document.querySelector('.status-dot');
            if (statusDot) {
                statusDot.style.backgroundColor = '#10b981';
                statusDot.title = 'API подключен';
            }
        } else {
            console.warn('⚠️ API вернул ошибку:', response.status);
        }
    } catch (error) {
        console.warn('⚠️ API недоступен (возможно, холодный старт):', error.message);
        
        const statusDot = document.querySelector('.status-dot');
        if (statusDot) {
            statusDot.style.backgroundColor = '#f59e0b';
            statusDot.title = 'API недоступен (холодный старт)';
        }
    }
}

// =============================================================================
// CHAT MANAGEMENT
// =============================================================================

function newChat() {
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <p>Здравствуйте! Я VibroPress AI.</p>
                <p>Выберите режим работы и задайте вопрос.</p>
            </div>
        </div>
    `;
    conversationHistory = [];
    chatManager.clearCurrentChat();
}

// =============================================================================
// INIT
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
    
    if (Object.keys(chatManager.chats).length === 0) {
        chatManager.createChat('Первый чат');
    }
    
    console.log('💾 Loaded chats:', Object.keys(chatManager.chats).length);
});

window.chatManager = chatManager;

// =============================================================================
// NAVIGATION
// =============================================================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#bot') {
            const demoSection = document.querySelector('#demo');
            if (demoSection) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                window.scrollTo({
                    top: demoSection.offsetTop - navbarHeight,
                    behavior: 'smooth'
                });
            }
            return;
        }
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            window.scrollTo({
                top: targetElement.offsetTop - navbarHeight,
                behavior: 'smooth'
            });
        }
    });
});

const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        const spans = mobileMenuToggle.querySelectorAll('span');
        if (navMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            const spans = mobileMenuToggle.querySelectorAll('span');
            spans.forEach(span => span.style.transform = 'none');
            spans[1].style.opacity = '1';
        });
    });
}