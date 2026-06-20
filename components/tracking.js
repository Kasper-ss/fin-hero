/**
 * Трекинг расходов — метод конвертов
 */

import { formatMoney, formatDate, generateId, haptic } from '../utils/helpers.js';
import { askAmount } from '../utils/modal.js';
import { showToast } from '../utils/ui.js';
import { EXPENSE_CATEGORIES } from '../data/defaultData.js';
import { distributeEnvelopes, syncYearlyBudget } from '../utils/calculations.js';

/** Рендер трекинга */
export function renderTracking(container, data, onUpdate) {
  const { envelopes, transactions, profile, budgetRule } = data;
  const budgetTotal = Object.values(envelopes).reduce((s, e) => s + e.budget, 0);

  container.innerHTML = `
    <div class="tracking fade-in">
      <h2 class="page-title">💼 Конверты</h2>
      <p class="page-subtitle">Настрой бюджет сверху → нажми «Сохранить» → суммы появятся на карточках</p>

      <section class="budget-setup glass">
        <h3 class="section-title">⚙️ Распределение бюджета</h3>
        <p class="budget-income-hint">Доход: <strong>${formatMoney(profile.monthlyIncome)}</strong>/мес</p>
        <div class="budget-inputs" id="budget-inputs">
          ${Object.entries(envelopes).map(([key, env]) => `
            <label class="budget-input-row">
              <span>${env.icon} ${env.name}</span>
              <input type="number" class="input budget-input" data-env-key="${key}"
                     value="${env.budget}" min="0" step="1000">
            </label>
          `).join('')}
        </div>
        <div class="budget-sum-row">
          <span>Итого:</span>
          <span id="budget-sum" class="${budgetTotal === profile.monthlyIncome ? 'good' : 'warn'}">${formatMoney(budgetTotal)}</span>
        </div>
        <div class="budget-setup-actions">
          <button type="button" class="btn btn-outline btn-sm" id="btn-auto-budget">Авто (${budgetRule})</button>
          <button type="button" class="btn btn-outline btn-sm" id="btn-save-budget">Сохранить бюджет</button>
          <button type="button" class="btn btn-gold btn-sm" id="btn-apply-budget">Применить к карточкам</button>
        </div>
      </section>

      <div class="envelopes-grid" id="envelopes-grid">
        ${Object.entries(envelopes).map(([key, env]) => renderEnvelopeCard(key, env)).join('')}
      </div>

      <section class="quick-expense glass">
        <h3 class="section-title">⚡ Быстрый расход</h3>
        <div class="category-grid" id="category-grid">
          ${EXPENSE_CATEGORIES.map(cat => `
            <button type="button" class="category-btn" data-cat="${cat.name}" data-env="${cat.envelope}">
              <span>${cat.icon}</span>
              <span>${cat.name}</span>
            </button>
          `).join('')}
        </div>
        <div id="quick-expense-panel" class="quick-expense-panel hidden">
          <p class="quick-selected">Категория: <strong id="quick-cat-label"></strong></p>
          <input type="number" class="input" id="quick-expense-amount" placeholder="Сумма (₽)" min="0" inputmode="decimal">
          <button type="button" class="btn btn-green btn-full" id="btn-confirm-expense">Записать расход</button>
        </div>
      </section>

      <section class="income-section glass">
        <h3 class="section-title">💵 Записать доход</h3>
        <div class="income-form">
          <input type="number" id="income-amount" class="input" placeholder="Сумма" min="0">
          <input type="text" id="income-note" class="input" placeholder="Комментарий">
          <button type="button" class="btn btn-green" id="btn-add-income">Записать доход</button>
        </div>
      </section>

      <section class="transactions-section glass">
        <h3 class="section-title">📋 Последние операции</h3>
        <div class="tx-list" id="tx-list">
          ${renderTransactionList(transactions.slice(-10).reverse())}
        </div>
      </section>
    </div>
  `;

  bindTrackingEvents(container, data, onUpdate);
}

