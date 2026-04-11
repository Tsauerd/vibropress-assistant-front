function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
}

function getPreviewCard(response) {
    if (response?.preview_card && typeof response.preview_card === "object") {
        return response.preview_card;
    }
    if (response?.start_point && response?.trial_variants && response?.markdown) {
        return response;
    }
    return null;
}

function getNewsCard(response) {
    if (response?.news_card && typeof response.news_card === "object") {
        return response.news_card;
    }
    return null;
}

function extractAnswer(response) {
    const previewCard = getPreviewCard(response);
    const newsCard = getNewsCard(response);
    return (
        response?.answer ||
        response?.response ||
        response?.content ||
        response?.text ||
        response?.message ||
        previewCard?.markdown ||
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

function formatCardNumber(value, digits = 1) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    return numeric.toFixed(digits);
}

function formatConfidenceLabel(value) {
    switch (String(value || "").toLowerCase()) {
        case "high":
            return "Высокая уверенность";
        case "medium":
            return "Средняя уверенность";
        default:
            return "Низкая уверенность";
    }
}

function formatConstraintStatus(value) {
    switch (String(value || "").toLowerCase()) {
        case "applied":
            return "учтено";
        case "check":
            return "проверить";
        default:
            return "ориентир";
    }
}

function renderPreviewList(items, emptyText) {
    const rows = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!rows.length) {
        return `<ul class="mix-preview-list"><li>${escapeHtml(emptyText)}</li></ul>`;
    }
    return `<ul class="mix-preview-list">${rows.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderMixDesignPreviewCard(card) {
    if (!card || typeof card !== "object") return "";

    const startPoint = card.start_point || {};
    const constraints = Array.isArray(card.applied_constraints) ? card.applied_constraints : [];
    const variants = Array.isArray(card.trial_variants) ? card.trial_variants : [];
    const assumptions = Array.isArray(card.assumptions) ? card.assumptions : [];
    const warnings = Array.isArray(card.warnings) ? card.warnings : [];
    const nextChecks = Array.isArray(card.next_checks) ? card.next_checks : [];

    return `
        <div class="mix-preview-card">
            <div class="mix-preview-head">
                <div class="mix-preview-title-wrap">
                    <div class="mix-preview-eyebrow">Mix Design Preview</div>
                    <div class="mix-preview-title">${escapeHtml(card.title || "Стартовый состав")}</div>
                    <p class="mix-preview-subtitle">${escapeHtml(card.subtitle || "")}</p>
                </div>
                <div class="mix-preview-badges">
                    <span class="mix-preview-badge">${escapeHtml(formatConfidenceLabel(card.confidence))}</span>
                    <span class="mix-preview-badge mix-preview-badge-muted">${escapeHtml(card.method_id || "method")}</span>
                </div>
            </div>
            <div class="mix-preview-kpis">
                <div class="mix-preview-kpi">
                    <span class="mix-preview-kpi-label">Цемент</span>
                    <strong>${formatCardNumber(startPoint.cement_kg)} кг/м3</strong>
                </div>
                <div class="mix-preview-kpi">
                    <span class="mix-preview-kpi-label">Вода</span>
                    <strong>${formatCardNumber(startPoint.water_kg)} кг/м3</strong>
                </div>
                <div class="mix-preview-kpi">
                    <span class="mix-preview-kpi-label">Песок</span>
                    <strong>${formatCardNumber(startPoint.sand_kg)} кг/м3</strong>
                </div>
                <div class="mix-preview-kpi">
                    <span class="mix-preview-kpi-label">Щебень</span>
                    <strong>${formatCardNumber(startPoint.aggregate_kg)} кг/м3</strong>
                </div>
                <div class="mix-preview-kpi mix-preview-kpi-accent">
                    <span class="mix-preview-kpi-label">В/Ц</span>
                    <strong>${formatCardNumber(startPoint.wc_ratio, 3)}</strong>
                </div>
            </div>
            <div class="mix-preview-grid">
                <div class="mix-preview-section">
                    <div class="mix-preview-section-title">Ограничения</div>
                    <div class="mix-preview-constraints">
                        ${constraints.length ? constraints.map((item) => `
                            <div class="mix-preview-constraint">
                                <div class="mix-preview-constraint-row">
                                    <strong>${escapeHtml(item.label || "Ограничение")}</strong>
                                    <span class="mix-preview-chip mix-preview-chip-${escapeHtml(String(item.status || "note").toLowerCase())}">${escapeHtml(formatConstraintStatus(item.status))}</span>
                                </div>
                                <div class="mix-preview-constraint-meta">${escapeHtml(item.requested || "не задано")} · ${escapeHtml(item.applied_value || "без численного лимита")}</div>
                            </div>
                        `).join("") : '<p class="mix-preview-muted">Явные численные ограничения не заданы.</p>'}
                    </div>
                </div>
                <div class="mix-preview-section">
                    <div class="mix-preview-section-title">Пробные составы</div>
                    <div class="mix-preview-variants">
                        ${variants.length ? variants.map((item) => `
                            <div class="mix-preview-variant">
                                <div class="mix-preview-variant-title">${escapeHtml(item.label || "variant")}</div>
                                <div class="mix-preview-variant-row">Ц=${formatCardNumber(item.cement_kg)} · В=${formatCardNumber(item.water_kg)} · П=${formatCardNumber(item.sand_kg)} · Щ=${formatCardNumber(item.aggregate_kg)}</div>
                                <div class="mix-preview-variant-row mix-preview-variant-row-accent">В/Ц=${formatCardNumber(item.wc_ratio, 3)}</div>
                            </div>
                        `).join("") : '<p class="mix-preview-muted">Пробные варианты пока не сформированы.</p>'}
                    </div>
                </div>
            </div>
            <div class="mix-preview-grid mix-preview-grid-lists">
                <div class="mix-preview-section">
                    <div class="mix-preview-section-title">Допущения</div>
                    ${renderPreviewList(assumptions, "Специальные допущения пока не зафиксированы.")}
                </div>
                <div class="mix-preview-section">
                    <div class="mix-preview-section-title">Риски и ограничения</div>
                    ${renderPreviewList(warnings, "Существенные риски пока не зафиксированы.")}
                </div>
            </div>
            ${nextChecks.length ? `
                <div class="mix-preview-footnote">
                    <strong>Что проверить дальше:</strong>
                    ${escapeHtml(nextChecks.slice(0, 2).join(" · "))}
                </div>
            ` : ""}
        </div>
    `;
}

function renderNewsCard(card) {
    if (!card || typeof card !== "object") return "";
    const tags = Array.isArray(card.topic_tags) ? card.topic_tags.filter(Boolean) : [];
    const published = String(card.published_at || "").trim();
    const sourceName = String(card.source_name || "").trim();
    const sourceUrl = String(card.source_url || "").trim();
    const newsId = Number(card.id || 0);
    const note = String(card.translated_note || "").trim();

    return `
        <div class="news-card">
            <div class="news-card-head">
                <div class="news-card-eyebrow">Новости материалов и технологий</div>
                <div class="news-card-title">${escapeHtml(card.title_ru || card.title_original || "Свежая новость")}</div>
            </div>
            <p class="news-card-summary">${escapeHtml(card.summary_ru_short || "")}</p>
            ${card.why_it_matters_ru ? `
                <div class="news-card-why">
                    <span class="news-card-why-label">Почему это важно</span>
                    <p>${escapeHtml(card.why_it_matters_ru)}</p>
                </div>
            ` : ""}
            <div class="news-card-meta">
                ${sourceName ? `<span class="news-card-chip">${escapeHtml(sourceName)}</span>` : ""}
                ${published ? `<span class="news-card-chip news-card-chip-muted">${escapeHtml(new Date(published).toLocaleDateString("ru-RU"))}</span>` : ""}
                ${tags.map((tag) => `<span class="news-card-chip news-card-chip-muted">${escapeHtml(tag)}</span>`).join("")}
            </div>
            ${note ? `<div class="news-card-note">${escapeHtml(note)}</div>` : ""}
            <div class="news-card-actions">
                <button class="news-refresh-btn" data-request-source="followup">Ещё новость</button>
                ${sourceUrl && newsId ? `<button class="news-open-btn" data-news-id="${escapeHtml(String(newsId))}" data-source-url="${escapeHtml(sourceUrl)}">Открыть источник</button>` : ""}
            </div>
        </div>
    `;
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
    renderResponseMeta,
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

    const previewCard = getPreviewCard(response);
    const newsCard = getNewsCard(response);
    const answer = extractAnswer(response);
    const copyParts = newsCard
        ? [
            newsCard.title_ru || newsCard.title_original || "",
            newsCard.summary_ru_short || "",
            newsCard.why_it_matters_ru ? `Почему это важно: ${newsCard.why_it_matters_ru}` : "",
            newsCard.source_url || "",
        ]
        : previewCard?.markdown && previewCard.markdown !== answer
            ? [answer, previewCard.markdown]
            : [answer];
    const copySource = copyParts.filter(Boolean).join("\n\n");
    const plainTextAnswer = toPlainText(copySource);
    const renderAnswerBlock = !(previewCard && !response?.answer && !response?.response && previewCard?.markdown === answer) && !newsCard;

    let html = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
    `;

    if (renderAnswerBlock) {
        html += formatMessageContent(answer);
    }

    if (previewCard) {
        html += renderMixDesignPreviewCard(previewCard);
    }

    if (newsCard) {
        html += renderNewsCard(newsCard);
    }

    html += renderResponseMeta(response);

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
