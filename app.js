/**
 * Финансовый Герой — главный модуль приложения
 * Telegram Mini App для геймифицированного управления финансами
 */

import { loadData, saveData } from './utils/storage.js';
import { haptic, celebrate, today, localDateStr, localMonthKey, levelFromXp, getAvatarForLevel } from './utils/helpers.js';
import { distributeEnvelopes, migrateDemoCapitalHistory, syncYearlyBudget } from './utils/calculations.js';
import { setAppSettings, showToast } from './utils/ui.js';
import { AVATARS, ACHIEVEMENTS_DEF } from './data/defaultData.js';

import { renderDashboard, destroyDashboardChart } from './components/dashboard.js';
import { renderTracking } from './components/tracking.js';
import { renderCalculators, destroyCalcChart } from './components/calculators.js';
import { renderGoals } from './components/goals.js';
import { renderDebts } from './components/debts.js';
import { renderAchievements } from './components/achievements.js';

// Состояние приложения
let appData = loadData();
let currentTab = 'dashboard';
let onboardingOpen = false;

// Telegram WebApp
const tg = window.Telegram?.WebApp;

/** Инициализация */
function init() {
  migrateDemoCapitalHistory(appData.gamification, appData.profile);
  syncYearlyBudget(appData);
  setAppSettings(appData.settings);
  saveData(appData);

  if (tg) {
    tg.ready();
    tg.expand();
    applyTelegramTheme();
    tg.BackButton.onClick(() => {
      if (currentTab !== 'dashboard') switchTab('dashboard');
      else tg.close();
    });
    tg.MainButton.onClick(handleMainButton);
  }

  if (!appData.onboardingComplete) {
    showOnboarding();
  } else {
    render();
  }

  setupNavigation();
  updateStreak();
}

/** Применить тему Telegram */
function applyTelegramTheme() {
  if (!tg?.themeParams) return;
  const p = tg.themeParams;
  const root = document.documentElement;
  if (p.bg_color) root.style.setProperty('--bg-primary', p.bg_color);
  if (p.text_color) root.style.setProperty('--text', p.text_color);
  if (p.button_color) root.style.setProperty('--gold', p.button_color);
  if (p.secondary_bg_color) root.style.setProperty('--bg-secondary', p.secondary_bg_color);
}

/** Навигация */
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      haptic('selection');
    });
  });
}

/** Переключение вкладок */
function switchTab(tab) {
  if (onboardingOpen) return;
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  if (tg) {
    tg.BackButton[currentTab === 'dashboard' ? 'hide' : 'show']();
    updateMainButton();
  }

  destroyDashboardChart();
  destroyCalcChart();
  render();
}

/** Главный рендер */
function render() {
  const container = document.getElementById('main-content');
  if (!container) return;

  const handlers = {
    onUpdate: handleUpdate,
    onAction: handleAction,
  };

  switch (currentTab) {
    case 'dashboard':
      renderDashboard(container, appData, handleAction);
      break;
    case 'tracking':
      renderTracking(container, appData, handleUpdate);
      break;
    case 'calculators':
      renderCalculators(container, appData, handleUpdate);
      break;
    case 'goals':
      renderGoals(container, appData, handleUpdate);
      break;
    case 'debts':
      renderDebts(container, appData, handleUpdate);
      break;
    case 'achievements':
      renderAchievements(container, appData, handleUpdate);
      break;
  }

  updateMainButton();
}

/** Обновление данных
 * @param {object} options
 * @param {string} [options.xpEvent] — начислить XP за действие
 * @param {string} [options.achievement] — разблокировать достижение
 * @param {boolean} [options.silent] — только сохранить, без XP/ачивок/level-up
 * @param {boolean} [options.skipRender] — не перерисовывать экран
 */
function handleUpdate(data, options = {}) {
  const prevLevel = levelFromXp(appData.gamification.xp).level;
  appData = data;
  setAppSettings(appData.settings);

  if (!options.silent) {
    if (options.xpEvent) {
      addXp(getXpForEvent(options.xpEvent));
    }
    if (options.achievement) {
      unlockAchievement(options.achievement);
    }
    checkAchievements();
  }

  updateCapitalHistory();
  syncYearlyBudget(appData);
  saveData(appData);

  if (!options.silent) {
    const newLevel = levelFromXp(appData.gamification.xp).level;
    if (newLevel > prevLevel) {
      showLevelUp(newLevel);
    }
  }

  if (!options.skipRender) {
    render();
  }
}

/** Действия UI */
function handleAction(action, payload) {
  switch (action) {
    case 'add-transaction':
      switchTab('tracking');
      break;
    case 'toast':
      showToast(payload);
      break;
  }
}

/** XP за события */
function getXpForEvent(event) {
  const map = {
    transaction: 10,
    debt_paid: 100,
    goal_complete: 200,
    investor_test: 75,
    budget_ok: 50,
  };
  return map[event] || 0;
}

