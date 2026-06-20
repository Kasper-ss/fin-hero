/**
 * Хранение данных: localStorage + экспорт/импорт JSON
 */

import { DEFAULT_DATA } from '../data/defaultData.js';
import { distributeEnvelopes } from './calculations.js';
import { localMonthKey } from './helpers.js';

const STORAGE_KEY = 'fin_hero_data';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Глубокое слияние конвертов */
function mergeEnvelopes(defaults, saved = {}) {
  const result = {};
  for (const key of Object.keys(defaults)) {
    result[key] = { ...defaults[key], ...(saved[key] || {}) };
  }
  return result;
}

/** Загрузить данные */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(DEFAULT_DATA);
    return mergeWithDefaults(JSON.parse(raw));
  } catch (e) {
    console.error('Ошибка загрузки данных:', e);
    return deepClone(DEFAULT_DATA);
  }
}

/** Слияние с дефолтами (для миграций) */
function mergeWithDefaults(data) {
  const defaults = deepClone(DEFAULT_DATA);
  return {
    ...defaults,
    ...data,
    profile: { ...defaults.profile, ...data.profile },
    envelopes: mergeEnvelopes(defaults.envelopes, data.envelopes),
    gamification: {
      ...defaults.gamification,
      ...data.gamification,
      achievements: data.gamification?.achievements ?? [],
      capitalHistory: data.gamification?.capitalHistory ?? [],
    },
    calculators: { ...defaults.calculators, ...data.calculators },
    settings: { ...defaults.settings, ...data.settings },
    transactions: data.transactions ?? [],
    goals: data.goals ?? [],
    debts: data.debts ?? [],
    yearlyBudget: data.yearlyBudget ?? {},
  };
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Ошибка сохранения:', e);
    return false;
  }
}

export function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fin-hero-${localMonthKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(mergeWithDefaults(JSON.parse(e.target.result)));
      } catch {
        reject(new Error('Неверный формат JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}

export function importXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(mergeWithDefaults(parseWorkbook(XLSX.read(e.target.result, { type: 'array' }))));
      } catch (err) {
        reject(new Error('Ошибка чтения Excel: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsArrayBuffer(file);
  });
}

function parseWorkbook(workbook) {
  const result = deepClone(DEFAULT_DATA);
  const mainSheet = workbook.SheetNames[0];
  if (mainSheet) {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[mainSheet], { header: 1 });
    sheet.forEach(row => {
      const label = String(row[0] || '').toLowerCase();
      const value = parseFloat(row[1]);
      if (isNaN(value)) return;
      if (label.includes('доход')) result.profile.monthlyIncome = value;
      if (label.includes('капитал') || label.includes('накоплен')) {
        result.profile.currentCapital = value;
        result.profile.startingCapital = value;
      }
      if (label.includes('сбережен') || label.includes('норма')) result.profile.savingsRate = value;
    });
  }

  const dist = distributeEnvelopes(result.profile.monthlyIncome, result.budgetRule);
  Object.keys(result.envelopes).forEach(key => {
    if (dist[key] != null) {
      result.envelopes[key].budget = dist[key];
      result.envelopes[key].amount = dist[key];
    }
  });

  result.onboardingComplete = true;
  return result;
}

/** Полный сброс */
export function resetData() {
  const fresh = deepClone(DEFAULT_DATA);
  fresh.onboardingComplete = false;
  fresh.transactions = [];
  fresh.goals = [];
  fresh.debts = [];
  fresh.gamification = {
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: null,
    achievements: [],
    capitalHistory: [],
  };
  fresh.yearlyBudget = {};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export const cloudAdapter = {
  async sync(data) {
    console.log('Cloud sync not configured', data.version);
    return { success: false, reason: 'not_configured' };
  },
  async pull() {
    return null;
  },
};
