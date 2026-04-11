const apiBase = (document.querySelector('meta[name="api-url"]')?.content || '').replace(/\/$/, '');
const tokenKey = 'stroy_admin_api_token';

const state = {
  includeAdmin: false,
  conversationsPage: 1,
  approvedPage: 1,
  currentTab: 'summary',
  promoCodeFilter: '',
};

const els = {
  overlay: document.getElementById('login-overlay'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  tokenInput: document.getElementById('admin-token-input'),
  logout: document.getElementById('logout'),
  reloadAll: document.getElementById('reload-all'),
  includeAdminToggle: document.getElementById('include-admin-toggle'),
  promoFilterInput: document.getElementById('global-promo-filter'),
  promoApply: document.getElementById('apply-promo-filter'),
  promoClear: document.getElementById('clear-promo-filter'),
  toast: document.getElementById('toast'),
};

function getToken() {
  return sessionStorage.getItem(tokenKey) || '';
}

function setToken(value) {
  sessionStorage.setItem(tokenKey, value);
}

function clearToken() {
  sessionStorage.removeItem(tokenKey);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  window.setTimeout(() => els.toast.classList.add('hidden'), 2600);
}

async function adminFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Token': token,
    ...(options.headers || {}),
  };
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  if (response.status === 401) {
    clearToken();
    els.overlay.classList.remove('hidden');
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `HTTP ${response.status}`);
  }
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTable(columns, rows, rowClassFn = null) {
  if (!rows.length) {
    return '<div class="empty-state">Нет данных.</div>';
  }
  const head = columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join('');
  const body = rows.map((row) => {
    const cls = rowClassFn ? rowClassFn(row) : '';
    const cells = columns.map((col) => `<td>${col.render ? col.render(row) : escapeHtml(row[col.key])}</td>`).join('');
    return `<tr class="${cls}">${cells}</tr>`;
  }).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function pill(label, tone = 'blue') {
  return `<span class="pill ${tone}">${escapeHtml(label)}</span>`;
}

function boolTone(value, trueLabel = 'Да', falseLabel = 'Нет') {
  return value ? pill(trueLabel, 'green') : pill(falseLabel, 'amber');
}

function numberInputValue(id, fallback) {
  const raw = Number(document.getElementById(id)?.value || fallback);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return raw;
}

function currentPromoFilter() {
  return (state.promoCodeFilter || '').trim().toUpperCase();
}

function syncPromoFilterInputs() {
  const value = currentPromoFilter();
  if (els.promoFilterInput) els.promoFilterInput.value = value;
  const conversationPromo = document.getElementById('filter-promo-code');
  if (conversationPromo && !conversationPromo.value.trim()) conversationPromo.value = value;
  const accessPromo = document.getElementById('access-promo-code');
  if (accessPromo && !accessPromo.value.trim()) accessPromo.value = value;
}

async function applyPromoFilter(rawValue) {
  state.promoCodeFilter = (rawValue || '').trim().toUpperCase();
  state.conversationsPage = 1;
  state.approvedPage = 1;
  syncPromoFilterInputs();
  await loadActiveTab();
}

function renderBarList(targetId, items, labelKey, valueKey) {
  const root = document.getElementById(targetId);
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey] || 0)));
  root.innerHTML = items.map((item) => {
    const value = Number(item[valueKey] || 0);
    const width = Math.max(4, (value / max) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(item[labelKey] || '—')}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
        <div class="bar-value">${value}</div>
      </div>
    `;
  }).join('') || '<div class="empty-state">Нет данных.</div>';
}

function renderKeyValueTable(targetId, rows) {
  const root = document.getElementById(targetId);
  if (!rows.length) {
    root.innerHTML = '<div class="empty-state">Нет данных.</div>';
    return;
  }
  root.innerHTML = `<table><tbody>${rows.map((row) => `
    <tr>
      <th>${escapeHtml(row.label)}</th>
      <td>${escapeHtml(row.value)}</td>
    </tr>
  `).join('')}</tbody></table>`;
}

function setSummaryCards(summary) {
  const cards = [
    ['Пользователи', summary.totals.users],
    ['Сессии', summary.totals.sessions],
    ['Сообщения', summary.totals.messages],
    ['Диалоги', summary.totals.conversations],
    ['Improve', summary.totals.improve],
    ['Approved', summary.totals.approved_answers],
    ['Likes', summary.totals.likes],
    ['Neutral', summary.totals.neutral],
    ['Dislikes', summary.totals.dislikes],
    ['Rated', summary.totals.rated],
    ['Notes', summary.totals.feedback_notes],
  ];
  document.getElementById('summary-cards').innerHTML = cards.map(([label, value]) => `
    <div class="stat-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value)}</div>
    </div>
  `).join('');
}

function setNewsCards(targetId, totals = {}) {
  const cards = [
    ['Клики', totals.request_clicks || 0],
    ['Выдачи', totals.served || 0],
    ['CTR', `${totals.ctr_click_to_served || 0}%`],
    ['Открытия', totals.source_opens || 0],
    ['Повторы', totals.repeat_served || 0],
    ['Active cards', totals.active_items || 0],
  ];
  const root = document.getElementById(targetId);
  if (!root) return;
  root.innerHTML = cards.map(([label, value]) => `
    <div class="stat-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value)}</div>
    </div>
  `).join('');
}

async function loadSummary() {
  const promoCode = currentPromoFilter();
  const [summary, timeseries, ratings, improve, topQueries, topFailures, newsSummary] = await Promise.all([
    adminFetch(`/admin/dashboard/summary?${toQuery({ include_admin: state.includeAdmin, promo_code: promoCode })}`),
    adminFetch(`/admin/dashboard/timeseries?${toQuery({ include_admin: state.includeAdmin, promo_code: promoCode })}`),
    adminFetch(`/admin/ratings?${toQuery({ include_admin: state.includeAdmin, promo_code: promoCode })}`),
    adminFetch(`/admin/improve?${toQuery({ include_admin: state.includeAdmin, promo_code: promoCode })}`),
    adminFetch(`/admin/top-queries?${toQuery({ include_admin: state.includeAdmin, promo_code: promoCode, limit: 12 })}`),
    adminFetch(`/admin/top-failures?${toQuery({ include_admin: state.includeAdmin, promo_code: promoCode, limit: 12 })}`),
    adminFetch(`/admin/news/summary?${toQuery({ include_admin: state.includeAdmin, promo_code: promoCode })}`),
  ]);

  setSummaryCards(summary);
  renderBarList('platform-bars', timeseries.platform_breakdown, 'platform', 'count');
  renderBarList('mode-bars', timeseries.mode_breakdown, 'mode', 'count');
  renderKeyValueTable('activity-table', timeseries.activity.slice(-14).reverse().map((item) => ({ label: item.date, value: item.count })));
  renderKeyValueTable('improve-summary', [
    { label: 'Всего improve', value: improve.total },
    { label: 'Успешно', value: improve.success },
    { label: 'С auto-web', value: improve.auto_web },
    { label: 'Сохранено в approved', value: improve.approved_saved },
    { label: 'Суммарная стоимость', value: `$${improve.cost_usd}` },
    { label: 'Средний рейтинг', value: ratings.average_rating },
  ]);

  document.getElementById('top-queries').innerHTML = renderTable(
    [
      { label: 'Вопрос', key: 'query_text' },
      { label: 'Повторов', render: (row) => escapeHtml(row.count) },
      { label: 'Modes', render: (row) => escapeHtml(Object.keys(row.modes || {}).join(', ')) },
      { label: 'Последний', render: (row) => escapeHtml(new Date(row.last_seen_at).toLocaleString()) },
    ],
    topQueries.items,
  );

  document.getElementById('top-failures').innerHTML = renderTable(
    [
      { label: 'Вопрос', key: 'query_text' },
      { label: 'Случаев', render: (row) => escapeHtml(row.count) },
      { label: 'Improve', render: (row) => escapeHtml(row.improved) },
      { label: 'Auto-web', render: (row) => escapeHtml(row.auto_web) },
      { label: 'Disliked', render: (row) => escapeHtml(row.disliked) },
    ],
    topFailures.items,
  );

  document.getElementById('promo-breakdown').innerHTML = renderTable(
    [
      { label: 'РџСЂРѕРјРѕРєРѕРґ', render: (row) => `<strong>${escapeHtml(row.promo_code)}</strong>` },
      { label: 'РџРѕР»СЊР·РѕРІР°С‚РµР»Рё', render: (row) => escapeHtml(row.users) },
      { label: 'РЎРµСЃСЃРёРё', render: (row) => escapeHtml(row.sessions) },
      { label: 'Р”РёР°Р»РѕРіРё', render: (row) => escapeHtml(row.conversations) },
      { label: 'AVG', render: (row) => escapeHtml(row.average_rating) },
      { label: 'РџР»Р°С‚С„РѕСЂРјС‹', render: (row) => escapeHtml(Object.keys(row.platforms || {}).join(', ')) },
    ],
    summary.promo_breakdown || [],
  );

  renderKeyValueTable('feedback-signals', [
    { label: 'РЎ РѕС†РµРЅРєРѕР№', value: summary.feedback_signals?.rated || 0 },
    { label: 'Р‘РµР· РѕС†РµРЅРєРё', value: summary.feedback_signals?.unrated || 0 },
    { label: 'Р•СЃС‚СЊ РєРѕРјРјРµРЅС‚Р°СЂРёР№', value: summary.feedback_signals?.note_count || 0 },
    { label: 'РќРµРіР°С‚РёРІ СЃ РєРѕРЅС‚РµРєСЃС‚РѕРј', value: summary.feedback_signals?.negative_with_context || 0 },
    { label: 'РўРѕРї С‚РµРіРѕРІ', value: (summary.feedback_signals?.top_tags || []).map((item) => `${item.tag}: ${item.count}`).join(' | ') || 'вЂ”' },
  ]);
  setNewsCards('news-summary-cards', newsSummary.totals || {});
  document.getElementById('news-summary-sources').innerHTML = renderTable(
    [
      { label: 'Источник', key: 'source_name' },
      { label: 'Выдач', render: (row) => escapeHtml(row.count) },
    ],
    newsSummary.top_sources || [],
  );
}

async function loadNews() {
  const promoCode = currentPromoFilter();
  const [summary, itemsPayload] = await Promise.all([
    adminFetch(`/admin/news/summary?${toQuery({ include_admin: state.includeAdmin, promo_code: promoCode })}`),
    adminFetch('/admin/news/items?status=active&limit=50'),
  ]);

  setNewsCards('news-admin-summary', summary.totals || {});
  document.getElementById('news-items-table').innerHTML = renderTable(
    [
      { label: 'Дата', render: (row) => escapeHtml(row.published_at ? new Date(row.published_at).toLocaleDateString() : '—') },
      { label: 'Источник', render: (row) => pill(row.source_name || row.source_domain || '—', 'blue') },
      { label: 'Заголовок', render: (row) => `<strong>${escapeHtml(row.title_ru || row.title_original || '—')}</strong>` },
      { label: 'Теги', render: (row) => escapeHtml((row.topic_tags || []).join(', ') || '—') },
      { label: 'Выдано', render: (row) => escapeHtml(row.served_count) },
      { label: 'Score', render: (row) => escapeHtml(row.score) },
    ],
    itemsPayload.items || [],
  );

  document.getElementById('news-deliveries-table').innerHTML = renderTable(
    [
      { label: 'Время', render: (row) => escapeHtml(row.created_at ? new Date(row.created_at).toLocaleString() : '—') },
      { label: 'Платформа', render: (row) => pill(row.platform || '—', 'blue') },
      { label: 'Promo', render: (row) => row.promo_code ? pill(row.promo_code, 'green') : '—' },
      { label: 'Новость', render: (row) => escapeHtml(row.title_ru || '—') },
      { label: 'Источник', render: (row) => escapeHtml(row.source_name || '—') },
      { label: 'Повтор', render: (row) => boolTone(row.repeated, 'Да', 'Нет') },
    ],
    summary.recent_deliveries || [],
  );

  document.getElementById('news-top-table').innerHTML = renderTable(
    [
      { label: 'Новость', render: (row) => `<strong>${escapeHtml(row.title_ru || '—')}</strong>` },
      { label: 'Источник', render: (row) => escapeHtml(row.source_name || '—') },
      { label: 'Выдач', render: (row) => escapeHtml(row.count) },
    ],
    summary.top_news || [],
  );

  document.getElementById('news-promo-table').innerHTML = renderTable(
    [
      { label: 'Промокод', render: (row) => `<strong>${escapeHtml(row.promo_code || '—')}</strong>` },
      { label: 'Выдач', render: (row) => escapeHtml(row.count) },
    ],
    summary.promo_breakdown || [],
  );
}

function conversationFilters() {
  const likedRaw = document.getElementById('filter-liked').value;
  const improvedRaw = document.getElementById('filter-improved').value;
  const approvedRaw = document.getElementById('filter-approved').value;
  return {
    query: document.getElementById('filter-query').value.trim(),
    platform: document.getElementById('filter-platform').value,
    mode: document.getElementById('filter-mode').value,
    liked: likedRaw === '' ? null : likedRaw === 'true',
    improved: improvedRaw === '' ? null : improvedRaw === 'true',
    approved_saved: approvedRaw === '' ? null : approvedRaw === 'true',
    promo_code: document.getElementById('filter-promo-code').value.trim() || currentPromoFilter(),
    date_from: document.getElementById('filter-date-from').value,
    date_to: document.getElementById('filter-date-to').value,
  };
}

function toQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    search.set(key, value);
  });
  return search.toString();
}

async function loadConversations() {
  const filters = conversationFilters();
  const params = {
    page: state.conversationsPage,
    page_size: 40,
    include_admin: state.includeAdmin,
    ...filters,
  };
  const payload = await adminFetch(`/admin/conversations?${toQuery(params)}`);
  document.getElementById('conversations-page-label').textContent = `Страница ${payload.page} · ${payload.total} записей`;
  document.getElementById('conversations-prev').disabled = payload.page <= 1;
  document.getElementById('conversations-next').disabled = payload.page * payload.page_size >= payload.total;

  const html = renderTable(
    [
      { label: 'Время', render: (row) => escapeHtml(new Date(row.question_time).toLocaleString()) },
      { label: 'Платформа', render: (row) => pill(row.source_channel, 'blue') },
      { label: 'Promo', render: (row) => row.promo_code ? pill(row.promo_code, 'green') : 'вЂ”' },
      { label: 'Mode', render: (row) => pill(row.mode, row.mode === 'unknown' ? 'amber' : 'blue') },
      { label: 'Вопрос', render: (row) => `<strong>${escapeHtml(row.user_question)}</strong>` },
      { label: 'Ответ', render: (row) => escapeHtml(String(row.assistant_answer || '').slice(0, 180)) },
      { label: 'Флаги', render: (row) => `
        <div class="status-line">
          ${row.used_improve ? pill('improved', 'green') : ''}
          ${row.approved_saved ? pill('approved', 'green') : ''}
          ${row.is_auto_web ? pill('auto-web', 'amber') : ''}
          ${row.is_admin_traffic ? pill('admin', 'red') : ''}
        </div>
      ` },
      { label: 'Рейтинг', render: (row) => row.has_rating ? escapeHtml(row.rating) : '—' },
      { label: 'Feedback', render: (row) => escapeHtml(row.feedback_note || (row.feedback_tags || []).join(', ') || 'вЂ”') },
    ],
    payload.items,
    () => 'clickable',
  );

  document.getElementById('conversations-table').innerHTML = html;
  [...document.querySelectorAll('#conversations-table tbody tr')].forEach((rowEl, index) => {
    rowEl.addEventListener('click', () => loadConversationDetail(payload.items[index].session_id, payload.items[index].session_title));
  });
}

async function loadConversationDetail(sessionId, sessionTitle = '') {
  const payload = await adminFetch(`/admin/conversations/${encodeURIComponent(sessionId)}?include_admin=${state.includeAdmin}`);
  const root = document.getElementById('conversation-detail');
  if (!payload.messages?.length) {
    root.innerHTML = '<div class="empty-state">Для этой сессии нет доступных сообщений.</div>';
    return;
  }
  root.innerHTML = `
    <div class="message-meta"><strong>${escapeHtml(sessionTitle || sessionId)}</strong> · session_id: <code>${escapeHtml(sessionId)}</code>${payload.is_admin_traffic ? ' · admin traffic' : ''}</div>
    ${payload.messages.map((msg) => `
      <article class="message-card ${msg.role}">
        <div class="message-meta">${escapeHtml(msg.role)} · ${escapeHtml(new Date(msg.created_at).toLocaleString())}${msg.model_used ? ` · ${escapeHtml(msg.model_used)}` : ''}${msg.rating !== null && msg.rating !== undefined ? ` · rating ${escapeHtml(msg.rating)}` : ''}</div>
        <div class="message-content">${escapeHtml(msg.content)}</div>
      </article>
    `).join('')}
  `;
}

async function loadPromoCodes() {
  const payload = await adminFetch('/admin/promo-codes');
  document.getElementById('promo-codes-table').innerHTML = renderTable(
    [
      { label: 'Код', render: (row) => `<strong>${escapeHtml(row.code)}</strong>` },
      { label: 'Статус', render: (row) => row.active ? pill('active', 'green') : pill('disabled', 'red') },
      { label: 'Bundles', render: (row) => escapeHtml((row.bundle_keys || []).join(', ')) || '—' },
      { label: 'Packages', render: (row) => escapeHtml((row.packages || []).join(', ')) || '—' },
      { label: 'Активаций', render: (row) => escapeHtml(`${row.activations_count || 0}${row.max_activations ? ` / ${row.max_activations}` : ''}`) },
      { label: 'Действия', render: (row) => `
        <div class="row-actions">
          <button class="btn ${row.active ? 'btn-danger' : 'btn-success'}" data-action="${row.active ? 'disable' : 'enable'}" data-code="${escapeHtml(row.code)}">${row.active ? 'Отключить' : 'Включить'}</button>
          <button class="btn btn-ghost" data-action="revoke" data-code="${escapeHtml(row.code)}">Revoke grants</button>
        </div>
      ` },
    ],
    payload.items,
  );

  document.querySelectorAll('#promo-codes-table [data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      const code = button.dataset.code;
      const path = action === 'disable'
        ? `/admin/promo-codes/${encodeURIComponent(code)}/disable`
        : action === 'enable'
          ? `/admin/promo-codes/${encodeURIComponent(code)}/enable`
          : `/admin/promo-codes/${encodeURIComponent(code)}/revoke-grants`;
      await adminFetch(path, { method: 'POST' });
      showToast(`Промокод ${code}: ${action}`);
      await Promise.all([loadPromoCodes(), loadAccessGrants()]);
    });
  });
}

async function loadAccessGrants() {
  const platform = document.getElementById('access-platform').value;
  const onlyActive = document.getElementById('access-only-active').checked;
  const promoCode = document.getElementById('access-promo-code').value.trim() || currentPromoFilter();
  const payload = await adminFetch(`/admin/access-grants?${toQuery({ platform, only_active: onlyActive, promo_code: promoCode })}`);
  document.getElementById('access-grants-table').innerHTML = renderTable(
    [
      { label: 'Платформа', key: 'platform' },
      { label: 'User ID', key: 'platform_user_id' },
      { label: 'Промокод', render: (row) => escapeHtml(row.promo_code || '—') },
      { label: 'Статус', render: (row) => row.active ? pill('active', 'green') : pill('revoked', 'red') },
      { label: 'Пакеты', render: (row) => escapeHtml((row.packages || []).join(', ')) || '—' },
      { label: 'Выдан', render: (row) => escapeHtml(new Date(row.granted_at).toLocaleString()) },
      { label: 'Действия', render: (row) => row.active ? `<button class="btn btn-danger" data-platform="${escapeHtml(row.platform)}" data-user-id="${escapeHtml(row.platform_user_id)}">Отозвать</button>` : '—' },
    ],
    payload.items,
  );

  document.querySelectorAll('#access-grants-table [data-user-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      await adminFetch('/admin/access-grants/revoke', {
        method: 'POST',
        body: JSON.stringify({
          platform: button.dataset.platform,
          platform_user_id: button.dataset.userId,
        }),
      });
      showToast('Доступ отозван.');
      await loadAccessGrants();
    });
  });
}

async function loadApprovedAnswers() {
  const params = {
    page: state.approvedPage,
    page_size: 40,
    include_admin: state.includeAdmin,
    platform: document.getElementById('approved-platform').value,
    mode: document.getElementById('approved-mode').value,
    promo_code: currentPromoFilter(),
    query: document.getElementById('approved-query').value.trim(),
  };
  const payload = await adminFetch(`/admin/approved-answers?${toQuery(params)}`);
  document.getElementById('approved-table').innerHTML = renderTable(
    [
      { label: 'Дата', render: (row) => escapeHtml(new Date(row.created_at).toLocaleString()) },
      { label: 'Платформа', render: (row) => pill(row.platform, 'blue') },
      { label: 'Promo', render: (row) => row.promo_code ? pill(row.promo_code, 'green') : 'вЂ”' },
      { label: 'Mode', render: (row) => pill(row.mode, 'blue') },
      { label: 'Вопрос', render: (row) => `<strong>${escapeHtml(row.query_text)}</strong>` },
      { label: 'Ответ', render: (row) => escapeHtml(String(row.answer_text || '').slice(0, 220)) },
      { label: 'Embedding', render: (row) => pill(row.embedding_status || '—', row.embedding_status === 'ready' ? 'green' : 'amber') },
      { label: 'Scope', render: (row) => escapeHtml((row.package_scope || []).join(', ')) || '—' },
    ],
    payload.items,
  );
}

function collectorFilters() {
  return {
    candidateStatus: document.getElementById('collector-candidate-status').value,
    queueStatus: document.getElementById('collector-queue-status').value,
    limit: numberInputValue('collector-limit', 30),
  };
}

function setCollectorSummary(stats) {
  const cards = [
    ['Шум отсеян', stats.candidate_status_counts?.noise || 0],
    ['Ждут ответа', stats.candidate_status_counts?.needs_answer_generation || 0],
    ['Нужен повтор', stats.candidate_status_counts?.validated_retry || 0],
    ['Нужна проверка', stats.candidate_status_counts?.arbiter_required || 0],
    ['Завершено', stats.candidate_status_counts?.committed || 0],
    ['Сохранено в БЗ', stats.knowledge_status_counts?.auto_verified || 0],
    ['Безопасный abstain', stats.knowledge_status_counts?.auto_abstain || 0],
    ['Отклонено как шум', stats.knowledge_status_counts?.rejected_noise || 0],
  ];
  document.getElementById('collector-summary-cards').innerHTML = cards.map(([label, value]) => `
    <div class="stat-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value)}</div>
    </div>
  `).join('');
}

async function runCollectorBatch(path, body, successMessage) {
  const payload = await adminFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  showToast(successMessage);
  await loadCollector();
  return payload;
}

async function loadCollector() {
  const filters = collectorFilters();
  const [stats, candidates, queue] = await Promise.all([
    adminFetch('/collector/quality/stats'),
    adminFetch(`/collector/quality/candidates?${toQuery({ status: filters.candidateStatus, limit: 50 })}`),
    adminFetch(`/collector/quality/queue?${toQuery({ status: filters.queueStatus, limit: 50 })}`),
  ]);

  setCollectorSummary(stats);

  document.getElementById('collector-candidates-table').innerHTML = renderTable(
    [
      { label: 'ID', render: (row) => `<strong>${escapeHtml(row.id)}</strong>` },
      { label: 'Статус', render: (row) => pill(row.candidate_status || '—', row.candidate_status === 'arbiter_required' ? 'red' : row.candidate_status === 'committed' ? 'green' : 'amber') },
      { label: 'Тип сообщения', render: (row) => escapeHtml(row.extraction_type || '—') },
      { label: 'Что система увидела', render: (row) => `<div class="mono-snippet">${escapeHtml(row.extracted_question || row.text_clean || '—')}</div>` },
      { label: 'Итог', render: (row) => `<div class="mono-snippet">${escapeHtml(row.knowledge_status || row.latest_validation_status || row.latest_run_type || '—')}</div>` },
      { label: 'Действия', render: (row) => `
        <div class="row-actions">
          ${row.candidate_status === 'arbiter_required' ? `<button class="btn btn-success" data-collector-action="approve" data-candidate-id="${escapeHtml(row.id)}">Одобрить</button>` : ''}
          ${row.candidate_status === 'arbiter_required' ? `<button class="btn btn-danger" data-collector-action="reject" data-candidate-id="${escapeHtml(row.id)}">В abstain</button>` : ''}
          ${row.candidate_status === 'arbiter_required' || row.candidate_status === 'validated_retry' ? `<button class="btn btn-ghost" data-collector-action="retry" data-candidate-id="${escapeHtml(row.id)}">Перезапустить</button>` : ''}
        </div>
      ` },
    ],
    candidates.items || [],
  );

  document.getElementById('collector-review-table').innerHTML = renderTable(
    [
      { label: 'ID', render: (row) => `<strong>${escapeHtml(row.candidate_id)}</strong>` },
      { label: 'Причина', render: (row) => pill(row.reason_code || '—', 'red') },
      { label: 'Критичность', render: (row) => pill(row.severity || 'medium', row.severity === 'high' ? 'red' : 'amber') },
      { label: 'Вопрос', render: (row) => `<div class="mono-snippet">${escapeHtml(row.extracted_question || row.text_clean || '—')}</div>` },
      { label: 'Действия', render: (row) => `
        <div class="row-actions">
          <button class="btn btn-success" data-collector-action="approve" data-candidate-id="${escapeHtml(row.candidate_id)}">Одобрить</button>
          <button class="btn btn-danger" data-collector-action="reject" data-candidate-id="${escapeHtml(row.candidate_id)}">В abstain</button>
          <button class="btn btn-ghost" data-collector-action="retry" data-candidate-id="${escapeHtml(row.candidate_id)}">Перезапустить</button>
        </div>
      ` },
    ],
    queue.items || [],
  );

  document.querySelectorAll('[data-collector-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const candidateId = Number(button.dataset.candidateId);
      const action = button.dataset.collectorAction;
      if (action === 'approve') {
        const editedAnswer = window.prompt('Если хотите, вставьте свой финальный ответ. Можно оставить пустым, и тогда система одобрит текущий ответ как есть.', '') || '';
        await adminFetch('/collector/review/approve', {
          method: 'POST',
          body: JSON.stringify({ candidate_id: candidateId, edited_answer: editedAnswer || null }),
        });
        showToast(`Кандидат ${candidateId} одобрен и сохранён.`);
        await loadCollector();
        return;
      }
      if (action === 'reject') {
        await adminFetch('/collector/review/reject', {
          method: 'POST',
          body: JSON.stringify({ candidate_id: candidateId, as_abstain: true }),
        });
        showToast(`Кандидат ${candidateId} переведён в safe abstain.`);
        await loadCollector();
        return;
      }
      if (action === 'retry') {
        await adminFetch('/collector/review/retry', {
          method: 'POST',
          body: JSON.stringify({ candidate_id: candidateId }),
        });
        showToast(`Кандидат ${candidateId} отправлен на повторную обработку.`);
        await loadCollector();
      }
    });
  });
}

function collectPromoCreatePayload() {
  const bundles = document.getElementById('promo-bundles').value
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    code: document.getElementById('promo-code').value.trim() || undefined,
    description: document.getElementById('promo-description').value.trim(),
    platforms: ['telegram', 'max', 'web'],
    bundle_keys: bundles,
    max_activations: document.getElementById('promo-max-activations').value ? Number(document.getElementById('promo-max-activations').value) : null,
    expires_at: document.getElementById('promo-expires-at').value || null,
  };
}

async function handlePromoCreate(event) {
  event.preventDefault();
  await adminFetch('/admin/promo-codes', {
    method: 'POST',
    body: JSON.stringify(collectPromoCreatePayload()),
  });
  event.currentTarget.reset();
  showToast('Промокод создан.');
  await loadPromoCodes();
}

async function exportCsv() {
  const filters = conversationFilters();
  const search = toQuery({ ...filters, include_admin: state.includeAdmin, limit: 5000 });
  const response = await fetch(`${apiBase}/admin/exports/chat-pairs.csv?${search}`, {
    headers: { 'X-Admin-Token': getToken() },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'chat_pairs_export.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function verifyToken() {
  await adminFetch('/admin/dashboard/summary?include_admin=false');
}

async function loadActiveTab() {
  if (state.currentTab === 'summary') {
    await loadSummary();
    return;
  }
  if (state.currentTab === 'conversations') {
    await loadConversations();
    return;
  }
  if (state.currentTab === 'promos') {
    await loadPromoCodes();
    return;
  }
  if (state.currentTab === 'access') {
    await loadAccessGrants();
    return;
  }
  if (state.currentTab === 'collector') {
    await loadCollector();
    return;
  }
  if (state.currentTab === 'news') {
    await loadNews();
    return;
  }
  if (state.currentTab === 'approved') {
    await loadApprovedAnswers();
  }
}

function setActiveTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.nav-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tab}`);
  });
}

