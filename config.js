// config.js
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'  // Для локальной разработки
    : 'https://vibropress-ai-assistant.onrender.com';  // Production

export default API_URL;