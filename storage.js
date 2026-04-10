function isQuotaError(error) {
    return (
        error &&
        (error.name === "QuotaExceededError" ||
            error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
            String(error.message || "").toLowerCase().includes("quota"))
    );
}

function toSafeString(value) {
    if (value === null || value === undefined) return "";
    return String(value);
}

function limitText(value, maxLen) {
    const text = toSafeString(value);
    return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function sanitizeSources(sources, maxLen) {
    if (!Array.isArray(sources)) return [];
    return sources.map((source) => {
        const out = { ...source };
        if ("text" in out) out.text = limitText(out.text, maxLen);
        if ("content" in out) out.content = limitText(out.content, maxLen);
        if ("snippet" in out) out.snippet = limitText(out.snippet, maxLen);
        if ("page_content" in out) out.page_content = limitText(out.page_content, maxLen);
        return out;
    });
}

function sanitizeImages(images) {
    if (!Array.isArray(images)) return [];
    return images.map((img) => {
        const out = { ...img };
        delete out.image_data;
        delete out.data;
        delete out.base64;
        return out;
    });
}

function makeResponseSnapshot(botResponse, sourceTextLimit) {
    if (!botResponse || typeof botResponse !== "object") return null;
    const previewCard =
        botResponse.preview_card && typeof botResponse.preview_card === "object"
            ? { ...botResponse.preview_card }
            : botResponse.start_point && botResponse.trial_variants && botResponse.markdown
              ? { ...botResponse }
              : null;
    return {
        answer: toSafeString(botResponse.answer || botResponse.response || botResponse.content || botResponse.text),
        sources: sanitizeSources(botResponse.sources || botResponse.chunks || botResponse.documents || [], sourceTextLimit),
        images: sanitizeImages(botResponse.images || []),
        preview_card: previewCard,
    };
}

function getBotText(botResponse) {
    if (typeof botResponse === "string") return botResponse;
    return toSafeString(
        botResponse?.answer ||
            botResponse?.response ||
            botResponse?.content ||
            botResponse?.text ||
            botResponse?.preview_card?.markdown ||
            botResponse?.markdown ||
            botResponse?.message ||
            "",
    );
}

function sliceToMax(history, maxMessages) {
    return history.slice(-maxMessages);
}

function persistHistory({ key, history, dropCount }) {
    let candidate = [...history];
    for (;;) {
        try {
            localStorage.setItem(key, JSON.stringify(candidate));
            return candidate;
        } catch (error) {
            if (!isQuotaError(error) || candidate.length === 0) {
                throw error;
            }
            candidate = candidate.slice(Math.min(dropCount, candidate.length));
        }
    }
}

export function saveChatMessage(chatHistory, { userMessage, botResponse, mode, config }) {
    const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        mode,
        userMessage: toSafeString(userMessage),
        botResponse: getBotText(botResponse),
        responseSnapshot: makeResponseSnapshot(botResponse, config.HISTORY_SOURCE_TEXT_LIMIT),
    };

    let nextHistory = sliceToMax([...(Array.isArray(chatHistory) ? chatHistory : []), entry], config.HISTORY_MAX_MESSAGES);

    try {
        nextHistory = persistHistory({
            key: config.HISTORY_STORAGE_KEY,
            history: nextHistory,
            dropCount: config.HISTORY_QUOTA_DROP_COUNT,
        });
    } catch (error) {
        console.error("History storage error:", error);
    }

    return nextHistory;
}

export function loadChatHistory(config) {
    try {
        const raw = localStorage.getItem(config.HISTORY_STORAGE_KEY);
        const parsed = JSON.parse(raw || "[]");
        if (!Array.isArray(parsed)) return [];
        const normalized = parsed.map((entry) => ({
            ...entry,
            userMessage: toSafeString(entry.userMessage),
            botResponse: toSafeString(entry.botResponse),
        }));
        const trimmed = sliceToMax(normalized, config.HISTORY_MAX_MESSAGES);
        if (trimmed.length !== parsed.length) {
            localStorage.setItem(config.HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
        }
        return trimmed;
    } catch (error) {
        console.error("Failed to load history:", error);
        return [];
    }
}

export function clearChat(config) {
    localStorage.removeItem(config.HISTORY_STORAGE_KEY);
    return [];
}
