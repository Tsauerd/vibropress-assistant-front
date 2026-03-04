const DEFAULT_API_URL = "https://vibropress-v3-backend.onrender.com";

function resolveApiUrl() {
    const urlParam = new URLSearchParams(window.location.search).get("api_url");
    const metaApiUrl = document.querySelector('meta[name="api-url"]')?.content;
    return (urlParam || metaApiUrl || DEFAULT_API_URL).trim();
}

export const CONFIG = {
    API_URL: resolveApiUrl(),
    CHAT_ENDPOINT: "/chat",
    REQUEST_TIMEOUT_MS: 60000,
    FEEDBACK_ENDPOINT: "/feedback",
    HISTORY_STORAGE_KEY: "vibropress_history",
    HISTORY_MAX_MESSAGES: 30,
    HISTORY_SOURCE_TEXT_LIMIT: 200,
    HISTORY_QUOTA_DROP_COUNT: 10,
    modes: {
        gost: {
            name: "ГОСТ/СП",
            examples: [
                "Какие требования к морозостойкости тротуарной плитки?",
                "Допуски по размерам для бордюрного камня",
                "Марки бетона для вибропрессованных изделий",
            ],
        },
        equipment: {
            name: "Оборудование",
            examples: [
                "Как настроить вибропресс для производства плитки?",
                "Типичные ошибки при работе с Hess",
                "Параметры вибрации для тротуарной плитки",
            ],
        },
        defects: {
            name: "Претензии",
            examples: [
                "Плитка крошится после зимы — в чем причина?",
                "Клиент жалуется на неравномерный цвет",
                "Появились трещины на бордюрах",
            ],
        },
        recipes: {
            name: "Рецептуры",
            examples: [
                "Состав бетона для плитки М300",
                "Какие добавки повышают морозостойкость?",
                "Оптимальное В/Ц для вибропрессования",
            ],
        },
    },
};