function bindEvents() {
  els.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = els.tokenInput.value.trim();
    if (!token) {
      els.loginError.textContent = 'Введите токен.';
      return;
    }
    setToken(token);
    try {
      await verifyToken();
      els.loginError.textContent = '';
      els.overlay.classList.add('hidden');
      await loadActiveTab();
    } catch (error) {
      clearToken();
      els.loginError.textContent = 'Токен не подошёл.';
    }
  });

  els.logout.addEventListener('click', () => {
    clearToken();
    els.overlay.classList.remove('hidden');
  });

  els.reloadAll.addEventListener('click', async () => {
    await loadActiveTab();
    showToast('Данные обновлены.');
  });

  els.includeAdminToggle.addEventListener('change', async () => {
    state.includeAdmin = els.includeAdminToggle.checked;
    state.conversationsPage = 1;
    await loadActiveTab();
  });

  els.promoApply.addEventListener('click', async () => {
    await applyPromoFilter(els.promoFilterInput.value);
  });

  els.promoClear.addEventListener('click', async () => {
    const conversationPromo = document.getElementById('filter-promo-code');
    const accessPromo = document.getElementById('access-promo-code');
    if (conversationPromo) conversationPromo.value = '';
    if (accessPromo) accessPromo.value = '';
    await applyPromoFilter('');
  });

  els.promoFilterInput.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    await applyPromoFilter(els.promoFilterInput.value);
  });

  document.querySelectorAll('.nav-tab').forEach((button) => {
    button.addEventListener('click', async () => {
      setActiveTab(button.dataset.tab);
      await loadActiveTab();
    });
  });

  document.getElementById('conversation-filters').addEventListener('submit', async (event) => {
    event.preventDefault();
    state.conversationsPage = 1;
    await loadConversations();
  });

  document.getElementById('conversations-prev').addEventListener('click', async () => {
    if (state.conversationsPage > 1) {
      state.conversationsPage -= 1;
      await loadConversations();
    }
  });

  document.getElementById('conversations-next').addEventListener('click', async () => {
    state.conversationsPage += 1;
    await loadConversations();
  });

  document.getElementById('promo-create-form').addEventListener('submit', handlePromoCreate);
  document.getElementById('access-filters').addEventListener('submit', async (event) => {
    event.preventDefault();
    await loadAccessGrants();
  });
  document.getElementById('approved-filters').addEventListener('submit', async (event) => {
    event.preventDefault();
    state.approvedPage = 1;
    await loadApprovedAnswers();
  });
  document.getElementById('collector-controls').addEventListener('submit', async (event) => {
    event.preventDefault();
    await loadCollector();
  });
  document.getElementById('collector-run-collect').addEventListener('click', async () => {
    const limit = numberInputValue('collector-limit', 30);
    await runCollectorBatch('/collector/collect', { limit, since_last: true }, 'Новые Telegram-сообщения собраны.');
  });
  document.getElementById('collector-run-extract').addEventListener('click', async () => {
    const limit = numberInputValue('collector-limit', 30);
    await runCollectorBatch('/collector/extract', { limit }, 'Полезные вопросы выделены из сырья.');
  });
  document.getElementById('collector-run-answer').addEventListener('click', async () => {
    const limit = numberInputValue('collector-limit', 30);
    await runCollectorBatch('/collector/answer', { limit }, 'Ответы на кандидатов построены.');
  });
  document.getElementById('collector-run-validate').addEventListener('click', async () => {
    const limit = numberInputValue('collector-limit', 30);
    await runCollectorBatch('/collector/validate', { limit }, 'Проверка качества завершена.');
  });
  document.getElementById('collector-run-commit').addEventListener('click', async () => {
    const limit = numberInputValue('collector-limit', 30);
    await runCollectorBatch('/collector/commit', { limit }, 'Безопасные записи сохранены в базу.');
  });
  document.getElementById('collector-run-requeue').addEventListener('click', async () => {
    const limit = numberInputValue('collector-limit', 30);
    await runCollectorBatch('/collector/requeue', { limit }, 'Кейсы retry возвращены в обработку.');
  });
  document.getElementById('collector-sync-neon').addEventListener('click', async () => {
    const limit = numberInputValue('collector-limit', 30);
    await runCollectorBatch('/collector/sync-neon', { limit }, 'Проверенные ответы синхронизированы в Neon.');
  });
  const newsRefreshButton = document.getElementById('news-refresh-run');
  if (newsRefreshButton) {
    newsRefreshButton.addEventListener('click', async () => {
      await adminFetch('/admin/news/refresh', {
        method: 'POST',
        body: JSON.stringify({ max_items: 8 }),
      });
      showToast('Пул новостей обновлён.');
      await loadNews();
      await loadSummary();
    });
  }
  document.getElementById('export-csv').addEventListener('click', async () => {
    await exportCsv();
    showToast('CSV выгружен.');
  });
}

async function boot() {
  bindEvents();
  syncPromoFilterInputs();
  const token = getToken();
  if (!token) {
    els.overlay.classList.remove('hidden');
    return;
  }
  try {
    await verifyToken();
    els.overlay.classList.add('hidden');
    await loadActiveTab();
  } catch {
    clearToken();
    els.overlay.classList.remove('hidden');
  }
}

boot().catch((error) => {
  console.error(error);
  showToast(error.message || 'Ошибка загрузки админки.');
});
