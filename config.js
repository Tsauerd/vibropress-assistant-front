// config.js
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'  // Для локальной разработки
    : 'https://vibropress-assistant-backend.onrender.com';  // Production

export default API_URL;