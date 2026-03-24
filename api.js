function mapModeToTaskType(mode) {
    switch ((mode || "").toLowerCase()) {
        case "defects":
            return "complaint";
        case "equipment":
            return "equipment";
        case "recipes":
            return "recipes";
        case "gost":
            return "norm";
        default:
            return "";
    }
}

export async function sendToAPI({ config, message, sessionId, mode }) {
    const url = `${config.API_URL}${config.CHAT_ENDPOINT}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT_MS);

    const resolvedMode = typeof mode === "string" && mode.toLowerCase() !== "auto" ? mode : undefined;
    const resolvedTaskType = mapModeToTaskType(resolvedMode);

    const payload = {
        query: message,
        messages: [{ role: "user", content: message }],
        use_rag: true,
        max_results: 5,
        session_id: sessionId,
    };

    if (resolvedTaskType) payload.task_type = resolvedTaskType;
    if (resolvedMode) payload.mode = resolvedMode;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("REQUEST_TIMEOUT");
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function sendFeedback({ config, messageId, rating, sessionId, comment = "" }) {
    const payload = {
        message_id: messageId,
        rating,
        session_id: sessionId,
        comment,
    };

    try {
        const response = await fetch(`${config.API_URL}${config.FEEDBACK_ENDPOINT}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return response.ok;
    } catch (error) {
        console.error("Feedback API error:", error);
        return false;
    }
}

export async function improveAnswer({ config, messageId, sessionId }) {
    const response = await fetch(`${config.API_URL}${config.IMPROVE_ENDPOINT}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            message_id: messageId,
            session_id: sessionId,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
}

export async function sendImproveFeedback({ config, messageId, sessionId, liked }) {
    const response = await fetch(`${config.API_URL}${config.IMPROVE_FEEDBACK_ENDPOINT}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            message_id: messageId,
            session_id: sessionId,
            liked,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
}
