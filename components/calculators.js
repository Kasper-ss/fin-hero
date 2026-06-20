/**
 * Калькуляторы: норма сбережений, рост капитала, цели, авто vs инвестиции
 */

import { formatMoney, formatPercent, haptic, debounce } from '../utils/helpers.js';
import {
  calcSavingsNorm, simulateCapitalGrowth,
  budget502020, budget302050, autoVsInvest, clampAnnualReturn,
} from '../utils/calculations.js';

let growthChart = null;
let calcContainer = null;
let calcData = null;

/** Рендер калькуляторов */
export function renderCalculators(container, data, onUpdate) {
  calcContainer = container;
  calcData = data;
  const { profile, calculators, budgetRule } = data;

  container.innerHTML = `
    <div class="calculators fade-in">
      <h2 class="page-title">🧮 Калькуляторы</h2>

      <section class="calc-card glass">
        <h3 class="section-title">💰 Норма сбережений</h3>
        <div class="calc-form">
          <label>Целевой капитал (₽)
            <input type="number" id="calc-target" class="input calc-input" value="5000000">
          </label>
          <label>Лет до цели
            <input type="number" id="calc-years" class="input calc-input" value="${calculators.yearsToSimulate}">
          </label>
          <label>Доходность (% годовых)
            <input type="number" id="calc-return" class="input calc-input" value="${calculators.annualReturn}" step="0.1">
          </label>
        </div>
        <div class="calc-result" id="savings-result"></div>
      </section>

      <section class="calc-card glass">
        <h3 class="section-title">📈 Симулятор роста капитала</h3>
        <div class="calc-form">
          <label>Стартовый капитал
            <input type="number" id="sim-start" class="input calc-input" value="${profile.currentCapital}">
          </label>
          <label>Ежемесячный взнос
            <input type="number" id="sim-monthly" class="input calc-input" value="${Math.round(profile.monthlyIncome * profile.savingsRate / 100)}">
          </label>
          <label>Лет (макс. 30)
            <input type="number" id="sim-years" class="input calc-input" value="${calculators.yearsToSimulate}" min="1" max="30">
          </label>
        </div>
        <div class="chart-wrap chart-wrap-fixed">
          <canvas id="growth-chart"></canvas>
        </div>
        <div class="table-scroll" id="growth-table"></div>
      </section>

      <section class="calc-card glass">
        <h3 class="section-title">📊 Бюджетное правило</h3>
        <div class="budget-toggle">
          <button class="toggle-btn ${budgetRule === '50/30/20' ? 'active' : ''}" data-rule="50/30/20">50/30/20</button>
          <button class="toggle-btn ${budgetRule === '30/20/50' ? 'active' : ''}" data-rule="30/20/50">30/20/50</button>
        </div>
        <div class="budget-result" id="budget-result"></div>
      </section>

      <section class="calc-card glass">
        <h3 class="section-title">🚗 Авто vs 📈 Инвестиции</h3>
        <div class="calc-form">
          <label>Цена авто (₽)
            <input type="number" id="car-price" class="input calc-input" value="${calculators.carPrice}">
          </label>
          <label>Срок владения (лет)
            <input type="number" id="car-years" class="input calc-input" value="${calculators.carYears}">
          </label>
          <label>Альтернатива — инвестиции (₽)
            <input type="number" id="car-invest" class="input calc-input" value="${calculators.investmentAlternative}">
          </label>
        </div>
        <div class="calc-result" id="car-result"></div>
      </section>

      <button class="btn btn-gold btn-full" id="btn-recalc">🔄 Пересчитать всё</button>
    </div>
  `;

  recalculateAll(container, data);
  bindCalcEvents(container, data, onUpdate);
}

