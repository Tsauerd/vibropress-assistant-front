function extractAnswer(response) {
    return (
        response?.answer ||
        response?.response ||
        response?.content ||
        response?.text ||
        response?.message ||
        JSON.stringify(response || {})
    );
}

function toPlainText(value) {
    const tmp = document.createElement("div");
    tmp.innerHTML = String(value || "");
    return (tmp.textContent || tmp.innerText || "").trim();
}

async function copyAnswerToClipboard(button, text) {
    if (!button) return;
    const initialText = button.textContent;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const area = document.createElement("textarea");
            area.value = text;
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.focus();
            area.select();
            document.execCommand("copy");
            area.remove();
        }
        button.textContent = "✓ Скопировано";
        setTimeout(() => {
            button.textContent = initialText || "📋";
        }, 1600);
    } catch (error) {
        console.error("Copy failed:", error);
    }
}

export async function sendMessage({
    state,
    sendToAPI,
    addMessageToUI,
    addBotResponse,
    saveChatMessage,
    autoResizeTextarea,
    setLoading,
    showTypingIndicator,
    removeTypingIndicator,
}) {
    const chatInput = document.getElementById("chat-input");
    const message = (chatInput?.value || "").trim();

    if (!message || state.isLoading) return;

    addMessageToUI("user", message);
    chatInput.value = "";
    autoResizeTextarea.call(chatInput);

    setLoading(true);
    const loadingId = showTypingIndicator();

    try {
        const response = await sendToAPI(message);
        removeTypingIndicator(loadingId);
        addBotResponse(response, message);
        saveChatMessage(message, response);
    } catch (error) {
        console.error("API Error:", error);
        removeTypingIndicator(loadingId);
        if (error.name === "AbortError" || error.message === "REQUEST_TIMEOUT") {
            addMessageToUI("bot", "Сервер не отвечает, попробуйте позже");
        } else {
            addMessageToUI("bot", `❌ Ошибка: ${error.message}`);
        }
    } finally {
        setLoading(false);
    }
}

export function addMessageToUI({ role, content, sanitizeHtml, formatMessageContent, scrollToBottom }) {
    const chatMessages = document.getElementById("chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}-message`;

    const avatar = role === "user" ? "👤" : "🤖";

    messageDiv.innerHTML = sanitizeHtml(`
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${formatMessageContent(content)}
        </div>
    `);

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

export function addBotResponse({
    response,
    counters,
    setLastMessageId,
    formatMessageContent,
    renderCollapsibleSources,
    renderImages,
    renderEntities,
    renderRating,
    sanitizeHtml,
    bindDynamicMessageActions,
    scrollToBottom,
}) {
    const chatMessages = document.getElementById("chat-messages");
    const serverMessageId = response.message_id || response.id || response.request_id;
    const messageId = String(serverMessageId || `msg_${++counters.messageCounter}_${Date.now()}`);

    const messageDiv = document.createElement("div");
    messageDiv.className = "message bot-message";
    messageDiv.setAttribute("data-message-id", messageId);

    const answer = extractAnswer(response);
    const plainTextAnswer = toPlainText(answer);

    let html = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            ${formatMessageContent(answer)}
    `;

    const sources = response.sources || response.chunks || response.documents || [];
    if (sources.length > 0) {
        html += renderCollapsibleSources(sources);
    }

    if (response.images && response.images.length > 0) {
        html += renderImages(response.images);
    }

    if (response.entities && response.entities.length > 0) {
        html += renderEntities(response.entities);
    }

    html += renderRating(messageId);
    html += '<button class="copy-btn" title="Копировать ответ">📋</button>';
    html += "</div>";

    messageDiv.innerHTML = sanitizeHtml(html);
    bindDynamicMessageActions(messageDiv);

    const copyBtn = messageDiv.querySelector(".copy-btn");
    if (copyBtn) {
        copyBtn.addEventListener("click", () => copyAnswerToClipboard(copyBtn, plainTextAnswer));
    }

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    setLastMessageId(messageId);

    if (typeof renderMathInElement !== "undefined") {
        renderMathInElement(messageDiv, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
            ],
            throwOnError: false,
        });
    }
}

