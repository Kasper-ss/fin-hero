/**
 * Цели и годовой бюджет
 */

import { formatMoney, formatDate, formatPercent, generateId, haptic, escapeHtml } from '../utils/helpers.js';
import { calcGoalTimeline, calcMonthlyForGoal, syncYearlyBudget, parseDeadlineDate } from '../utils/calculations.js';
import { askText, askAmount, askConfirm } from '../utils/modal.js';
import { showToast } from '../utils/ui.js';

/** Рендер целей */
export function renderGoals(container, data, onUpdate) {
  const { goals, profile } = data;
  const year = new Date().getFullYear();
  const budget = syncYearlyBudget(data);
  const annualIncome = profile.monthlyIncome * 12;

  container.innerHTML = `
    <div class="goals fade-in">
      <h2 class="page-title">🎯 Цели</h2>
      <p class="page-subtitle">Пополнение цели списывает сумму из конверта «Сбережения»</p>

      <button type="button" class="btn btn-gold btn-full" id="btn-add-goal">➕ Новая цель</button>

      <div class="goals-list">
        ${goals.length ? goals.map(g => renderGoalCard(g, data.calculators.annualReturn)).join('') : '<p class="empty">Добавь первую цель!</p>'}
      </div>

      <section class="yearly-budget glass">
        <h3 class="section-title">📅 Бюджет ${year}</h3>
        <p class="budget-income-hint">На основе дохода <strong>${formatMoney(profile.monthlyIncome)}</strong>/мес и конвертов</p>
        <div class="budget-summary">
          <div class="budget-total">
            <span>Доход за год</span>
            <strong>${formatMoney(annualIncome)}</strong>
          </div>
        </div>
        <div class="budget-bars">
          ${renderBudgetBars(budget, annualIncome, data.envelopes)}
        </div>
      </section>
    </div>
  `;

  container.querySelector('#btn-add-goal')?.addEventListener('click', () => {
    showAddGoalModal(data, onUpdate);
  });

  container.querySelectorAll('[data-goal-add]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.goalAdd;
      const num = await askAmount('Пополнить цель');
      if (!num) return;
      const goal = data.goals.find(g => g.id === id);
      if (!goal) return;
      const savings = data.envelopes.savings;
      if (!savings || num > savings.amount) {
        showToast('Недостаточно средств в конверте «Сбережения»');
        return;
      }
      savings.amount -= num;
      goal.current = Math.min(goal.target, goal.current + num);
      haptic('success');
      onUpdate(data, { silent: true });
    });
  });

  container.querySelectorAll('[data-goal-complete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const goal = data.goals.find(g => g.id === btn.dataset.goalComplete);
      if (!goal || goal.current < goal.target) return;
      const ok = await askConfirm('Завершить цель?', `«${goal.name}» — получишь XP!`);
      if (!ok) return;
      data.goals = data.goals.filter(g => g.id !== goal.id);
      haptic('success');
      const opts = {};
      if (!data.gamification.achievements.includes('goal_complete')) {
        opts.achievement = 'goal_complete';
      } else {
        opts.xpEvent = 'goal_complete';
      }
      onUpdate(data, opts);
    });
  });

  container.querySelectorAll('[data-goal-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await askConfirm('Удалить цель?', 'XP не начисляется.');
      if (!ok) return;
      data.goals = data.goals.filter(g => g.id !== btn.dataset.goalDelete);
      haptic('warning');
      onUpdate(data, { silent: true });
    });
  });
}

function renderGoalCard(goal, annualReturn) {
  const progress = Math.min(100, (goal.current / goal.target) * 100);
  const timeline = calcGoalTimeline(goal.current, goal.target, goal.monthly, annualReturn);
  const monthsText = timeline.months === Infinity ? '∞' : timeline.months;

  return `
    <div class="goal-card glass ${progress >= 100 ? 'completed' : ''}">
      <div class="goal-header">
        <span class="goal-icon">${goal.icon}</span>
        <div>
          <h4>${escapeHtml(goal.name)}</h4>
          <p class="goal-deadline">до ${formatDate(goal.deadline, { month: 'long', year: 'numeric' })}</p>
        </div>
        <button type="button" class="btn-icon danger" data-goal-delete="${goal.id}">🗑️</button>
      </div>
      <div class="goal-progress">
        <div class="progress-bar">
          <div class="progress-fill goal" style="width: ${progress}%"></div>
        </div>
        <span class="goal-amounts">${formatMoney(goal.current)} / ${formatMoney(goal.target)}</span>
      </div>
      <div class="goal-meta">
        <span>📆 ~${monthsText} мес.</span>
        <span>💵 ${formatMoney(goal.monthly)}/мес</span>
        <span>${formatPercent(progress, 0)}</span>
      </div>
      ${progress >= 100
        ? `<button type="button" class="btn btn-gold btn-sm" data-goal-complete="${goal.id}">✅ Завершить цель</button>`
        : `<button type="button" class="btn btn-outline btn-sm" data-goal-add="${goal.id}">Пополнить</button>`
      }
    </div>
  `;
}

function renderBudgetBars(budget, totalIncome, envelopes) {
  const items = [
    { label: 'Постоянные', value: budget.fixed, color: envelopes.fixed?.color || '#3b82f6' },
    { label: 'Переменные', value: budget.variable, color: envelopes.variable?.color || '#8b5cf6' },
    { label: 'Сбережения', value: budget.savings, color: envelopes.savings?.color || '#22c55e' },
    { label: 'Инвестиции', value: budget.investments, color: envelopes.investments?.color || '#f59e0b' },
    { label: 'Долги', value: budget.debts, color: envelopes.debts?.color || '#ef4444' },
    { label: 'Хотелки', value: budget.wants, color: envelopes.wants?.color || '#ec4899' },
  ];

  return items.map(item => {
    const pct = totalIncome > 0 ? ((item.value || 0) / totalIncome) * 100 : 0;
    return `
      <div class="budget-bar-item">
        <div class="budget-bar-label"><span style="color:${item.color}">●</span> ${item.label}</div>
        <div class="progress-bar small"><div class="progress-fill" style="width:${pct}%;background:${item.color}"></div></div>
        <span class="budget-bar-value">${formatMoney(item.value || 0)}/год (${formatPercent(pct, 0)})</span>
      </div>
    `;
  }).join('');
}

async function showAddGoalModal(data, onUpdate) {
  const name = await askText('Название цели');
  if (!name) return;
  const target = await askAmount('Целевая сумма (₽)');
  if (!target) return;
  const deadlineRaw = await askText('Дедлайн (ГГГГ-ММ-ДД)', { defaultValue: '2026-12-31' });
  const deadline = parseDeadlineDate(deadlineRaw);
  if (!deadline) {
    showToast('Некорректная дата. Используйте формат ГГГГ-ММ-ДД');
    return;
  }
  const monthly = calcMonthlyForGoal(0, target, deadline, data.calculators.annualReturn);

  data.goals.push({
    id: generateId('g'),
    name,
    target,
    current: 0,
    monthly,
    deadline,
    icon: '🎯',
    priority: data.goals.length + 1,
  });
  haptic('success');
  onUpdate(data, { silent: true });
}
