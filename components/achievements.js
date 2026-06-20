/**
 * Достижения, профиль, тест инвестора, настройки
 */

import {
  formatMoney, getAvatarForLevel, levelFromXp, haptic, celebrate,
} from '../utils/helpers.js';
import {
  ACHIEVEMENTS_DEF, AVATARS, INVESTOR_TEST, INVESTOR_TYPES,
} from '../data/defaultData.js';
import { syncYearlyBudget } from '../utils/calculations.js';
import { exportJSON, importJSON, importXLSX, resetData } from '../utils/storage.js';
import { askConfirm } from '../utils/modal.js';
import { showToast } from '../utils/ui.js';
import { escapeHtml } from '../utils/helpers.js';

/** Рендер достижений и профиля */
export function renderAchievements(container, data, onUpdate) {
  const { profile, gamification } = data;
  const levelInfo = levelFromXp(gamification.xp);
  const avatar = getAvatarForLevel(levelInfo.level, AVATARS);
  const unlocked = gamification.achievements || [];
  const investorType = profile.investorType ? INVESTOR_TYPES[profile.investorType] : null;

  container.innerHTML = `
    <div class="achievements fade-in">
      <!-- Профиль -->
      <section class="profile-card glass gold-border">
        <div class="profile-avatar">${avatar.emoji}</div>
        <h2>${escapeHtml(profile.name)}</h2>
        <p class="profile-title">${avatar.title} · Ур. ${levelInfo.level}</p>
        ${investorType ? `<p class="investor-badge">${investorType.emoji} ${investorType.name}</p>` : ''}
        <div class="profile-stats">
          <div><span>💰</span><strong>${formatMoney(profile.currentCapital)}</strong></div>
          <div><span>🔥</span><strong>${gamification.streak} дн.</strong></div>
          <div><span>🏅</span><strong>${unlocked.length}/${ACHIEVEMENTS_DEF.length}</strong></div>
        </div>
      </section>

      <!-- Достижения -->
      <h3 class="section-title">🏆 Достижения</h3>
      <div class="achievements-grid">
        ${ACHIEVEMENTS_DEF.map(a => {
          const isUnlocked = unlocked.includes(a.id);
          return `
            <div class="achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}" title="${a.desc}">
              <span class="ach-icon">${isUnlocked ? a.icon : '🔒'}</span>
              <span class="ach-name">${a.name}</span>
              ${a.xp ? `<span class="ach-xp">+${a.xp} XP</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Тест инвестора -->
      <section class="investor-test glass">
        <h3 class="section-title">🧠 Какой ты инвестор?</h3>
        ${investorType
          ? `<p class="investor-result">${investorType.emoji} <strong>${investorType.name}</strong><br>${investorType.desc}</p>
             <button class="btn btn-outline btn-sm" id="btn-retest">Пройти заново</button>`
          : `<button class="btn btn-gold" id="btn-start-test">Начать тест</button>`
        }
        <div id="test-container" class="hidden"></div>
      </section>

      <!-- Настройки -->
      <section class="settings glass">
        <h3 class="section-title">⚙️ Настройки</h3>
        <div class="settings-list">
          <label class="setting-item">
            <span>Имя героя</span>
            <input type="text" id="setting-name" class="input" value="${profile.name}">
          </label>
          <label class="setting-item">
            <span>Доход/мес (₽)</span>
            <input type="number" id="setting-income" class="input" value="${profile.monthlyIncome}">
          </label>
          <label class="setting-item">
            <span>Начальный вклад (₽)</span>
            <input type="number" id="setting-starting-capital" class="input" value="${profile.startingCapital}" min="0" step="1000">
          </label>
          <label class="setting-item">
            <span>Текущий капитал (₽)</span>
            <input type="number" id="setting-capital" class="input" value="${profile.currentCapital}" min="0" step="1000">
          </label>
          <label class="setting-item toggle">
            <span>Синхр. капитал с вкладом</span>
            <input type="checkbox" id="setting-sync-capital" ${data.settings.syncCapitalWithStarting ? 'checked' : ''}>
          </label>
          <label class="setting-item">
            <span>Норма сбережений (%)</span>
            <input type="number" id="setting-savings" class="input" value="${profile.savingsRate}" min="0" max="100">
          </label>
          <label class="setting-item toggle">
            <span>Haptic feedback</span>
            <input type="checkbox" id="setting-haptic" ${data.settings.hapticEnabled ? 'checked' : ''}>
          </label>
          <label class="setting-item toggle">
            <span>Конфетти</span>
            <input type="checkbox" id="setting-confetti" ${data.settings.confettiEnabled ? 'checked' : ''}>
          </label>
        </div>

        <div class="settings-actions">
          <button class="btn btn-outline" id="btn-export">📤 Экспорт JSON</button>
          <label class="btn btn-outline file-btn">
            📥 Импорт JSON
            <input type="file" id="import-json" accept=".json" hidden>
          </label>
          <label class="btn btn-outline file-btn">
            📊 Импорт Excel
            <input type="file" id="import-xlsx" accept=".xlsx,.xls" hidden>
          </label>
          <button class="btn btn-danger btn-sm" id="btn-reset">🗑️ Сбросить данные</button>
        </div>
      </section>
    </div>
  `;

  bindAchievementEvents(container, data, onUpdate);
}

function bindAchievementEvents(container, data, onUpdate) {
  // Настройки
  container.querySelector('#setting-name')?.addEventListener('change', (e) => {
    data.profile.name = e.target.value;
    onUpdate(data, { silent: true });
  });
  container.querySelector('#setting-income')?.addEventListener('change', (e) => {
    data.profile.monthlyIncome = parseFloat(e.target.value) || 0;
    syncYearlyBudget(data);
    onUpdate(data, { silent: true });
  });
  container.querySelector('#setting-starting-capital')?.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value) || 0;
    data.profile.startingCapital = val;
    if (container.querySelector('#setting-sync-capital')?.checked) {
      data.profile.currentCapital = val;
    }
    onUpdate(data, { silent: true });
  });
  container.querySelector('#setting-capital')?.addEventListener('change', (e) => {
    data.profile.currentCapital = parseFloat(e.target.value) || 0;
    onUpdate(data, { silent: true });
  });
  container.querySelector('#setting-savings')?.addEventListener('change', (e) => {
    data.profile.savingsRate = parseFloat(e.target.value) || 0;
    onUpdate(data, { silent: true });
  });
  container.querySelector('#setting-sync-capital')?.addEventListener('change', (e) => {
    data.settings.syncCapitalWithStarting = e.target.checked;
    onUpdate(data, { silent: true });
  });
  container.querySelector('#setting-haptic')?.addEventListener('change', (e) => {
    data.settings.hapticEnabled = e.target.checked;
    onUpdate(data, { silent: true });
  });
  container.querySelector('#setting-confetti')?.addEventListener('change', (e) => {
    data.settings.confettiEnabled = e.target.checked;
    onUpdate(data, { silent: true });
  });

  // Экспорт/импорт
  container.querySelector('#btn-export')?.addEventListener('click', () => {
    exportJSON(data);
    haptic('success');
  });

  container.querySelector('#import-json')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = await importJSON(file);
      haptic('success');
      onUpdate(imported, { achievement: 'import_data' });
    } catch (err) {
      showToast(err.message);
    }
  });

  container.querySelector('#import-xlsx')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = await importXLSX(file);
      haptic('success');
      onUpdate(imported, { achievement: 'import_data' });
    } catch (err) {
      showToast(err.message);
    }
  });

  container.querySelector('#btn-reset')?.addEventListener('click', async () => {
    const ok = await askConfirm('Сбросить все данные?', 'Уровень, XP и ачивки обнулятся. Это необратимо!');
    if (!ok) return;
    resetData();
    haptic('warning');
    location.reload();
  });

  // Тест инвестора
  container.querySelector('#btn-start-test')?.addEventListener('click', () => {
    startInvestorTest(container, data, onUpdate);
  });
  container.querySelector('#btn-retest')?.addEventListener('click', () => {
    startInvestorTest(container, data, onUpdate);
  });
}

