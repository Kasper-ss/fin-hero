/**
 * Дашборд — главный экран героя
 */

import {
  formatMoney, formatPercent, getAvatarForLevel, levelFromXp,
  financialFreedomProgress, animateNumber, haptic, celebrate, shareProgress,
} from '../utils/helpers.js';
import { todayDelta, monthlyExpenses, yearsOfIncomeSaved, buildCapitalChartSeries } from '../utils/calculations.js';
import { AVATARS } from '../data/defaultData.js';

let capitalChart = null;
let lastAnimatedCapital = null;

/** Рендер дашборда */
export function renderDashboard(container, data, onAction) {
  const { profile, gamification, transactions, envelopes, goals } = data;
  const levelInfo = levelFromXp(gamification.xp);
  const avatar = getAvatarForLevel(levelInfo.level, AVATARS);
  const delta = todayDelta(transactions);
  const expenses = monthlyExpenses(transactions, envelopes);
  const freedom = financialFreedomProgress(profile.currentCapital, expenses);
  const yearsSaved = yearsOfIncomeSaved(profile.currentCapital, profile.monthlyIncome);
  const activeGoal = [...goals]
    .filter(g => g.current < g.target)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))[0];

  container.innerHTML = `
    <div class="dashboard fade-in">
      <!-- Герой -->
      <section class="hero-card glass">
        <div class="hero-avatar pulse">${avatar.emoji}</div>
        <div class="hero-info">
          <h2 class="hero-title">${avatar.title}</h2>
          <p class="hero-level">Уровень ${levelInfo.level}</p>
          <div class="xp-bar">
            <div class="xp-fill" style="width: ${(levelInfo.currentXp / levelInfo.xpNeeded) * 100}%"></div>
          </div>
          <p class="xp-text">${levelInfo.currentXp} / ${levelInfo.xpNeeded} XP</p>
        </div>
      </section>

      <!-- Капитал -->
      <section class="capital-card glass gold-border">
        <p class="label">Текущий капитал</p>
        <h1 class="capital-amount" id="capital-display">${formatMoney(profile.currentCapital)}</h1>
        <p class="capital-sub">≈ ${yearsSaved} годовых доходов накоплено</p>
      </section>

      <!-- Путь к свободе -->
      <section class="freedom-card glass">
        <div class="freedom-header">
          <span>🗺️ Путь к финансовой свободе</span>
          <span class="freedom-percent">${formatPercent(freedom, 1)}</span>
        </div>
        <div class="progress-bar large">
          <div class="progress-fill freedom" style="width: ${freedom}%"></div>
        </div>
      </section>

      <!-- Карточки -->
      <div class="stats-grid">
        <div class="stat-card glass ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}">
          <span class="stat-icon">${delta > 0 ? '📈' : delta < 0 ? '📉' : '➖'}</span>
          <span class="stat-label">Сегодня</span>
          <span class="stat-value">${delta > 0 ? '+' : ''}${formatMoney(delta)}</span>
        </div>
        <div class="stat-card glass">
          <span class="stat-icon">🔥</span>
          <span class="stat-label">Streak</span>
          <span class="stat-value">${gamification.streak} дн.</span>
        </div>
        <div class="stat-card glass quest">
          <span class="stat-icon">${activeGoal?.icon || '🎯'}</span>
          <span class="stat-label">Квест</span>
          <span class="stat-value small">${activeGoal ? activeGoal.name : 'Нет целей'}</span>
        </div>
      </div>

      <!-- График -->
      <section class="chart-card glass">
        <h3 class="section-title">📊 Рост капитала</h3>
        <p class="chart-hint">Точка «Старт» — твой первоначальный вклад, «Сейчас» — текущий капитал</p>
        <div class="chart-wrap chart-wrap-fixed">
          <canvas id="capital-chart"></canvas>
        </div>
      </section>

      <!-- Быстрые действия -->
      <div class="quick-actions">
        <button class="btn btn-gold" id="btn-add-tx">➕ Доход / Расход</button>
        <button class="btn btn-outline" id="btn-share">📤 Поделиться</button>
      </div>
    </div>
  `;

  // График
  renderCapitalChart(data);

  // Анимация капитала
  const capEl = container.querySelector('#capital-display');
  if (capEl && lastAnimatedCapital !== profile.currentCapital) {
    animateNumber(capEl, lastAnimatedCapital ?? profile.currentCapital * 0.98, profile.currentCapital, 800, formatMoney);
    lastAnimatedCapital = profile.currentCapital;
  }

  // События
  container.querySelector('#btn-add-tx')?.addEventListener('click', () => {
    haptic('medium');
    onAction('add-transaction');
  });
  container.querySelector('#btn-share')?.addEventListener('click', async () => {
    haptic('light');
    const msg = await shareProgress({
      currentCapital: profile.currentCapital,
      level: levelInfo.level,
      streak: gamification.streak,
    });
    if (msg) onAction('toast', msg);
  });
}

/** График капитала — путь от старта к текущему */
function renderCapitalChart(data) {
  const canvas = document.getElementById('capital-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const { labels, values } = buildCapitalChartSeries(
    data.profile,
    data.gamification.capitalHistory || []
  );

  if (capitalChart) capitalChart.destroy();

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 160);
  gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
  gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

  capitalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Капитал',
        data: values,
        borderColor: '#22c55e',
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointRadius: labels.map((_, i) => (i === 0 || i === labels.length - 1 ? 6 : 3)),
        pointBackgroundColor: labels.map((_, i) => (i === 0 ? '#3b82f6' : i === labels.length - 1 ? '#fbbf24' : '#22c55e')),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatMoney(ctx.raw),
          },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#94a3b8',
            callback: v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'K',
          },
        },
      },
    },
  });
}

/** Уничтожить график при смене вкладки */
export function destroyDashboardChart() {
  if (capitalChart) {
    capitalChart.destroy();
    capitalChart = null;
  }
}
