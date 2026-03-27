import { CONFIG } from "./config.js";

function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node && typeof value === "string") node.textContent = value;
}

function setHtml(selector, value) {
    const node = document.querySelector(selector);
    if (node && typeof value === "string") node.innerHTML = value;
}

function setAttr(selector, attr, value) {
    const node = document.querySelector(selector);
    if (node && typeof value === "string") node.setAttribute(attr, value);
}

function buildQrUrl(url) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(url)}`;
}

export function applyBranding() {
    const brand = CONFIG.BRAND;
    if (!brand) return;

    document.title = brand.metaTitle;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute("content", brand.metaDescription);

    setText(".nav-brand", brand.siteName);
    setText(".hero-title", brand.heroTitle);
    setText(".hero-subtitle", brand.heroSubtitle);
    setText("#demo .demo-subtitle", brand.demoSubtitle);
    setText(".status-text", brand.chatStatus);
    setHtml("#chat-messages .message-content", brand.initialMessageHtml);

    setText("#features .section-title", "Что умеет бот");
    document.querySelectorAll("#features .feature-card").forEach((card, index) => {
        const item = brand.features[index];
        if (!item) return;
        const title = card.querySelector(".feature-title");
        const description = card.querySelector(".feature-description");
        if (title) title.textContent = item.title;
        if (description) description.textContent = item.description;
    });

    setText("#how .section-title", "Как работает");
    document.querySelectorAll("#how .step").forEach((step, index) => {
        const item = brand.steps[index];
        if (!item) return;
        const title = step.querySelector(".step-title");
        const description = step.querySelector(".step-description");
        if (title) title.textContent = item.title;
        if (description) description.textContent = item.description;
    });

    setText("#for-whom .section-title", "Для кого");
    document.querySelectorAll("#for-whom .badge-text").forEach((badge, index) => {
        const label = brand.badges[index];
        if (label) badge.textContent = label;
    });

    setText(".cta-title", brand.ctaTitle);
    setText(".cta-subtitle", brand.ctaSubtitle);
    setText(".messenger-links .section-title", "Откройте бота в мессенджере");
    setText(".messenger-links .demo-subtitle", brand.messengerSubtitle);

    const messengerCards = document.querySelectorAll(".messenger-card");
    if (messengerCards[0]) {
        const card = messengerCards[0];
        setText(".messenger-card:nth-of-type(1) .messenger-title", brand.telegram.handle);
        setText(".messenger-card:nth-of-type(1) .messenger-description", brand.telegram.description);
        setAttr(".messenger-card:nth-of-type(1) .messenger-qr-link", "href", brand.telegram.url);
        setAttr(".messenger-card:nth-of-type(1) .messenger-action", "href", brand.telegram.url);
        setAttr(".messenger-card:nth-of-type(1) .messenger-qr", "src", buildQrUrl(brand.telegram.url));
        setAttr(
            ".messenger-card:nth-of-type(1) .messenger-qr",
            "alt",
            `QR-код для перехода в ${brand.siteName} в Telegram`,
        );
    }
    if (messengerCards[1]) {
        const card = messengerCards[1];
        setText(".messenger-card:nth-of-type(2) .messenger-title", brand.max.handle);
        setText(".messenger-card:nth-of-type(2) .messenger-description", brand.max.description);
        setAttr(".messenger-card:nth-of-type(2) .messenger-qr-link", "href", brand.max.url);
        setAttr(".messenger-card:nth-of-type(2) .messenger-action", "href", brand.max.url);
        setAttr(".messenger-card:nth-of-type(2) .messenger-qr", "src", buildQrUrl(brand.max.url));
        setAttr(
            ".messenger-card:nth-of-type(2) .messenger-qr",
            "alt",
            `QR-код для перехода в ${brand.siteName} в MAX`,
        );
    }

    const footerTexts = document.querySelectorAll(".footer-text");
    if (footerTexts[0]) footerTexts[0].textContent = brand.footerPrimary;
    if (footerTexts[1]) {
        footerTexts[1].innerHTML = `Обратная связь: <a href="${brand.supportTelegramUrl}" class="footer-link">${brand.footerSecondaryTelegramLabel}</a> • <a href="mailto:${brand.supportEmail}" class="footer-link">${brand.footerSecondaryEmailLabel}</a>`;
    }
}
