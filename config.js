const DEFAULT_API_URL = "https://vibropress-v3-backend.onrender.com";
const DEFAULT_BRAND_KEY = "construction";

function resolveMeta(name, fallback = "") {
    const value = document.querySelector(`meta[name="${name}"]`)?.content;
    return (value || fallback).trim();
}

function resolveBrandKey() {
    const brandParam = new URLSearchParams(window.location.search).get("brand");
    const metaBrand = resolveMeta("brand-key", DEFAULT_BRAND_KEY);
    return (brandParam || metaBrand || DEFAULT_BRAND_KEY).trim().toLowerCase();
}

function resolveApiUrl() {
    const urlParam = new URLSearchParams(window.location.search).get("api_url");
    const metaApiUrl = resolveMeta("api-url", DEFAULT_API_URL);
    return (urlParam || metaApiUrl || DEFAULT_API_URL).trim();
}

const BRAND_PRESETS = {
    vibropress: {
        key: "vibropress",
        historyStorageKey: "vibropress_history",
        brandName: "VibroPress AI",
        siteName: "VibroPress AI",
        metaTitle: "VibroPress AI — инженерный помощник по вибропрессованным изделиям",
        metaDescription:
            "ИИ-помощник по ГОСТам, оборудованию, рецептурам и претензиям для тротуарной плитки, бордюров и вибропрессованных бетонных изделий.",
        heroTitle: "VibroPress AI",
        heroSubtitle:
            "Инженерный ИИ для производителей вибропрессованных материалов: нормативка, оборудование, рецептуры, качество и претензии в одном чате.",
        demoSubtitle:
            "Один чат для производства тротуарной плитки, бордюров и бетонных изделий. Доступ к разделам открывается по промокоду и пакету.",
        chatStatus: "Один чат для производства вибропрессованных материалов",
        initialMessageHtml: `
            <p>Здравствуйте! Я <strong>VibroPress AI</strong>.</p>
            <p>Задайте вопрос по ГОСТам, оборудованию, качеству поверхности, рецептурам, претензиям или входному контролю сырья. Я сам выберу нужный контур.</p>
            <p>Если нужный раздел ещё не открыт, активируйте его промокодом.</p>
        `,
        features: [
            {
                title: "Нормативка по ЖБИ и плитке",
                description: "Быстрый поиск по ГОСТам и СП с опорой на конкретные пункты, таблицы и приложения.",
            },
            {
                title: "Оборудование и линия",
                description: "Ответы по настройке вибропрессов, оснастке, стабильности формования и типовым сбоям линии.",
            },
            {
                title: "Претензии и дефекты",
                description: "Разбор причин белых пятен, сколов, разнотона, трещин и подготовка технического ответа клиенту.",
            },
            {
                title: "Рецептуры и сырьё",
                description: "Подбор состава смеси, контроль песка, добавок, В/Ц и параметров для прочности и внешнего вида.",
            },
        ],
        steps: [
            {
                title: "Загрузили базу отрасли",
                description: "ГОСТы, СП, мануалы по оборудованию, рецептурные материалы и проверенные FAQ по вибропрессованию.",
            },
            {
                title: "Задали инженерный вопрос",
                description: "Пишите естественным языком. Система сама выберет нужный раздел: нормативка, оборудование, рецептуры или претензии.",
            },
            {
                title: "Получили ответ и источники",
                description: "Краткий вывод, опора на внутреннюю базу и возможность запросить улучшенный ответ при необходимости.",
            },
        ],
        badges: ["Производство", "Лаборатория", "Технолог", "Сервис и качество"],
        ctaTitle: "Готовы попробовать?",
        ctaSubtitle:
            "Откройте VibroPress AI и подключите нужные пакеты: нормативка, оборудование, рецептуры, претензионные кейсы и общий FAQ.",
        messengerSubtitle:
            "Откройте бота в привычном канале. После активации промокода за аккаунтом закрепятся нужные разделы и пакеты доступа.",
        footerPrimary: "VibroPress AI — единая инженерная платформа для вибропрессованных бетонных изделий",
        footerSecondaryTelegramLabel: "Telegram",
        footerSecondaryEmailLabel: "Email",
        supportTelegramUrl: "https://t.me/yourusername",
        supportEmail: "contact@example.com",
        telegram: {
            handle: "@id310260589375_bot",
            url: "https://t.me/id310260589375_bot",
            description:
                "Доступ к VibroPress AI из Telegram. Удобно для технологов, начальников производства и лаборатории.",
        },
        max: {
            handle: "@VIBROPRESSAIBOT",
            url: "https://max.ru/VIBROPRESSAIBOT",
            description:
                "Доступ к VibroPress AI из MAX. Подходит для команд, которые ведут инженерные обсуждения и согласования в корпоративном канале.",
        },
        modes: {
            gost: {
                name: "ГОСТ/СП",
                examples: [
                    "Какая отпускная прочность тротуарной плитки по ГОСТ 17608?",
                    "Какие допуски по размерам применяют к бордюрному камню?",
                    "Какие требования задают к водопоглощению бетонных изделий?",
                    "Какой норматив определяет методы контроля прочности бетона?",
                ],
            },
            equipment: {
                name: "Оборудование",
                examples: [
                    "Что проверить, если на вибропрессе ухудшилось уплотнение смеси?",
                    "Почему после смены оснастки появился скол кромки?",
                    "Какие узлы сильнее всего влияют на геометрию изделий?",
                    "Как диагностировать нестабильную вибрацию или давление?",
                ],
            },
            defects: {
                name: "Претензии",
                examples: [
                    "Составь ответ на претензию по белым пятнам на поверхности плитки.",
                    "Как ответить клиенту на жалобу по разнотону партии?",
                    "Составь официальный ответ: трещины после зимы.",
                    "Как оформить технический ответ по сколам кромки?",
                ],
            },
            recipes: {
                name: "Рецептуры",
                examples: [
                    "Подбери смесь под F200 и низкое водопоглощение.",
                    "Какой песок лучше брать для плитки и бордюров?",
                    "Что изменить в составе, чтобы снизить высолы?",
                    "Как повысить раннюю прочность без потери формуемости?",
                ],
            },
        },
    },
    construction: {
        key: "construction",
        historyStorageKey: "construction_assistant_history",
        brandName: "Строительный помощник AI",
        siteName: "Строительный помощник AI",
        metaTitle: "Строительный помощник AI — единый инженерный ИИ для строительных задач",
        metaDescription:
            "ИИ-помощник по ГОСТам, оборудованию, рецептурам, строительным материалам и претензионным кейсам.",
        heroTitle: "Строительный помощник AI",
        heroSubtitle:
            "Единый инженерный ИИ для производителей стройматериалов, технологов, лабораторий и проектных команд.",
        demoSubtitle:
            "Один чат для нормативки, оборудования, материалов, рецептур и претензий. Доступ к разделам открывается по промокоду и пакету.",
        chatStatus: "Один чат для строительных и производственных сценариев",
        initialMessageHtml: `
            <p>Здравствуйте! Я <strong>Строительный помощник AI</strong>.</p>
            <p>Задайте вопрос по нормативке, материалам, оборудованию, рецептурам или претензионным кейсам. Я сам выберу подходящий контур поиска.</p>
            <p>Если нужный раздел ещё не открыт, активируйте его промокодом.</p>
        `,
        features: [
            {
                title: "Нормативка и стандарты",
                description: "Поиск по ГОСТам, СП и технической документации с опорой на конкретные разделы и требования.",
            },
            {
                title: "Материалы и технологии",
                description: "Ответы по сырью, входному контролю, рецептурам, технологическим параметрам и качеству продукции.",
            },
            {
                title: "Оборудование",
                description: "Диагностика типовых сбоев, логика поиска причин и рекомендации по проверке линии или узлов.",
            },
            {
                title: "Претензии и качество",
                description: "Подготовка технических выводов и черновиков ответов на претензии клиентов по дефектам и отклонениям.",
            },
        ],
        steps: [
            {
                title: "Собрали базу знаний",
                description: "Нормативка, отраслевые материалы, мануалы, FAQ и инженерные наработки объединены в один контур поиска.",
            },
            {
                title: "Поставили задачу",
                description: "Пишите вопрос свободно. Система сама определит нужную тему и ограничит поиск нужной базой.",
            },
            {
                title: "Получили готовый ответ",
                description: "Краткий вывод, релевантные источники и возможность запросить более сильную версию ответа при необходимости.",
            },
        ],
        badges: ["Производство", "Лаборатория", "Проектирование", "Контроль качества"],
        ctaTitle: "Нужен единый инженерный бот?",
        ctaSubtitle:
            "Откройте Строительный помощник AI и подключите нужные пакеты доступа: нормативка, материалы, оборудование, рецептуры и претензионные сценарии.",
        messengerSubtitle:
            "Работайте из сайта, Telegram или MAX. После активации промокода за аккаунтом закрепятся нужные блоки и пакеты доступа.",
        footerPrimary: "Строительный помощник AI — единая платформа с пакетным доступом к отраслевым знаниям",
        footerSecondaryTelegramLabel: "Telegram",
        footerSecondaryEmailLabel: "Email",
        supportTelegramUrl: "https://t.me/yourusername",
        supportEmail: "contact@example.com",
        telegram: {
            handle: "@id310260589375_bot",
            url: "https://t.me/id310260589375_bot",
            description:
                "Доступ к Строительному помощнику AI из Telegram. Подходит для команд, которым нужен быстрый инженерный чат.",
        },
        max: {
            handle: "@VIBROPRESSAIBOT",
            url: "https://max.ru/VIBROPRESSAIBOT",
            description:
                "Доступ к Строительному помощнику AI из MAX. Удобно для корпоративных команд и быстрого взаимодействия между подразделениями.",
        },
        modes: {
            gost: {
                name: "ГОСТ/СП",
                examples: [
                    "Какие требования обычно предъявляют к морозостойкости бетонных изделий?",
                    "Какие документы задают требования к прочности и геометрии ЖБИ?",
                    "Какой норматив определяет методы контроля прочности бетона?",
                    "Какие требования обычно предъявляют к отпускной прочности бетонных изделий?",
                ],
            },
            equipment: {
                name: "Оборудование",
                examples: [
                    "Что проверить, если оборудование стало работать нестабильно и упало качество выпуска?",
                    "Какие параметры линии сильнее всего влияют на качество формования?",
                    "Как диагностировать нестабильную вибрацию, давление или подачу смеси?",
                    "Что проверить после смены оснастки, если ухудшилась поверхность изделия?",
                ],
            },
            defects: {
                name: "Претензии",
                examples: [
                    "Составь ответ на претензию по трещинам, сколам или белым пятнам.",
                    "Как корректно ответить клиенту на жалобу по разнотону?",
                    "Составь официальный ответ: разрушение после зимы.",
                    "Как оформить технический ответ по отклонениям геометрии или прочности?",
                ],
            },
            recipes: {
                name: "Рецептуры",
                examples: [
                    "Подбери состав бетонной смеси под F200 и низкое водопоглощение.",
                    "Какой песок лучше использовать для бетонных изделий и ЖБИ?",
                    "Какие добавки обычно применяют для повышения морозостойкости?",
                    "Что изменить в составе, чтобы повысить раннюю прочность?",
                ],
            },
        },
    },
};