function renderEnvelopeCard(key, env) {
  const spent = Math.max(0, env.budget - env.amount);
  const spentPct = env.budget > 0 ? Math.min(100, (spent / env.budget) * 100) : 0;
  return `
    <div class="envelope-card glass" data-envelope="${key}" style="--env-color: ${env.color}">
      <div class="envelope-header envelope-drag-handle" title="Перетащи для перевода">
        <span class="envelope-icon">${env.icon}</span>
        <span class="envelope-name">${env.name}</span>
        <span class="drag-hint">⠿</span>
      </div>
      <div class="envelope-amount">${formatMoney(env.amount)}</div>
      <div class="envelope-budget">остаток · бюджет ${formatMoney(env.budget)}</div>
      <div class="progress-bar small">
        <div class="progress-fill" style="width: ${spentPct}%; background: ${env.color}"></div>
      </div>
      <div class="envelope-actions">
        <button type="button" class="btn-icon envelope-btn" data-action="add" data-env="${key}">➕</button>
        <button type="button" class="btn-icon envelope-btn" data-action="spend" data-env="${key}">➖</button>
        <button type="button" class="btn-icon envelope-btn" data-action="edit-budget" data-env="${key}">⚙️</button>
      </div>
    </div>
  `;
}

function renderTransactionList(transactions) {
  if (!transactions.length) return '<p class="empty">Пока нет транзакций</p>';
  return transactions.map(tx => `
    <div class="tx-item ${tx.type}">
      <div class="tx-info">
        <span class="tx-cat">${tx.category}</span>
        <span class="tx-date">${formatDate(tx.date, { day: 'numeric', month: 'short' })}</span>
      </div>
      <span class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${formatMoney(tx.amount)}</span>
    </div>
  `).join('');
}

function updateBudgetSum(container, data) {
  const inputs = container.querySelectorAll('.budget-input');
  let sum = 0;
  inputs.forEach(inp => { sum += parseFloat(inp.value) || 0; });
  const sumEl = container.querySelector('#budget-sum');
  if (sumEl) {
    sumEl.textContent = formatMoney(sum);
    sumEl.className = sum === data.profile.monthlyIncome ? 'good' : 'warn';
  }
}

