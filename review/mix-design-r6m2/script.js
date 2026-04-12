const API_URL = (document.querySelector('meta[name="api-url"]')?.content || 'https://vibropress-v3-backend.onrender.com').replace(/\/$/, '');

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value, digits = 1) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : '—';
}

function setStatus(message, isError = false) {
  const el = $('status');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-error', Boolean(isError));
}

function collectPayload() {
  const payload = {
    target_class: $('mix-target-class').value,
    workability_class: $('mix-workability').value,
    strength_coefficient_a: Number($('mix-strength-a').value || 0.58),
    water_demand_mode: $('mix-water-mode').value || 'none',
    materials: {
      cement: {
        cement_type: $('mix-cement-type').value || 'CEM_I',
        grade: 500,
        activity_28d_mpa: Number($('mix-cement-activity').value || 52),
      },
      sand: {
        fineness_modulus: Number($('mix-sand-fineness').value || 2.1),
      },
      aggregate: {
        aggregate_type: $('mix-aggregate-type').value || 'crushed_granite',
        max_fraction_mm: Number($('mix-aggregate-max').value || 20),
      },
    },
  };

  if ($('mix-frost').value) payload.frost_resistance = $('mix-frost').value;
  if ($('mix-waterproofness').value) payload.waterproofness = $('mix-waterproofness').value;
  return payload;
}

async function requestPreview(payload) {
  const response = await fetch(`${API_URL}/api/v1/mix-design/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json();
}

function renderList(items, emptyText) {
  if (!Array.isArray(items) || !items.length) {
    return `<li>${escapeHtml(emptyText)}</li>`;
  }
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderConstraintList(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<li>Явные численные ограничения не заданы.</li>';
  }
  return items.map((item) => `<li><strong>${escapeHtml(item.label || 'Ограничение')}</strong>: ${escapeHtml(item.applied_value || item.requested || '—')}</li>`).join('');
}

function renderCard(card) {
  const start = card?.start_point || {};
  return `
    <div class="mix-card">
      <div>
        <h3 class="mix-title">${escapeHtml(card?.title || 'Preview')}</h3>
        <p class="mix-subtitle">${escapeHtml(card?.subtitle || '')}</p>
      </div>
      <div class="mix-grid">
        <div class="mix-kpi">
          <span class="mix-kpi-label">Цемент</span>
          <div class="mix-kpi-value">${formatNumber(start.cement_kg)} кг/м3</div>
        </div>
        <div class="mix-kpi">
          <span class="mix-kpi-label">Вода</span>
          <div class="mix-kpi-value">${formatNumber(start.water_kg)} кг/м3</div>
        </div>
        <div class="mix-kpi">
          <span class="mix-kpi-label">Песок</span>
          <div class="mix-kpi-value">${formatNumber(start.sand_kg)} кг/м3</div>
        </div>
        <div class="mix-kpi">
          <span class="mix-kpi-label">Щебень</span>
          <div class="mix-kpi-value">${formatNumber(start.aggregate_kg)} кг/м3</div>
        </div>
        <div class="mix-kpi">
          <span class="mix-kpi-label">В/Ц</span>
          <div class="mix-kpi-value">${formatNumber(start.wc_ratio, 3)}</div>
        </div>
        <div class="mix-kpi">
          <span class="mix-kpi-label">Метод</span>
          <div class="mix-kpi-value">${escapeHtml(card?.method_id || '—')}</div>
        </div>
      </div>
      <div class="mix-grid">
        <div class="mix-block">
          <span class="mix-block-title">Ограничения</span>
          <ul>${renderConstraintList(card?.applied_constraints)}</ul>
        </div>
        <div class="mix-block">
          <span class="mix-block-title">Что проверить дальше</span>
          <ul>${renderList(card?.next_checks, 'Добавьте пробные замесы и контрольные испытания.')}</ul>
        </div>
      </div>
      <div class="mix-grid">
        <div class="mix-block">
          <span class="mix-block-title">Допущения</span>
          <ul>${renderList(card?.assumptions, 'Допущения не зафиксированы.')}</ul>
        </div>
        <div class="mix-block">
          <span class="mix-block-title">Риски</span>
          <ul>${renderList(card?.warnings, 'Существенные риски не перечислены.')}</ul>
        </div>
      </div>
      <div class="mix-block">
        <span class="mix-block-title">Markdown preview</span>
        <div class="mix-markdown">${escapeHtml(card?.markdown || '')}</div>
      </div>
    </div>
  `;
}

async function runPreview() {
  setStatus('Строю preview...');
  $('result').innerHTML = '';
  try {
    const payload = collectPayload();
    const card = await requestPreview(payload);
    $('result').innerHTML = renderCard(card);
    setStatus('Preview построен. Можно смотреть и делиться ссылкой.');
  } catch (error) {
    setStatus(`Не удалось построить preview: ${error.message}`, true);
    $('result').innerHTML = '<div class="result-empty">Preview не построился. Сообщение об ошибке показано выше.</div>';
  }
}

async function copyReviewLink() {
  const value = window.location.href;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
  } else {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  setStatus('Ссылка скопирована. Можно отправлять review-группе.');
}

document.addEventListener('DOMContentLoaded', async () => {
  $('run-preview')?.addEventListener('click', runPreview);
  $('copy-review-link')?.addEventListener('click', copyReviewLink);
  await runPreview();
});
