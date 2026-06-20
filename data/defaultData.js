/**
 * Дефолтные данные приложения «Финансовый Герой»
 * Основано на методологии таблицы Артема Зуева
 */

export const DEFAULT_DATA = {
  version: 1,
  onboardingComplete: false,
  profile: {
    name: 'Герой',
    monthlyIncome: 80000,
    startingCapital: 900000,
    currentCapital: 900000,
    savingsRate: 30, // % от дохода
    targetSavingsRate: 50,
    investorType: null, // результат теста
    createdAt: new Date().toISOString(),
  },

  // Конверты (метод счетов)
  envelopes: {
    fixed: { name: 'Постоянные', icon: '🏠', amount: 32000, budget: 32000, color: '#3b82f6' },
    variable: { name: 'Переменные', icon: '🛒', amount: 16000, budget: 16000, color: '#8b5cf6' },
    savings: { name: 'Сбережения', icon: '💰', amount: 16000, budget: 16000, color: '#22c55e' },
    investments: { name: 'Инвестиции', icon: '📈', amount: 8000, budget: 8000, color: '#f59e0b' },
    debts: { name: 'Долги', icon: '💳', amount: 4000, budget: 4000, color: '#ef4444' },
    wants: { name: 'Хотелки', icon: '🎮', amount: 4000, budget: 4000, color: '#ec4899' },
  },

  // Бюджетное правило (50/30/20 или 30/20/50)
  budgetRule: '50/30/20',

  // Транзакции (пусто — пользователь добавляет сам)
  transactions: [],

  // Цели (пусто — пользователь добавляет сам)
  goals: [],

  // Долги (пусто)
  debts: [],

  // Геймификация
  gamification: {
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: null,
    achievements: [],
    capitalHistory: [],
  },

  // Годовой бюджет — пересчитывается из профиля и конвертов
  yearlyBudget: {},

  calculators: {
    annualReturn: 12,
    inflationRate: 8,
    yearsToSimulate: 10,
    carPrice: 2500000,
    carYears: 5,
    investmentAlternative: 1500000,
  },

  settings: {
    currency: '₽',
    locale: 'ru-RU',
    hapticEnabled: true,
    confettiEnabled: true,
    syncCapitalWithStarting: false,
  },
};

/** Категории расходов из таблицы */
export const EXPENSE_CATEGORIES = [
  { name: 'Еда', icon: '🍕', envelope: 'variable' },
  { name: 'Транспорт', icon: '🚗', envelope: 'variable' },
  { name: 'ЖКХ', icon: '🏠', envelope: 'fixed' },
  { name: 'Связь', icon: '📱', envelope: 'fixed' },
  { name: 'Подписки', icon: '📺', envelope: 'fixed' },
  { name: 'Здоровье', icon: '💊', envelope: 'variable' },
  { name: 'Одежда', icon: '👕', envelope: 'wants' },
  { name: 'Развлечения', icon: '🎬', envelope: 'wants' },
  { name: 'Образование', icon: '📚', envelope: 'investments' },
  { name: 'Подарки', icon: '🎁', envelope: 'wants' },
  { name: 'Прочее', icon: '📦', envelope: 'variable' },
];

/** Достижения */
export const ACHIEVEMENTS_DEF = [
  { id: 'first_transaction', name: 'Первый шаг', desc: 'Запиши первую транзакцию', icon: '👣', xp: 50 },
  { id: 'streak_7', name: 'Неделя дисциплины', desc: '7 дней подряд активности', icon: '🔥', xp: 100 },
  { id: 'streak_30', name: 'Месяц силы', desc: '30 дней streak', icon: '💪', xp: 500 },
  { id: 'first_million', name: 'Первый миллион', desc: 'Капитал достиг 1 000 000 ₽', icon: '💎', xp: 1000 },
  { id: 'debt_killer', name: 'Долговой убийца', desc: 'Закрой все долги', icon: '⚔️', xp: 800 },
  { id: 'savings_master', name: 'Мастер сбережений', desc: 'Норма сбережений 50%+', icon: '🏆', xp: 300 },
  { id: 'goal_complete', name: 'Мечтатель', desc: 'Достигни первую цель', icon: '🎯', xp: 200 },
  { id: 'level_10', name: 'Ветеран', desc: 'Достигни 10 уровень', icon: '⭐', xp: 0 },
  { id: 'level_50', name: 'Легенда', desc: 'Достигни 50 уровень', icon: '👑', xp: 0 },
  { id: 'budget_hero', name: 'Бюджетный герой', desc: '3+ расходов и уложился в бюджет конвертов', icon: '🛡️', xp: 150 },
  { id: 'investor_test', name: 'Самопознание', desc: 'Пройди тест инвестора', icon: '🧠', xp: 75 },
  { id: 'import_data', name: 'Архивариус', desc: 'Импортируй данные', icon: '📂', xp: 50 },
];

