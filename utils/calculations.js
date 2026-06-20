/**
 * Финансовые расчёты (по методологии таблицы Артема Зуева)
 */

import { localDateStr, localMonthKey } from './helpers.js';

/** Сумма конвертов = доход (коррекция округления) */
function balanceEnvelopesToIncome(dist, monthlyIncome) {
  const sum = Object.values(dist).reduce((s, v) => s + v, 0);
  const diff = monthlyIncome - sum;
  if (diff !== 0 && dist.savings != null) {
    dist.savings = Math.max(0, dist.savings + diff);
  }
  return dist;
}

/** Норма сбережений: сколько нужно откладывать */
export function calcSavingsNorm(monthlyIncome, targetCapital, years, annualReturn = 12, currentCapital = 0) {
  const months = years * 12;
  const monthlyRate = annualReturn / 100 / 12;
  const futureValueFactor = monthlyRate > 0
    ? (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate
    : months;
  const remaining = Math.max(0, targetCapital - currentCapital);
  const neededFromScratch = remaining / futureValueFactor;
  const savingsRate = monthlyIncome > 0 ? (neededFromScratch / monthlyIncome) * 100 : 0;
  return {
    monthlySavings: Math.round(neededFromScratch),
    savingsRate: Math.round(savingsRate * 10) / 10,
    months,
    targetCapital,
  };
}

/** Симуляция роста капитала (compound interest) — лист 1.1 */
export function simulateCapitalGrowth(startCapital, monthlyContribution, annualReturn, years) {
  const monthlyRate = annualReturn / 100 / 12;
  const data = [];
  let capital = startCapital;
  let totalContributions = startCapital;

  data.push({ year: 0, capital: Math.round(capital), contributions: Math.round(totalContributions), growth: 0 });

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      capital = capital * (1 + monthlyRate) + monthlyContribution;
      totalContributions += monthlyContribution;
    }
    data.push({
      year,
      capital: Math.round(capital),
      contributions: Math.round(totalContributions),
      growth: Math.round(capital - totalContributions),
    });
  }
  return data;
}

/** Расчёт цели: сколько месяцев до достижения */
export function calcGoalTimeline(current, target, monthly, annualReturn = 0) {
  const remaining = target - current;
  if (remaining <= 0) return { months: 0, achievable: true };
  if (monthly <= 0) return { months: Infinity, achievable: false };

  if (annualReturn <= 0) {
    return { months: Math.ceil(remaining / monthly), achievable: true };
  }

  const monthlyRate = annualReturn / 100 / 12;
  let balance = current;
  let months = 0;
  const maxMonths = 600;

  while (balance < target && months < maxMonths) {
    balance = balance * (1 + monthlyRate) + monthly;
    months++;
  }
  return { months, achievable: balance >= target };
}

/** Месячный взнос для достижения цели к дедлайну */
export function calcMonthlyForGoal(current, target, deadlineDate, annualReturn = 0) {
  const now = new Date();
  const deadline = new Date(deadlineDate);
  const months = Math.max(1, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24 * 30.44)));
  const remaining = target - current;
  if (remaining <= 0) return 0;

  if (annualReturn <= 0) return Math.ceil(remaining / months);

  const monthlyRate = annualReturn / 100 / 12;
  const factor = monthlyRate > 0
    ? (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate
    : months;
  return Math.ceil(remaining / factor);
}

/** Бюджет 50/30/20 */
export function budget502020(monthlyIncome) {
  return {
    needs: Math.round(monthlyIncome * 0.5),
    wants: Math.round(monthlyIncome * 0.3),
    savings: Math.round(monthlyIncome * 0.2),
  };
}

/** Бюджет 30/20/50 (агрессивное накопление) */
export function budget302050(monthlyIncome) {
  return {
    needs: Math.round(monthlyIncome * 0.3),
    investments: Math.round(monthlyIncome * 0.2),
    savings: Math.round(monthlyIncome * 0.5),
  };
}