function cloneBrand(source) {
    return JSON.parse(JSON.stringify(source));
}

function resolveBrand() {
    const key = resolveBrandKey();
    const fallback = BRAND_PRESETS[DEFAULT_BRAND_KEY];
    const brand = cloneBrand(BRAND_PRESETS[key] || fallback);
    brand.key = key in BRAND_PRESETS ? key : DEFAULT_BRAND_KEY;
    brand.telegram.handle = resolveMeta("telegram-handle", brand.telegram.handle);
    brand.telegram.url = resolveMeta("telegram-url", brand.telegram.url);
    brand.max.handle = resolveMeta("max-handle", brand.max.handle);
    brand.max.url = resolveMeta("max-url", brand.max.url);
    brand.supportTelegramUrl = resolveMeta("support-telegram-url", brand.supportTelegramUrl);
    brand.supportEmail = resolveMeta("support-email", brand.supportEmail);
    return brand;
}

const brand = resolveBrand();

export const CONFIG = {
    API_URL: resolveApiUrl(),
    BRAND_KEY: brand.key,
    BRAND: brand,
    CHAT_ENDPOINT: "/chat",
    IMPROVE_ENDPOINT: "/answer/improve",
    IMPROVE_FEEDBACK_ENDPOINT: "/answer/improve/feedback",
    REQUEST_TIMEOUT_MS: 60000,
    FEEDBACK_ENDPOINT: "/feedback",
    HISTORY_STORAGE_KEY: brand.historyStorageKey,
    HISTORY_MAX_MESSAGES: 30,
    HISTORY_SOURCE_TEXT_LIMIT: 200,
    HISTORY_QUOTA_DROP_COUNT: 10,
    EXAMPLE_ROTATION_HOURS: 6,
    EXAMPLE_DISPLAY_COUNT: 4,
    modes: brand.modes,
};

CONFIG.examples = Object.values(CONFIG.modes).flatMap((mode) => mode.examples || []);