/** Аватары по уровням (каждые 5 уровней) */
export const AVATARS = [
  { minLevel: 1, emoji: '🧙‍♂️', title: 'Новичок' },
  { minLevel: 5, emoji: '⚔️', title: 'Воин' },
  { minLevel: 10, emoji: '🛡️', title: 'Страж' },
  { minLevel: 15, emoji: '🏹', title: 'Лучник' },
  { minLevel: 20, emoji: '🔮', title: 'Маг' },
  { minLevel: 25, emoji: '🐉', title: 'Драконоборец' },
  { minLevel: 30, emoji: '👑', title: 'Король' },
  { minLevel: 40, emoji: '🌟', title: 'Легенда' },
  { minLevel: 50, emoji: '💫', title: 'Бессмертный' },
  { minLevel: 75, emoji: '🏆', title: 'Финансовый бог' },
  { minLevel: 100, emoji: '💎', title: 'Абсолют' },
];

/** Вопросы теста инвестора */
export const INVESTOR_TEST = [
  {
    question: 'Что ты сделаешь с неожиданным бонусом 50 000 ₽?',
    options: [
      { text: 'Потрачу на хотелки', type: 'spender' },
      { text: 'Положу на депозит', type: 'conservative' },
      { text: 'Инвестирую в ETF', type: 'balanced' },
      { text: 'Вложу в свой бизнес', type: 'aggressive' },
    ],
  },
  {
    question: 'Портфель упал на 20%. Твоя реакция?',
    options: [
      { text: 'Паника, продаю всё', type: 'spender' },
      { text: 'Жду восстановления', type: 'conservative' },
      { text: 'Докупаю по сниженной цене', type: 'aggressive' },
      { text: 'Пересматриваю распределение', type: 'balanced' },
    ],
  },
  {
    question: 'Какой горизонт инвестирования?',
    options: [
      { text: 'До 1 года', type: 'spender' },
      { text: '1-3 года', type: 'conservative' },
      { text: '3-7 лет', type: 'balanced' },
      { text: '10+ лет', type: 'aggressive' },
    ],
  },
  {
    question: 'Как относишься к риску?',
    options: [
      { text: 'Избегаю любой', type: 'conservative' },
      { text: 'Готов на умеренный', type: 'balanced' },
      { text: 'Чем выше — тем лучше', type: 'aggressive' },
      { text: 'Риск — это потери', type: 'spender' },
    ],
  },
  {
    question: 'Что важнее?',
    options: [
      { text: 'Сохранить капитал', type: 'conservative' },
      { text: 'Стабильный доход', type: 'balanced' },
      { text: 'Максимальный рост', type: 'aggressive' },
      { text: 'Наслаждаться жизнью', type: 'spender' },
    ],
  },
];

export const INVESTOR_TYPES = {
  conservative: { name: 'Хранитель', emoji: '🏦', desc: 'Безопасность превыше всего. Депозиты и облигации — твой выбор.' },
  balanced: { name: 'Стратег', emoji: '⚖️', desc: 'Баланс риска и доходности. Диверсифицированный портфель.' },
  aggressive: { name: 'Охотник', emoji: '🎯', desc: 'Высокий риск — высокая награда. Акции и стартапы.' },
  spender: { name: 'Искатель', emoji: '🌈', desc: 'Живёшь сегодня. Пора начать копить!' },
};