function recalculateAll(container, data) {
  const { profile, calculators } = data;

  const target = parseFloat(container.querySelector('#calc-target')?.value) || 5000000;
  const years = parseFloat(container.querySelector('#calc-years')?.value) || 10;
  const ret = clampAnnualReturn(container.querySelector('#calc-return')?.value || calculators.annualReturn);
  const savings = calcSavingsNorm(profile.monthlyIncome, target, years, ret, profile.currentCapital);

  const savingsEl = container.querySelector('#savings-result');
  if (savingsEl) {
    savingsEl.innerHTML = `
      <div class="result-grid">
        <div class="result-item"><span>Откладывать/мес</span><strong>${formatMoney(savings.monthlySavings)}</strong></div>
        <div class="result-item"><span>Норма сбережений</span><strong class="${savings.savingsRate > 50 ? 'warn' : 'good'}">${formatPercent(savings.savingsRate, 1)}</strong></div>
      </div>
    `;
  }

  const start = parseFloat(container.querySelector('#sim-start')?.value) || profile.currentCapital;
  const monthly = parseFloat(container.querySelector('#sim-monthly')?.value) || 0;
  const simYears = Math.min(30, Math.max(1, parseFloat(container.querySelector('#sim-years')?.value) || 10));
  const growth = simulateCapitalGrowth(start, monthly, ret, simYears);
  renderGrowthChart(container, growth);
  renderGrowthTable(container, growth);

  const rule = data.budgetRule;
  const budget = rule === '30/20/50' ? budget302050(profile.monthlyIncome) : budget502020(profile.monthlyIncome);
  const budgetEl = container.querySelector('#budget-result');
  if (budgetEl) {
    const items = rule === '30/20/50'
      ? [['Нужды (30%)', budget.needs], ['Инвестиции (20%)', budget.investments], ['Сбережения (50%)', budget.savings]]
      : [['Нужды (50%)', budget.needs], ['Хотелки (30%)', budget.wants], ['Сбережения (20%)', budget.savings]];
    budgetEl.innerHTML = items.map(([label, val]) => `
      <div class="budget-row"><span>${label}</span><strong>${formatMoney(val)}</strong></div>
    `).join('');
  }

  const carPrice = parseFloat(container.querySelector('#car-price')?.value) || calculators.carPrice;
  const carYears = parseFloat(container.querySelector('#car-years')?.value) || calculators.carYears;
  const carInvest = parseFloat(container.querySelector('#car-invest')?.value) || calculators.investmentAlternative;
  const carResult = autoVsInvest(carPrice, carYears, carInvest, ret);
  const carEl = container.querySelector('#car-result');
  if (carEl) {
    carEl.innerHTML = `
      <div class="result-grid">
        <div class="result-item"><span>Авто/мес</span><strong>${formatMoney(carResult.carMonthlyCost)}</strong></div>
        <div class="result-item"><span>Инвестиции через ${carYears} лет</span><strong class="good">${formatMoney(carResult.investmentFinal)}</strong></div>
      </div>
      <p class="verdict ${carResult.verdict}">${carResult.verdict === 'invest' ? '📈' : '🚗'} ${carResult.verdictText}</p>
    `;
  }
}

function renderGrowthChart(container, growth) {
  const canvas = container.querySelector('#growth-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (growthChart) {
    growthChart.destroy();
    growthChart = null;
  }

  const ctx = canvas.getContext('2d');
  growthChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: growth.map(g => `${g.year}`),
      datasets: [
        { label: 'Взносы', data: growth.map(g => g.contributions), backgroundColor: '#3b82f6' },
        { label: 'Рост', data: growth.map(g => g.growth), backgroundColor: '#22c55e' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 12 } } },
      scales: {
        x: { stacked: true, ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { display: false } },
        y: {
          stacked: true,
          ticks: { color: '#94a3b8', callback: v => (v / 1e6).toFixed(1) + 'M' },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
      },
    },
  });
}

function renderGrowthTable(container, growth) {
  const el = container.querySelector('#growth-table');
  if (!el) return;
  // Показываем ключевые годы, не все — таблица компактная
  const rows = growth.filter((_, i) => i === 0 || i % 5 === 0 || i === growth.length - 1);
  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Год</th><th>Капитал</th><th>Рост</th></tr></thead>
      <tbody>
        ${rows.map(g => `
          <tr><td>${g.year}</td><td>${formatMoney(g.capital)}</td><td class="good">+${formatMoney(g.growth)}</td></tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

const debouncedRecalc = debounce(() => {
  if (calcContainer?.isConnected && calcData) recalculateAll(calcContainer, calcData);
}, 400);

function bindCalcEvents(container, data, onUpdate) {
  container.querySelector('#btn-recalc')?.addEventListener('click', () => {
    haptic('medium');
    recalculateAll(container, data);
    saveCalcSettings(container, data);
    onUpdate(data, { silent: true, skipRender: true });
  });

  container.querySelectorAll('.budget-toggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      data.budgetRule = btn.dataset.rule;
      container.querySelectorAll('.budget-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      haptic('selection');
      recalculateAll(container, data);
      saveCalcSettings(container, data);
      onUpdate(data, { silent: true, skipRender: true });
    });
  });

  container.querySelectorAll('.calc-input').forEach(input => {
    input.addEventListener('input', debouncedRecalc);
  });
}

function saveCalcSettings(container, data) {
  data.calculators.annualReturn = clampAnnualReturn(container.querySelector('#calc-return')?.value || 12);
  data.calculators.yearsToSimulate = parseFloat(container.querySelector('#calc-years')?.value) || 10;
  data.calculators.carPrice = parseFloat(container.querySelector('#car-price')?.value) || data.calculators.carPrice;
  data.calculators.carYears = parseFloat(container.querySelector('#car-years')?.value) || data.calculators.carYears;
  data.calculators.investmentAlternative = parseFloat(container.querySelector('#car-invest')?.value) || data.calculators.investmentAlternative;
}

export function destroyCalcChart() {
  if (growthChart) {
    growthChart.destroy();
    growthChart = null;
  }
  calcContainer = null;
  calcData = null;
}
