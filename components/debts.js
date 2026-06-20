/**
 * Управление долгами: снежный ком / лавина
 */

import { formatMoney, formatPercent, generateId, haptic, escapeHtml } from '../utils/helpers.js';
import { askAmount, askConfirm, askText } from '../utils/modal.js';
import { showToast } from '../utils/ui.js';
import { snowballOrder, avalancheOrder, debtPayoffPlan, calcDebtPayment } from '../utils/calculations.js';

/** Рендер долгов */
export function renderDebts(container, data, onUpdate) {
  const { debts } = data;
  const snowball = snowballOrder(debts);
  const avalanche = avalancheOrder(debts);
  const totalDebt = debts.reduce((s, d) => s + d.remaining, 0);

  container.innerHTML = `
    <div class="debts fade-in">
      <h2 class="page-title">💳 Долги</h2>

      <div class="debt-summary glass">
        <span class="debt-total-label">Общий долг</span>
        <span class="debt-total-value">${formatMoney(totalDebt)}</span>
      </div>

      <div class="strategy-toggle">
        <button class="toggle-btn active" data-strategy="snowball">❄️ Снежный ком</button>
        <button class="toggle-btn" data-strategy="avalanche">🏔️ Лавина</button>
      </div>

      <div class="strategy-info glass" id="strategy-info">
        <p class="strategy-desc" data-for="snowball">
          <strong>❄️ Снежный ком</strong> — сначала гасишь <em>самый маленький</em> долг.
          Быстрые победы мотивируют, освободившийся платёж идёт на следующий долг.
          <span class="strategy-tip">Лучше для тех, кому нужна психологическая поддержка.</span>
        </p>
        <p class="strategy-desc hidden" data-for="avalanche">
          <strong>🏔️ Лавина</strong> — сначала гасишь долг с <em>самой высокой ставкой</em>.
          Экономишь больше на процентах, но первый результат может занять больше времени.
          <span class="strategy-tip">Лучше математически — меньше переплата банку.</span>
        </p>
      </div>

      <div class="debts-list" id="debts-list">
        ${debts.length ? renderDebtList(snowball) : '<p class="empty">Нет долгов — ты свободен! 🎉</p>'}
      </div>

      <button class="btn btn-outline btn-full" id="btn-add-debt">➕ Добавить долг</button>

      <section class="calc-card glass">
        <h3 class="section-title">🧮 Калькулятор платежа</h3>
        <div class="calc-form inline">
          <input type="number" id="debt-calc-amount" class="input" placeholder="Сумма долга">
          <input type="number" id="debt-calc-rate" class="input" placeholder="Ставка %" step="0.1">
          <input type="number" id="debt-calc-months" class="input" placeholder="Месяцев">
        </div>
        <div id="debt-calc-result" class="calc-result"></div>
      </section>
    </div>
  `;

  let currentStrategy = 'snowball';

  container.querySelectorAll('.strategy-toggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.strategy-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStrategy = btn.dataset.strategy;
      container.querySelectorAll('.strategy-desc').forEach(p => {
        p.classList.toggle('hidden', p.dataset.for !== currentStrategy);
      });
      const ordered = currentStrategy === 'snowball' ? snowballOrder(data.debts) : avalancheOrder(data.debts);
      container.querySelector('#debts-list').innerHTML = renderDebtList(ordered);
      bindDebtEvents(container, data, onUpdate);
      haptic('selection');
    });
  });

  bindDebtEvents(container, data, onUpdate);

  ['debt-calc-amount', 'debt-calc-rate', 'debt-calc-months'].forEach(id => {
    container.querySelector(`#${id}`)?.addEventListener('input', () => {
      const amount = parseFloat(container.querySelector('#debt-calc-amount').value) || 0;
      const rate = parseFloat(container.querySelector('#debt-calc-rate').value) || 0;
      const months = parseInt(container.querySelector('#debt-calc-months').value) || 0;
      const payment = calcDebtPayment(amount, rate, months);
      const result = container.querySelector('#debt-calc-result');
      if (result) {
        result.innerHTML = payment > 0
          ? `<p>Ежемесячный платёж: <strong>${formatMoney(payment)}</strong></p>`
          : '';
      }
    });
  });

  container.querySelector('#btn-add-debt')?.addEventListener('click', () => {
    showAddDebtModal(data, onUpdate);
  });
}