function addXp(amount) {
  if (amount <= 0) return;
  appData.gamification.xp += amount;
}

/** Разблокировка достижения */
function unlockAchievement(id) {
  const achievements = appData.gamification.achievements;
  if (achievements.includes(id)) return;

  achievements.push(id);
  const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
  if (def?.xp) addXp(def.xp);

  if (appData.settings.confettiEnabled) celebrate();
  showToast(`🏆 ${def?.name || 'Достижение'} разблокировано!`);
  haptic('success');
}

/** Автопроверка достижений */
function checkAchievements() {
  const { profile, gamification, transactions, debts } = appData;
  const unlocked = gamification.achievements;

  if (transactions.length > 0 && !unlocked.includes('first_transaction')) {
    unlockAchievement('first_transaction');
  }
  if (gamification.streak >= 7 && !unlocked.includes('streak_7')) {
    unlockAchievement('streak_7');
  }
  if (gamification.streak >= 30 && !unlocked.includes('streak_30')) {
    unlockAchievement('streak_30');
  }
  if (profile.currentCapital >= 1000000 && !unlocked.includes('first_million')) {
    unlockAchievement('first_million');
  }
  // debt_killer — только через кнопку «Завершить»
  const savingsAlloc = (appData.envelopes.savings?.budget || 0) + (appData.envelopes.investments?.budget || 0);
  const actualSavingsRate = profile.monthlyIncome > 0 ? (savingsAlloc / profile.monthlyIncome) * 100 : 0;
  if (actualSavingsRate >= 50 && !unlocked.includes('savings_master')) {
    unlockAchievement('savings_master');
  }

  const level = levelFromXp(gamification.xp).level;
  if (level >= 10 && !unlocked.includes('level_10')) unlockAchievement('level_10');
  if (level >= 50 && !unlocked.includes('level_50')) unlockAchievement('level_50');

  const expenseCount = transactions.filter(t => t.type === 'expense').length;
  const envelopes = Object.values(appData.envelopes);
  const hasSpending = envelopes.some(e => e.budget > 0 && e.amount < e.budget);
  const noOverspend = envelopes.every(e => e.amount >= 0);
  if (expenseCount >= 5 && hasSpending && noOverspend && !unlocked.includes('budget_hero')) {
    unlockAchievement('budget_hero');
  }
}

/** Streak — начисляется раз в день при открытии */
function updateStreak() {
  const todayStr = today();
  const lastActive = appData.gamification.lastActiveDate;

  if (lastActive === todayStr) return;

  if (!lastActive) {
    appData.gamification.streak = 1;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = localDateStr(yesterday);
    appData.gamification.streak = lastActive === yesterdayStr
      ? appData.gamification.streak + 1
      : 1;
  }

  appData.gamification.lastActiveDate = todayStr;
  saveData(appData);
}

/** История капитала */
function updateCapitalHistory() {
  const history = appData.gamification.capitalHistory;
  const monthKey = localMonthKey();
  const existing = history.find(h => h.date === monthKey);

  if (existing) {
    existing.value = appData.profile.currentCapital;
  } else {
    history.push({ date: monthKey, value: appData.profile.currentCapital });
    if (history.length > 12) history.shift();
  }
}

/** Main Button Telegram */
function updateMainButton() {
  if (!tg?.MainButton) return;

  const labels = {
    dashboard: '➕ Добавить доход/расход',
    calculators: '🔄 Пересчитать',
  };

  const label = labels[currentTab];
  if (label) {
    tg.MainButton.setText(label);
    tg.MainButton.show();
  } else {
    tg.MainButton.hide();
  }
}

function handleMainButton() {
  haptic('medium');
  if (currentTab === 'dashboard') {
    switchTab('tracking');
  } else if (currentTab === 'calculators') {
    const container = document.getElementById('main-content');
    container.querySelector('#btn-recalc')?.click();
  }
}

/** Level up overlay */
function showLevelUp(level) {
  const avatar = getAvatarForLevel(level, AVATARS);
  const overlay = document.createElement('div');
  overlay.className = 'level-up-overlay';
  overlay.innerHTML = `
    <div class="level-up-card glass gold-border">
      <span class="emoji">${avatar.emoji}</span>
      <h2>Уровень ${level}!</h2>
      <p>${avatar.title}</p>
      <button class="btn btn-gold" style="margin-top:20px">Продолжить</button>
    </div>
  `;
  document.body.appendChild(overlay);
  celebrate();

  overlay.querySelector('button').addEventListener('click', () => {
    overlay.remove();
    haptic('light');
  });
}