function bindTrackingEvents(container, data, onUpdate) {
  let selectedQuick = null;

  container.querySelectorAll('.budget-input').forEach(inp => {
    inp.addEventListener('input', () => updateBudgetSum(container, data));
  });

  container.querySelector('#btn-auto-budget')?.addEventListener('click', () => {
    const dist = distributeEnvelopes(data.profile.monthlyIncome, data.budgetRule);
    Object.entries(dist).forEach(([key, val]) => {
      const inp = container.querySelector(`.budget-input[data-env-key="${key}"]`);
      if (inp) inp.value = val;
    });
    updateBudgetSum(container, data);
    haptic('selection');
  });

  container.querySelector('#btn-save-budget')?.addEventListener('click', () => {
    container.querySelectorAll('.budget-input').forEach(inp => {
      const key = inp.dataset.envKey;
      const newBudget = parseFloat(inp.value) || 0;
      data.envelopes[key].budget = newBudget;
      if (data.envelopes[key].amount > newBudget) {
        data.envelopes[key].amount = newBudget;
      }
    });
    syncYearlyBudget(data);
    haptic('success');
    showToast('Бюджет сохранён');
    onUpdate(data, { silent: true });
  });

  container.querySelector('#btn-apply-budget')?.addEventListener('click', () => {
    container.querySelectorAll('.budget-input').forEach(inp => {
      const key = inp.dataset.envKey;
      const newBudget = parseFloat(inp.value) || 0;
      data.envelopes[key].budget = newBudget;
      data.envelopes[key].amount = newBudget;
    });
    syncYearlyBudget(data);
    haptic('success');
    showToast('Суммы на карточках обновлены');
    onUpdate(data, { silent: true });
  });

  // Drag только за шапку карточки
  const grid = container.querySelector('#envelopes-grid');
  let draggedKey = null;

  grid?.querySelectorAll('.envelope-card').forEach(card => {
    const handle = card.querySelector('.envelope-drag-handle');
    handle?.setAttribute('draggable', 'true');
    handle?.addEventListener('dragstart', (e) => {
      draggedKey = card.dataset.envelope;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      haptic('selection');
    });
    handle?.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedKey = null;
    });
    card.addEventListener('dragover', (e) => e.preventDefault());
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetKey = card.dataset.envelope;
      if (draggedKey && targetKey && draggedKey !== targetKey) {
        transferBetweenEnvelopes(draggedKey, targetKey, data, onUpdate);
      }
    });
  });

  container.querySelectorAll('.envelope-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const envKey = btn.dataset.env;
      const env = data.envelopes[envKey];
      if (action === 'add') {
        const num = await askAmount(`Пополнить «${env.name}»`);
        if (!num) return;
        data.envelopes[envKey].amount = Math.min(env.budget, env.amount + num);
        haptic('success');
        onUpdate(data, { silent: true });
      } else if (action === 'spend') {
        const num = await askAmount(`Расход из «${env.name}»`, { hint: `Остаток: ${formatMoney(env.amount)}` });
        if (!num) return;
        if (num > env.amount) {
          showToast('Недостаточно средств в конверте');
          return;
        }
        data.envelopes[envKey].amount -= num;
        addTransaction(data, onUpdate, {
          type: 'expense', amount: num, category: env.name, envelope: envKey, note: env.name,
        });
      } else if (action === 'edit-budget') {
        const inp = container.querySelector(`.budget-input[data-env-key="${envKey}"]`);
        if (inp) {
          inp.focus();
          inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
          haptic('selection');
        }
      }
    });
  });

  container.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedQuick = { cat: btn.dataset.cat, env: btn.dataset.env };
      container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const panel = container.querySelector('#quick-expense-panel');
      panel?.classList.remove('hidden');
      container.querySelector('#quick-cat-label').textContent = `${btn.querySelector('span')?.textContent || ''} ${selectedQuick.cat}`;
      container.querySelector('#quick-expense-amount')?.focus();
      haptic('selection');
    });
  });

  container.querySelector('#btn-confirm-expense')?.addEventListener('click', () => {
    if (!selectedQuick) return;
    const num = parseFloat(container.querySelector('#quick-expense-amount')?.value);
    if (!num || num <= 0) return;
    const env = data.envelopes[selectedQuick.env];
    if (num > env.amount) {
      showToast('Недостаточно средств в конверте');
      return;
    }
    env.amount -= num;
    addTransaction(data, onUpdate, {
      type: 'expense', amount: num, category: selectedQuick.cat, envelope: selectedQuick.env, note: selectedQuick.cat,
    });
    container.querySelector('#quick-expense-amount').value = '';
    container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
    container.querySelector('#quick-expense-panel')?.classList.add('hidden');
    selectedQuick = null;
  });

  container.querySelector('#btn-add-income')?.addEventListener('click', () => {
    const amount = parseFloat(container.querySelector('#income-amount').value);
    const note = container.querySelector('#income-note').value || 'Доход';
    if (!amount || amount <= 0) return;
    addTransaction(data, onUpdate, {
      type: 'income', amount, category: 'Доход', envelope: 'savings', note,
    });
    container.querySelector('#income-amount').value = '';
    container.querySelector('#income-note').value = '';
  });
}

async function transferBetweenEnvelopes(fromKey, toKey, data, onUpdate) {
  const from = data.envelopes[fromKey];
  const to = data.envelopes[toKey];
  const num = await askAmount(`Перевод: ${from.name} → ${to.name}`, {
    hint: `Доступно: ${formatMoney(from.amount)}`,
  });
  if (!num || num > from.amount) return;
  from.amount -= num;
  to.amount = Math.min(to.budget, to.amount + num);
  haptic('success');
  onUpdate(data, { silent: true });
}

function addTransaction(data, onUpdate, tx) {
  data.transactions.push({
    id: generateId('t'),
    ...tx,
    date: new Date().toISOString(),
  });
  if (tx.type === 'income') {
    data.profile.currentCapital += tx.amount;
    const envKey = tx.envelope || 'savings';
    if (data.envelopes[envKey]) {
      data.envelopes[envKey].amount = Math.min(
        data.envelopes[envKey].budget,
        data.envelopes[envKey].amount + tx.amount
      );
    }
  }
  // Расходы: капитал не меняем — это месячный бюджет, не накопления
  haptic('success');
  onUpdate(data, { xpEvent: 'transaction' });
}
