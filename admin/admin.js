const apiBase = (document.querySelector('meta[name="api-url"]')?.content || '').replace(/\/$/, '');
const tokenKey = 'stroy_admin_api_token';

const state = {
  includeAdmin: false,
  conversationsPage: 1,
  approvedPage: 1,
  currentTab: 'summary',
};

const els = {
  overlay: document.getElementById('login-overlay'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  tokenInput: document.getElementById('admin-token-input'),
  logout: document.getElementById('logout'),
  reloadAll: document.getElementById('reload-all'),
  includeAdminToggle: document.getElementById('include-admin-toggle'),
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
    ['Dislikes', summary.totals.dislikes],
  ];
  document.getElementById('summary-cards').innerHTML = cards.map(([label, value]) => `
    <div class="stat-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value)}</div>
    </div>
  `).join('');
}

async function loadSummary() {
  const [summary, timeseries, ratings, improve, topQueries, topFailures] = await Promise.all([
    adminFetch(`/admin/dashboard/summary?include_admin=${state.includeAdmin}`),
    adminFetch(`/admin/dashboard/timeseries?include_admin=${state.includeAdmin}`),
    adminFetch(`/admin/ratings?include_admin=${state.includeAdmin}`),
    adminFetch(`/admin/improve?include_admin=${state.includeAdmin}`),
    adminFetch(`/admin/top-queries?include_admin=${state.includeAdmin}&limit=12`),
    adminFetch(`/admin/top-failures?include_admin=${state.includeAdmin}&limit=12`),
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
  const payload = await adminFetch(`/admin/access-grants?${toQuery({ platform, only_active: onlyActive })}`);
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
    query: document.getElementById('approved-query').value.trim(),
  };
  const payload = await adminFetch(`/admin/approved-answers?${toQuery(params)}`);
  document.getElementById('approved-table').innerHTML = renderTable(
    [
      { label: 'Дата', render: (row) => escapeHtml(new Date(row.created_at).toLocaleString()) },
      { label: 'Платформа', render: (row) => pill(row.platform, 'blue') },
      { label: 'Mode', render: (row) => pill(row.mode, 'blue') },
      { label: 'Вопрос', render: (row) => `<strong>${escapeHtml(row.query_text)}</strong>` },
      { label: 'Ответ', render: (row) => escapeHtml(String(row.answer_text || '').slice(0, 220)) },
      { label: 'Embedding', render: (row) => pill(row.embedding_status || '—', row.embedding_status === 'ready' ? 'green' : 'amber') },
      { label: 'Scope', render: (row) => escapeHtml((row.package_scope || []).join(', ')) || '—' },
    ],
    payload.items,
  );
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
  document.getElementById('export-csv').addEventListener('click', async () => {
    await exportCsv();
    showToast('CSV выгружен.');
  });
}

async function boot() {
  bindEvents();
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
