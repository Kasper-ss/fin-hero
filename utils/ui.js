/**
 * UI-утилиты: toast, настройки приложения
 */

let appSettings = { hapticEnabled: true, confettiEnabled: true };

export function setAppSettings(settings = {}) {
  appSettings = { ...appSettings, ...settings };
}

export function getAppSettings() {
  return appSettings;
}

/** Toast-уведомление */
export function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
