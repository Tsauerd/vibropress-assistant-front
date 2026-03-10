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

CONFIG.examples = [
    "Какая отпускная прочность тротуарной плитки по ГОСТ 17608?",
    "Какие цифровые сервисы доступны для вибропрессов HESS?",
    "Составь официальный ответ на претензию: трещины после зимы.",
    "Подбери смесь под F200 и низкое водопоглощение.",
];

CONFIG.modes.gost.examples = [
    "Какая отпускная прочность тротуарной плитки по ГОСТ 17608?",
    "Какие требования к морозостойкости тротуарной плитки указаны в ГОСТ 17608?",
    "Какие методы контроля прочности тротуарной плитки допускает ГОСТ 17608?",
];

CONFIG.modes.equipment.examples = [
    "Какие цифровые сервисы доступны для вибропрессов HESS?",
    "Какие сервисные решения предусмотрены для HESS RH 2000-4?",
    "Какие возможности SmartCloud и SmartAcademy доступны для HESS?",
];

CONFIG.modes.defects.examples = [
    "Составь официальный ответ на претензию: трещины после зимы.",
    "Составь официальный ответ на претензию: шелушение лицевой поверхности после зимы.",
    "Составь официальный ответ на претензию: неравномерный цвет партии плитки.",
];

CONFIG.modes.recipes.examples = [
    "Подбери смесь под F200 и низкое водопоглощение.",
    "Что изменить в составе смеси, чтобы получить F200?",
    "Что изменить в смеси, чтобы снизить водопоглощение плитки?",
];