/** Распределение по конвертам */
export function distributeEnvelopes(monthlyIncome, rule = '50/30/20') {
  let dist;
  if (rule === '30/20/50') {
    const b = budget302050(monthlyIncome);
    dist = {
      fixed: Math.round(b.needs * 0.6),
      variable: Math.round(b.needs * 0.4),
      savings: b.savings,
      investments: b.investments,
      debts: Math.round(monthlyIncome * 0.05),
      wants: Math.round(monthlyIncome * 0.05),
    };
  } else {
    const b = budget502020(monthlyIncome);
    dist = {
      fixed: Math.round(b.needs * 0.65),
      variable: Math.round(b.needs * 0.35),
      savings: b.savings,
      investments: Math.round(b.savings * 0.5),
      debts: Math.round(b.savings * 0.25),
      wants: b.wants,
    };
  }
  return balanceEnvelopesToIncome(dist, monthlyIncome);
}

/** Снежный ком: сортировка долгов по остатку (меньший первый) */
export function snowballOrder(debts) {
  return [...debts].sort((a, b) => a.remaining - b.remaining);
}

/** Лавина: сортировка по ставке (выше первый) */
export function avalancheOrder(debts) {
  return [...debts].sort((a, b) => b.rate - a.rate);
}

/** Расчёт платежа по долгу (аннуитет) */
export function calcDebtPayment(principal, annualRate, months) {
  if (months <= 0 || principal <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

/** План погашения долга */
export function debtPayoffPlan(debt, extraPayment = 0) {
  const monthlyRate = debt.rate / 100 / 12;
  const payment = debt.minPayment + extraPayment;
  let remaining = debt.remaining;
  let months = 0;
  let totalInterest = 0;
  const schedule = [];

  while (remaining > 0 && months < 600) {
    const interest = remaining * monthlyRate;
    const principalPaid = Math.min(payment - interest, remaining);
    remaining -= principalPaid;
    totalInterest += interest;
    months++;
    if (months <= 12 || months % 12 === 0) {
      schedule.push({ month: months, remaining: Math.round(remaining), interest: Math.round(interest) });
    }
    if (principalPaid <= 0) break;
  }
  return { months, totalInterest: Math.round(totalInterest), schedule };
}

/** Авто vs Инвестиции */
export function autoVsInvest(carPrice, carYears, investmentAmount, annualReturn) {
  const carMonthlyCost = carPrice / (carYears * 12);
  const investmentGrowth = simulateCapitalGrowth(investmentAmount, 0, annualReturn, carYears);
  const finalInvestment = investmentGrowth[investmentGrowth.length - 1].capital;
  const carTotalCost = carPrice;
  const opportunityCost = finalInvestment - investmentAmount;

  return {
    carMonthlyCost: Math.round(carMonthlyCost),
    carTotalCost,
    investmentFinal: finalInvestment,
    investmentGrowth: finalInvestment - investmentAmount,
    verdict: opportunityCost > carTotalCost * 0.3 ? 'invest' : 'car',
    verdictText: opportunityCost > carTotalCost * 0.3
      ? 'Инвестиции выгоднее — капитал вырастет больше стоимости авто'
      : 'Авто оправдано при текущих параметрах',
  };
}

/** Дельта за сегодня (только реальные транзакции пользователя) */
export function todayDelta(transactions) {
  const todayStr = localDateStr();
  return transactions
    .filter(t => localDateStr(new Date(t.date)) === todayStr)
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
}

/** Плановые месячные расходы по бюджету конвертов (без сбережений/инвестиций) */
export function plannedMonthlyExpenses(envelopes) {
  const spendKeys = ['fixed', 'variable', 'wants', 'debts'];
  return spendKeys.reduce((s, k) => s + (envelopes[k]?.budget || 0), 0);
}

/** Месячные расходы: транзакции, факт по конвертам или план по бюджету */
export function monthlyExpenses(transactions, envelopes) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const txExpenses = transactions
    .filter(t => t.type === 'expense' && t.date >= monthStart)
    .reduce((s, t) => s + t.amount, 0);
  const envelopeSpent = Object.values(envelopes).reduce(
    (s, e) => s + Math.max(0, (e.budget || 0) - (e.amount || 0)),
    0
  );
  const planned = plannedMonthlyExpenses(envelopes);
  return Math.max(txExpenses, envelopeSpent, planned);
}

/** Синхронизация годового бюджета из профиля и конвертов */
export function syncYearlyBudget(data) {
  const year = new Date().getFullYear();
  const { profile, envelopes } = data;
  if (!data.yearlyBudget) data.yearlyBudget = {};
  data.yearlyBudget[year] = {
    income: profile.monthlyIncome * 12,
    fixed: (envelopes.fixed?.budget || 0) * 12,
    variable: (envelopes.variable?.budget || 0) * 12,
    savings: (envelopes.savings?.budget || 0) * 12,
    investments: (envelopes.investments?.budget || 0) * 12,
    debts: (envelopes.debts?.budget || 0) * 12,
    wants: (envelopes.wants?.budget || 0) * 12,
  };
  return data.yearlyBudget[year];
}

/** Серия данных для графика капитала — от старта к текущему */
export function buildCapitalChartSeries(profile, capitalHistory = []) {
  const startVal = profile.startingCapital ?? profile.currentCapital;
  const current = profile.currentCapital;
  const labels = ['Старт'];
  const values = [startVal];

  const sorted = [...capitalHistory].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  sorted.forEach((h) => {
    const label = formatMonthShort(h.date);
    const lastVal = values[values.length - 1];
    const lastLabel = labels[labels.length - 1];
    if (h.value !== lastVal || label !== lastLabel) {
      labels.push(label);
      values.push(h.value);
    }
  });

  const nowLabel = formatMonthShort(localMonthKey());
  if (values[values.length - 1] !== current) {
    labels.push(labels[labels.length - 1] === nowLabel ? 'Сейчас' : nowLabel);
    values.push(current);
  }

  if (labels.length === 1) {
    labels.push('Сейчас');
    values.push(current);
  }

  return { labels, values };
}

function formatMonthShort(dateStr) {
  if (dateStr === 'Старт') return dateStr;
  const [y, m] = String(dateStr).split('-');
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return months[parseInt(m, 10) - 1] ? `${months[parseInt(m, 10) - 1]} ${y?.slice(2) || ''}` : dateStr;
}

/** Миграция: убрать демо-историю капитала */
export function migrateDemoCapitalHistory(gamification, profile) {
  const hist = gamification.capitalHistory || [];
  const demoKeys = ['2026-01', '2026-02', '2026-03', '2026-04'];
  const hasDemo = hist.some(h => demoKeys.includes(h.date));
  if (hasDemo) {
    gamification.capitalHistory = [{
      date: localMonthKey(),
      value: profile.currentCapital,
    }];
  }
  if (!gamification.capitalHistory?.length) {
    gamification.capitalHistory = [{
      date: localMonthKey(),
      value: profile.currentCapital,
    }];
  }
}

/** Валидация даты дедлайна (YYYY-MM-DD) */
export function parseDeadlineDate(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return null;
  const d = new Date(str.trim() + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const [y, m, day] = str.trim().split('-').map(Number);
  if (d.getFullYear() !== y || d.getMonth() + 1 !== m || d.getDate() !== day) return null;
  return str.trim();
}

/** Доходность не ниже 0 для калькуляторов */
export function clampAnnualReturn(rate) {
  const n = Number(rate);
  if (Number.isNaN(n)) return 12;
  return Math.min(100, Math.max(0, n));
}

/** Убрать встроенные демо-цели и долги у существующих пользователей */
export function migrateDemoGoalsDebts(data) {
  const demoGoalIds = ['g1', 'g2', 'g3'];
  const demoDebtIds = ['d1', 'd2'];
  if (data.goals?.some(g => demoGoalIds.includes(g.id))) {
    data.goals = data.goals.filter(g => !demoGoalIds.includes(g.id));
  }
  if (data.debts?.some(d => demoDebtIds.includes(d.id))) {
    data.debts = data.debts.filter(d => !demoDebtIds.includes(d.id));
  }
}
/** Годовых доходов накоплено */
export function yearsOfIncomeSaved(capital, monthlyIncome) {
  if (monthlyIncome <= 0) return 0;
  return Math.round((capital / (monthlyIncome * 12)) * 10) / 10;
}
