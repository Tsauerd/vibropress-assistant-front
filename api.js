function mapModeToTaskType(mode) {
    switch ((mode || "").toLowerCase()) {
        case "defects":
            return "defects";
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

export async function sendToAPI({ config, message, sessionId, mode, clientId }) {
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
        client_id: clientId,
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

export async function requestMixDesignPreviewDemo({ config }) {
    const response = await fetch(`${config.API_URL}/api/v1/mix-design/preview`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            target_class: "B30",
            workability_class: "P2",
            strength_coefficient_a: 0.58,
            frost_resistance: "F200",
            waterproofness: "W8",
            materials: {
                cement: { grade: 500, activity_28d_mpa: 52 },
                sand: { fineness_modulus: 2.1 },
                aggregate: { max_fraction_mm: 20 },
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
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

export async function redeemWebPromo({ config, clientId, sessionId, code }) {
    const response = await fetch(`${config.API_URL}${config.WEB_PROMO_REDEEM_ENDPOINT}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            client_id: clientId,
            session_id: sessionId,
            code,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
}

export async function requestNews({ config, sessionId, clientId, promoCode = "", requestSource = "manual" }) {
    const response = await fetch(`${config.API_URL}${config.NEWS_ENDPOINT}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            platform: "web",
            session_id: sessionId,
            client_id: clientId,
            promo_code: promoCode,
            request_source: requestSource,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
}

export async function trackNewsOpen({ config, newsId, sessionId, clientId, promoCode = "" }) {
    const response = await fetch(`${config.API_URL}${config.NEWS_OPEN_ENDPOINT}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            news_id: newsId,
            platform: "web",
            session_id: sessionId,
            client_id: clientId,
            promo_code: promoCode,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
}

export async function improveAnswer({ config, messageId, sessionId, clientId }) {
    const response = await fetch(`${config.API_URL}${config.IMPROVE_ENDPOINT}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            message_id: messageId,
            session_id: sessionId,
            client_id: clientId,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
}

export async function sendImproveFeedback({ config, messageId, sessionId, clientId, liked }) {
    const response = await fetch(`${config.API_URL}${config.IMPROVE_FEEDBACK_ENDPOINT}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            message_id: messageId,
            session_id: sessionId,
            client_id: clientId,
            liked,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
}
