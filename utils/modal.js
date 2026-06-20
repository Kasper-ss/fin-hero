/**
 * Модальные окна — работают в Telegram WebApp (prompt/confirm не работают)
 */

let activeResolve = null;

function getOverlay() {
  let el = document.getElementById('app-modal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-modal';
    el.className = 'modal-overlay hidden';
    el.innerHTML = `
      <div class="modal glass" role="dialog">
        <h3 id="app-modal-title"></h3>
        <p id="app-modal-text" class="modal-text"></p>
        <div id="app-modal-fields"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" id="app-modal-cancel">Отмена</button>
          <button type="button" class="btn btn-gold" id="app-modal-ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    el.querySelector('#app-modal-cancel').addEventListener('click', () => closeModal(null));
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(null); });
  }
  return el;
}

function closeModal(result) {
  const el = document.getElementById('app-modal');
  if (el) el.classList.add('hidden');
  if (activeResolve) {
    const r = activeResolve;
    activeResolve = null;
    r(result);
  }
}

/** Запрос суммы */
export function askAmount(title, { defaultValue = '', placeholder = 'Сумма (₽)', hint = '', allowZero = false } = {}) {
  return new Promise((resolve) => {
    if (activeResolve) closeModal(null);
    activeResolve = resolve;
    const el = getOverlay();
    el.querySelector('#app-modal-title').textContent = title;
    el.querySelector('#app-modal-text').textContent = hint;
    el.querySelector('#app-modal-text').style.display = hint ? 'block' : 'none';
    el.querySelector('#app-modal-fields').innerHTML = `
      <input type="number" class="input" id="app-modal-input" placeholder="${placeholder}"
             value="${defaultValue != null && defaultValue !== '' ? defaultValue : ''}" min="0" inputmode="decimal">
    `;
    const input = el.querySelector('#app-modal-input');
    el.classList.remove('hidden');
    input.focus();

    const submit = () => {
      const val = parseFloat(input.value);
      if (isNaN(val) || val < 0 || (!allowZero && val <= 0)) {
        closeModal(null);
        return;
      }
      closeModal(val);
    };
    el.querySelector('#app-modal-ok').onclick = submit;
    input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  });
}

/** Подтверждение */
export function askConfirm(title, text = '') {
  return new Promise((resolve) => {
    if (activeResolve) closeModal(null);
    activeResolve = (v) => resolve(!!v);
    const el = getOverlay();
    el.querySelector('#app-modal-title').textContent = title;
    el.querySelector('#app-modal-text').textContent = text;
    el.querySelector('#app-modal-text').style.display = text ? 'block' : 'none';
    el.querySelector('#app-modal-fields').innerHTML = '';
    el.classList.remove('hidden');
    el.querySelector('#app-modal-ok').onclick = () => closeModal(true);
  });
}

/** Текстовый ввод */
export function askText(title, { defaultValue = '', placeholder = '' } = {}) {
  return new Promise((resolve) => {
    if (activeResolve) closeModal(null);
    activeResolve = resolve;
    const el = getOverlay();
    el.querySelector('#app-modal-title').textContent = title;
    el.querySelector('#app-modal-text').style.display = 'none';
    el.querySelector('#app-modal-fields').innerHTML = `
      <input type="text" class="input" id="app-modal-input" placeholder="${placeholder}" value="${defaultValue}">
    `;
    const input = el.querySelector('#app-modal-input');
    el.classList.remove('hidden');
    input.focus();
    el.querySelector('#app-modal-ok').onclick = () => {
      const val = input.value.trim();
      closeModal(val || null);
    };
  });
}
