export function initializeModeButtons({ config, getCurrentMode, setCurrentMode, onModeChanged }) {
    const buttons = document.querySelectorAll(".mode-btn");
    if (!buttons.length) return;

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            setCurrentMode(btn.dataset.mode || getCurrentMode());
            const current = getCurrentMode();
            const currentModeEl = document.getElementById("current-mode");
            if (currentModeEl && config.modes[current]) {
                currentModeEl.textContent = config.modes[current].name;
            }
            onModeChanged();
        });
    });
}

export function updateExampleQuestions({
    config,
    currentMode,
    sanitizeHtml,
    escapeHtml,
    onQuestionSelected,
}) {
    const container = document.getElementById("example-questions");
    if (!container) return;

    const examples = config.examples || config.modes[currentMode]?.examples || [];
    container.innerHTML = sanitizeHtml(
        examples
            .map(
                (q) =>
                    `<button class="example-question" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button>`,
            )
            .join(""),
    );

    container.querySelectorAll(".example-question").forEach((btn) => {
        btn.addEventListener("click", () => onQuestionSelected(btn.dataset.question || ""));
    });
}

export function showTypingIndicator({ scrollToBottom }) {
    const chatMessages = document.getElementById("chat-messages");
    const id = `typing-${Date.now()}`;

    const typingDiv = document.createElement("div");
    typingDiv.id = id;
    typingDiv.className = "message bot-message";
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