function renderDebtList(debts) {
  return debts.map((debt, i) => {
    const progress = debt.total > 0 ? ((debt.total - debt.remaining) / debt.total) * 100 : 100;
    const plan = debtPayoffPlan(debt, 0);
    const priority = i === 0 ? '<span class="priority-badge">Приоритет #1</span>' : '';
    const isPaidOff = debt.remaining <= 0;

    return `
      <div class="debt-card glass ${isPaidOff ? 'paid-off' : ''}" data-debt-id="${debt.id}">
        <div class="debt-header">
          <span class="debt-icon">${debt.icon}</span>
          <div>
            <h4>${escapeHtml(debt.name)} ${priority}</h4>
            <p class="debt-rate">Ставка: ${formatPercent(debt.rate, 1)}</p>
          </div>
        </div>
        <div class="debt-amounts">
          <span>Остаток: <strong>${formatMoney(debt.remaining)}</strong></span>
          <span>Платёж: ${formatMoney(debt.minPayment)}/мес</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill debt" style="width: ${Math.min(100, progress)}%"></div>
        </div>
        ${isPaidOff
          ? '<p class="debt-plan paid">✅ Долг погашен — нажми «Завершить» для XP</p>'
          : `<p class="debt-plan">Погашение за ~${plan.months} мес. · Переплата ${formatMoney(plan.totalInterest)}</p>`
        }
        <div class="debt-actions">
          ${isPaidOff
            ? `<button class="btn btn-gold btn-sm" data-complete-debt="${debt.id}">✅ Завершить</button>`
            : `<button class="btn btn-green btn-sm" data-pay-debt="${debt.id}">Внести платёж</button>`
          }
          <button class="btn-icon danger" data-delete-debt="${debt.id}" title="Удалить без XP">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function bindDebtEvents(container, data, onUpdate) {
  container.querySelectorAll('[data-pay-debt]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const debt = data.debts.find(d => d.id === btn.dataset.payDebt);
      if (!debt) return;
      const amount = await askAmount(`Платёж по «${debt.name}»`, { defaultValue: debt.minPayment });
      if (!amount) return;
      if (amount > data.profile.currentCapital) {
        showToast('Недостаточно капитала для платежа');
        return;
      }
      debt.remaining = Math.max(0, debt.remaining - amount);
      data.profile.currentCapital = Math.max(0, data.profile.currentCapital - amount);
      data.envelopes.debts.amount = Math.max(0, data.envelopes.debts.amount - amount);
      haptic('success');
      onUpdate(data, { silent: true });
    });
  });

  container.querySelectorAll('[data-complete-debt]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const debtId = btn.dataset.completeDebt;
      const debt = data.debts.find(d => d.id === debtId);
      if (!debt || debt.remaining > 0) return;
      const ok = await askConfirm('Завершить долг?', `«${debt.name}» — получишь XP`);
      if (!ok) return;

      data.debts = data.debts.filter(d => d.id !== debtId);
      haptic('success');
      const options = { xpEvent: 'debt_paid' };
      if (data.debts.length === 0) options.achievement = 'debt_killer';
      onUpdate(data, options);
    });
  });

  container.querySelectorAll('[data-delete-debt]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await askConfirm('Удалить долг?', 'XP не начисляется');
      if (!ok) return;
      data.debts = data.debts.filter(d => d.id !== btn.dataset.deleteDebt);
      haptic('warning');
      onUpdate(data, { silent: true });
    });
  });
}

async function showAddDebtModal(data, onUpdate) {
  const name = await askText('Название долга');
  if (!name) return;
  const total = await askAmount('Общая сумма (₽)');
  if (total === null) return;
  const remaining = await askAmount('Остаток (₽)', { defaultValue: total });
  if (remaining === null) return;
  const rate = await askAmount('Ставка (% годовых)', { defaultValue: 15, allowZero: true });
  if (rate === null) return;
  const minPayment = await askAmount('Мин. платёж/мес (₽)', { defaultValue: 0, allowZero: true });
  if (minPayment === null) return;

  data.debts.push({
    id: generateId('d'),
    name,
    total,
    remaining: remaining ?? total,
    rate: rate || 0,
    minPayment: minPayment || 0,
    strategy: 'snowball',
    icon: '💳',
  });
  haptic('success');
  onUpdate(data, { silent: true });
}
