// =============================================================================
// API CONFIGURATION
// =============================================================================

// Определяем URL API в зависимости от окружения
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://vibropress-assistant-backend.onrender.com';  // ✅ ПРАВИЛЬНО
    
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

// Переменная для хранения истории сообщений
let conversationHistory = [];

// Mode switching
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active class from all buttons
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        this.classList.add('active');
        
        // Get mode
        const mode = this.dataset.mode;
        
        // Update status text
        document.getElementById('current-mode').textContent = modeNames[mode];
        
        // Update example questions
        updateExampleQuestions(mode);
        
        // Add bot message about mode change
        addBotMessage(`Режим изменён на "${modeNames[mode]}". Можете задать вопрос!`);
    });
});

// Update example questions
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

// Initialize with GOST mode examples
updateExampleQuestions('gost');

// Chat input auto-resize
const chatInput = document.getElementById('chat-input');
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Send message
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

function addBotMessage(text, sources = null, modelUsed = null, isComplaint = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    // Основной контент сообщения
    let messageHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <p>${escapeHtml(text)}</p>
    `;
    
    // Если это претензия - показываем бейдж
    if (isComplaint) {
        messageHTML += `
            <div class="message-meta">
                <span class="complaint-badge">⚠️ Претензия</span>
                <span class="model-badge">Модель: ${modelUsed || 'GPT-4o'}</span>
            </div>
        `;
    } else if (modelUsed) {
        messageHTML += `
            <div class="message-meta">
                <span class="model-badge">Модель: ${modelUsed}</span>
            </div>
        `;
    }
    
    // Если есть источники - добавляем их
    if (sources && sources.length > 0) {
        messageHTML += `
            <div class="sources">
                <h4>📚 Источники:</h4>
        `;
        
        sources.forEach(source => {
            messageHTML += `
                <div class="source-item">
                    <strong>${escapeHtml(source.title)}</strong>
                    ${source.section ? `<span> - ${escapeHtml(source.section)}</span>` : ''}
                    <p>${escapeHtml(source.content_preview)}</p>
                    ${source.entities && source.entities.length > 0 ? `
                        <div class="entities">
                            ${source.entities.map(entity => `<span class="entity-tag">${escapeHtml(entity)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        messageHTML += `</div>`;
    }
    
    messageHTML += `</div>`;
    messageDiv.innerHTML = messageHTML;
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
        // Добавляем сообщение пользователя в историю
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
        
        // Добавляем ответ ассистента в историю
        conversationHistory.push({
            role: 'assistant',
            content: data.response
        });
        
        return data;
        
    } catch (error) {
        console.error('❌ Ошибка при вызове API:', error);
        
        // Если API недоступен - показываем демо-ответ
        return {
            response: `⚠️ Не удалось подключиться к API. Ошибка: ${error.message}\n\nЭто может быть связано с:\n1. API ещё не задеплоен на Render\n2. Cold start (первый запрос после простоя занимает ~30-60 сек)\n3. Проблемы с сетью\n\nПопробуйте ещё раз через минуту.`,
            sources: null,
            model_used: 'demo',
            is_complaint: false
        };
    }
}

// =============================================================================
// SEND MESSAGE FUNCTION (с реальным API)
// =============================================================================

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Disable input and button during request
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    // Add user message
    addUserMessage(text);
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Call real API
        const apiResponse = await callAPI(text);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add bot response with sources
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
        // Re-enable input and button
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
            
            // Можно показать статус в UI
            const statusDot = document.querySelector('.status-dot');
            if (statusDot) {
                statusDot.style.backgroundColor = '#10b981'; // Green
                statusDot.title = 'API подключен';
            }
        } else {
            console.warn('⚠️ API вернул ошибку:', response.status);
        }
    } catch (error) {
        console.warn('⚠️ API недоступен (возможно, холодный старт):', error.message);
        
        // Показываем предупреждение
        const statusDot = document.querySelector('.status-dot');
        if (statusDot) {
            statusDot.style.backgroundColor = '#f59e0b'; // Orange
            statusDot.title = 'API недоступен (холодный старт)';
        }
    }
}

// Проверяем статус API при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
});

// =============================================================================
// SMOOTH SCROLLING & NAVIGATION
// =============================================================================

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#bot') {
            // Scroll to demo section instead
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

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        
        // Animate hamburger icon
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
    
    // Close mobile menu when clicking on a link
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

// Active navigation highlighting on scroll
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

// Throttle scroll event for better performance
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
    }
    
    scrollTimeout = window.requestAnimationFrame(() => {
        highlightNavigation();
    });
});

// Intersection Observer for fade-in animations
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

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature-card, .step, .badge');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Add hover effect to feature cards
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