/** Тест инвестора */
function startInvestorTest(container, data, onUpdate) {
  const testContainer = container.querySelector('#test-container');
  testContainer.classList.remove('hidden');
  let currentQ = 0;
  const scores = { conservative: 0, balanced: 0, aggressive: 0, spender: 0 };

  function showQuestion() {
    if (currentQ >= INVESTOR_TEST.length) {
      const result = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
      data.profile.investorType = result;
      const type = INVESTOR_TYPES[result];
      testContainer.innerHTML = `
        <div class="test-result">
          <span class="test-emoji">${type.emoji}</span>
          <h4>${type.name}</h4>
          <p>${type.desc}</p>
        </div>
      `;
      celebrate();
      const opts = {};
      if (!data.gamification.achievements.includes('investor_test')) {
        opts.achievement = 'investor_test';
      }
      onUpdate(data, opts);
      return;
    }

    const q = INVESTOR_TEST[currentQ];
    testContainer.innerHTML = `
      <p class="test-progress">Вопрос ${currentQ + 1}/${INVESTOR_TEST.length}</p>
      <p class="test-question">${q.question}</p>
      <div class="test-options">
        ${q.options.map((opt, i) => `
          <button class="test-option" data-idx="${i}">${opt.text}</button>
        `).join('')}
      </div>
    `;

    testContainer.querySelectorAll('.test-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = q.options[parseInt(btn.dataset.idx)];
        scores[opt.type]++;
        currentQ++;
        haptic('selection');
        showQuestion();
      });
    });
  }

  showQuestion();
}
