// =============================================================================
// API CONFIGURATION
// =============================================================================

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://vibropress-assistant-backend.onrender.com';  // ✅ ИСПРАВЛЕННЫЙ URL

console.log('🔗 API URL:', API_URL);

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

// Mode switching
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

// Chat input auto-resize
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
}

// =============================================================================
// УЛУЧШЕННОЕ ФОРМАТИРОВАНИЕ ИСТОЧНИКОВ
// =============================================================================

function formatSourceName(title) {
    // Убираем расширения файлов
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
    // Извлекает номер ГОСТа и другую метаинформацию
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
    // Пытается извлечь номера страниц из текста
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
    
    // Иконка
    const iconSpan = document.createElement('span');
    iconSpan.className = 'source-icon';
    iconSpan.textContent = icon;
    
    // Информация об источнике
    const infoDiv = document.createElement('div');
    infoDiv.className = 'source-info';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'source-title';
    titleDiv.textContent = formattedName;
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'source-meta';
    
    // Для ГОСТов показываем больше деталей
    if (gostInfo.isGOST) {
        const gostSpan = document.createElement('span');
        gostSpan.textContent = `${gostInfo.type} ${gostInfo.number}`;
        metaDiv.appendChild(gostSpan);
    }
    
    // Раздел
    if (source.section) {
        const sectionSpan = document.createElement('span');
        sectionSpan.textContent = source.section.substring(0, 40) + (source.section.length > 40 ? '...' : '');
        metaDiv.appendChild(sectionSpan);
    }
    
    // Страница (если есть)
    if (pageInfo) {
        const pageSpan = document.createElement('span');
        pageSpan.textContent = `стр. ${pageInfo}`;
        metaDiv.appendChild(pageSpan);
    }
    
    // Превью (скрыто по умолчанию)
    const previewDiv = document.createElement('div');
    previewDiv.className = 'source-preview';
    previewDiv.textContent = source.content_preview;
    
    // Теги сущностей
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
    
    // Кнопка раскрытия
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

// =============================================================================
// ФОРМАТИРОВАНИЕ ОТВЕТА С ПОДДЕРЖКОЙ ФОРМУЛ
// =============================================================================

function formatResponseText(text) {
    // Форматирует текст: выделяет числа, температуры, размеры
    
    // Температуры: 1000°C, 1200°C
    text = text.replace(/(\d+)°C/g, '<code>$1°C</code>');
    
    // Размеры: 2,50mm, 3.5мм
    text = text.replace(/(\d+[,.]?\d*)\s?(mm|мм|м|см|km|км)/gi, '<code>$1$2</code>');
    
    // Давления, прочности: B25, F200, M300
    text = text.replace(/\b([BMFР])(\d+)\b/g, '<code>$1$2</code>');
    
    // Химические формулы и специальные обозначения
    // Например: H2O, CO2
    text = text.replace(/\b([A-Z][a-z]?\d+)\b/g, '<code>$1</code>');
    
    return text;
}

function addBotMessage(text, sources = null, modelUsed = null, isComplaint = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    // Форматируем текст ответа
    const formattedText = formatResponseText(escapeHtml(text));
    
    let messageHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <p>${formattedText}</p>
    `;
    
    // Метаданные (модель, претензия)
    if (isComplaint || modelUsed) {
        messageHTML += `<div class="message-meta">`;
        if (isComplaint) {
            messageHTML += `<span class="complaint-badge">⚠️ Претензия</span>`;
        }
        if (modelUsed) {
            messageHTML += `<span class="model-badge">Модель: ${modelUsed}</span>`;
        }
        messageHTML += `</div>`;
    }
    
    messageHTML += `</div>`;
    messageDiv.innerHTML = messageHTML;
    
    // Добавляем источники (компактный формат)
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
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
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
                max_results: 5
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
            is_complaint: false
        };
    }
}

// =============================================================================
// SEND MESSAGE FUNCTION
// =============================================================================

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
            apiResponse.is_complaint
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
// CHECK API STATUS ON LOAD
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

document.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
});

// =============================================================================
// NAVIGATION & UI
// =============================================================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#bot') {
            const demoSection = document.querySelector('#demo');
            if (demoSection) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = demoSection.offsetTop - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
            return;
        }
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = targetElement.offsetTop - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
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
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });
}

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function highlightNavigation() {
    const scrollPosition = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
    }
    
    scrollTimeout = window.requestAnimationFrame(() => {
        highlightNavigation();
    });
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature-card, .step, .badge');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.borderColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-color');
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.borderColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--border-color');
    });
});