/** Onboarding */
function showOnboarding() {
  let step = 0;
  const totalSteps = 4;
  let importedDuringOnboarding = false;
  onboardingOpen = true;
  document.getElementById('bottom-nav')?.classList.add('hidden');

  const overlay = document.createElement('div');
  overlay.className = 'onboarding';
  document.body.appendChild(overlay);

  function renderStep() {
    const steps = [
      {
        title: '⚔️ Финансовый Герой',
        content: `<p>Добро пожаловать в мир геймифицированных финансов! Управляй деньгами как RPG-персонажем, копи XP и достигай финансовой свободы.</p>`,
        fields: '',
      },
      {
        title: '💰 Твои финансы',
        content: `<p>Укажи базовые параметры для старта:</p>`,
        fields: `
          <div class="form-group"><label>Ежемесячный доход (₽)</label>
            <input type="number" class="input" id="ob-income" value="80000"></div>
          <div class="form-group"><label>Стартовый капитал (₽)</label>
            <input type="number" class="input" id="ob-capital" value="900000"></div>
          <div class="form-group"><label>Норма сбережений (%)</label>
            <input type="number" class="input" id="ob-savings" value="30" min="0" max="100"></div>
        `,
      },
      {
        title: '📊 Импорт данных',
        content: `<p>Можешь импортировать данные из Excel-таблицы или JSON. Или пропусти этот шаг.</p>`,
        fields: `
          <label class="btn btn-outline file-btn" style="display:block;margin-bottom:8px">
            📥 Импорт JSON <input type="file" id="ob-import-json" accept=".json" hidden>
          </label>
          <label class="btn btn-outline file-btn" style="display:block">
            📊 Импорт Excel <input type="file" id="ob-import-xlsx" accept=".xlsx,.xls" hidden>
          </label>
        `,
      },
      {
        title: '🚀 Готов к приключению!',
        content: `<p>Твой путь к финансовой свободе начинается сейчас. Записывай расходы, копи XP и становись легендой!</p>`,
        fields: '',
      },
    ];

    const s = steps[step];
    overlay.innerHTML = `
      <div class="onboarding-step fade-in">
        <h1>${s.title}</h1>
        ${s.content}
        ${s.fields}
      </div>
      <div class="onboarding-dots">
        ${Array.from({ length: totalSteps }, (_, i) =>
          `<div class="dot ${i === step ? 'active' : ''}"></div>`
        ).join('')}
      </div>
      <div class="onboarding-actions">
        ${step > 0 ? '<button class="btn btn-outline" id="ob-back">Назад</button>' : ''}
        <button class="btn btn-gold" id="ob-next">${step === totalSteps - 1 ? 'Начать!' : 'Далее'}</button>
      </div>
    `;

    overlay.querySelector('#ob-back')?.addEventListener('click', () => { step--; renderStep(); });
    overlay.querySelector('#ob-next')?.addEventListener('click', finishStep);

    overlay.querySelector('#ob-import-json')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const { importJSON } = await import('./utils/storage.js');
        appData = await importJSON(file);
        importedDuringOnboarding = true;
        saveData(appData);
        showToast('Данные импортированы!');
      } catch (err) { showToast(err.message); }
    });

    overlay.querySelector('#ob-import-xlsx')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const { importXLSX } = await import('./utils/storage.js');
        appData = await importXLSX(file);
        importedDuringOnboarding = true;
        saveData(appData);
        showToast('Excel импортирован!');
      } catch (err) { showToast(err.message); }
    });
  }

  function finishStep() {
    if (step === 1) {
      const income = parseFloat(overlay.querySelector('#ob-income')?.value) || 80000;
      const capital = parseFloat(overlay.querySelector('#ob-capital')?.value) || 900000;
      const savings = parseFloat(overlay.querySelector('#ob-savings')?.value) || 30;

      appData.profile.monthlyIncome = income;
      appData.profile.startingCapital = capital;
      appData.profile.currentCapital = capital;
      appData.profile.savingsRate = savings;

      const dist = distributeEnvelopes(income, appData.budgetRule);
      Object.keys(appData.envelopes).forEach(key => {
        if (dist[key]) {
          appData.envelopes[key].budget = dist[key];
          appData.envelopes[key].amount = dist[key];
        }
      });
    }

    if (step < totalSteps - 1) {
      step++;
      renderStep();
    } else {
      appData.onboardingComplete = true;
      if (!importedDuringOnboarding) {
        appData.transactions = [];
        appData.gamification.xp = 0;
        appData.gamification.achievements = [];
        appData.gamification.streak = 1;
      }
      appData.gamification.lastActiveDate = today();
      appData.gamification.capitalHistory = [{
        date: localMonthKey(),
        value: appData.profile.currentCapital,
      }];
      syncYearlyBudget(appData);
      setAppSettings(appData.settings);
      saveData(appData);
      onboardingOpen = false;
      document.getElementById('bottom-nav')?.classList.remove('hidden');
      overlay.remove();
      celebrate();
      render();
    }
  }

  renderStep();
}

// Запуск
document.addEventListener('DOMContentLoaded', init);
