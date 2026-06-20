/**
 * Вспомогательные функции
 */

/** Форматирование денег */
export function formatMoney(amount, currency = '₽') {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(num) + ' ' + currency;
}

/** Форматирование процентов */
export function formatPercent(value, decimals = 0) {
  return `${Number(value).toFixed(decimals)}%`;
}

/** Генерация уникального ID */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Форматирование даты */
export function formatDate(dateStr, options = {}) {
  const date = new Date(dateStr);
  const defaults = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('ru-RU', { ...defaults, ...options });
}

/** Локальная дата YYYY-MM-DD */
export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Локальный месяц YYYY-MM */
export function localMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Сегодняшняя дата (локальная) */
export function today() {
  return localDateStr();
}

/** Разница в днях */
export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
}

import { getAppSettings } from './ui.js';

/** Haptic feedback через Telegram */
export function haptic(type = 'light') {
  if (getAppSettings().hapticEnabled === false) return;
  const tg = window.Telegram?.WebApp;
  if (!tg?.HapticFeedback) return;
  const map = {
    light: () => tg.HapticFeedback.impactOccurred('light'),
    medium: () => tg.HapticFeedback.impactOccurred('medium'),
    heavy: () => tg.HapticFeedback.impactOccurred('heavy'),
    success: () => tg.HapticFeedback.notificationOccurred('success'),
    warning: () => tg.HapticFeedback.notificationOccurred('warning'),
    error: () => tg.HapticFeedback.notificationOccurred('error'),
    selection: () => tg.HapticFeedback.selectionChanged(),
  };
  map[type]?.();
}

/** Конфетти при достижениях */
export function celebrate() {
  if (getAppSettings().confettiEnabled === false) {
    haptic('success');
    return;
  }
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#22c55e', '#3b82f6', '#a78bfa'],
    });
  }
  haptic('success');
}

/** Debounce */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Получить аватар по уровню */
export function getAvatarForLevel(level, avatars) {
  let avatar = avatars[0];
  for (const a of avatars) {
    if (level >= a.minLevel) avatar = a;
  }
  return avatar;
}

/** XP для уровня (экспоненциальная шкала) */
export function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

/** Общий XP до уровня */
export function totalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

/** Уровень по XP */
export function levelFromXp(xp) {
  let level = 1;
  let remaining = xp;
  while (level < 100 && remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, currentXp: remaining, xpNeeded: xpForLevel(level) };
}

/** Прогресс к финансовой свободе (правило 25x годовых расходов) */
export function financialFreedomProgress(capital, monthlyExpenses) {
  if (monthlyExpenses <= 0) return 0;
  const annualExpenses = monthlyExpenses * 12;
  const target = annualExpenses * 25;
  return Math.min(100, (capital / target) * 100);
}

/** Склонение слов */
export function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** Безопасный HTML escape */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Создать DOM элемент */
export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'className') element.className = val;
    else if (key === 'innerHTML') element.innerHTML = val;
    else if (key.startsWith('on') && typeof val === 'function') element.addEventListener(key.slice(2).toLowerCase(), val);
    else if (key === 'dataset') Object.entries(val).forEach(([k, v]) => (element.dataset[k] = v));
    else element.setAttribute(key, val);
  });
  children.forEach(child => {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child) element.appendChild(child);
  });
  return element;
}

/** Анимация числа */
export function animateNumber(element, from, to, duration = 800, formatter = (n) => n) {
  const start = performance.now();
  const diff = to - from;
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter(from + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Поделиться результатом */
export async function shareProgress(data) {
  const text = `🏆 Финансовый Герой\n💰 Капитал: ${formatMoney(data.currentCapital)}\n⭐ Уровень: ${data.level}\n🔥 Streak: ${data.streak} дней\n\n#ФинансовыйГерой`;
  const tg = window.Telegram?.WebApp;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(`https://t.me/share/url?url=&text=${encodeURIComponent(text)}`);
  } else if (navigator.share) {
    await navigator.share({ text });
  } else {
    await navigator.clipboard.writeText(text);
    return 'Скопировано в буфер обмена!';
  }
  return null;
}
