// =====================================================
// «Зерно» — меню, корзина, квиз, карта лояльности
// =====================================================

// ---------- Меню ----------
const MENU = {
  coffee: {
    photo: 'img/flatlay.jpg',
    note: 'Зерно этой недели — Эфиопия Иргачефф',
    items: [
      { id: 'espresso', name: 'Эспрессо', desc: 'Плотный, с нотами шоколада', price: 150 },
      { id: 'americano', name: 'Американо', desc: 'Эспрессо и горячая вода', price: 180 },
      { id: 'filter', name: 'Фильтр-кофе', desc: 'Ягодный и лёгкий, на воронке', price: 200, tag: 'выбор бариста' },
      { id: 'flatwhite', name: 'Флэт уайт', desc: 'Двойной эспрессо и бархатное молоко', price: 260 },
      { id: 'cappuccino', name: 'Капучино', desc: 'Классика с плотной пенкой', price: 240 },
      { id: 'latte', name: 'Латте', desc: 'Много молока, мягкий вкус', price: 250 },
      { id: 'raf', name: 'Раф ванильный', desc: 'Сливки и натуральная ваниль', price: 290, tag: 'хит' },
      { id: 'bumble', name: 'Бамбл', desc: 'Апельсиновый сок, карамель и эспрессо', price: 280 }
    ]
  },
  pastry: {
    photo: 'img/croissant.jpg',
    note: 'Печём с 6:30 — к открытию всё ещё тёплое',
    items: [
      { id: 'croissant', name: 'Круассан классический', desc: 'Сливочное масло, 27 слоёв', price: 160, tag: 'хит' },
      { id: 'almond', name: 'Круассан с миндалём', desc: 'Франжипан и миндальные лепестки', price: 230 },
      { id: 'painchoc', name: 'Пан-о-шоколя', desc: 'С бельгийским шоколадом', price: 190 },
      { id: 'cinnabon', name: 'Синнабон', desc: 'Корица и сливочный крем', price: 210 },
      { id: 'ciabatta', name: 'Чиабатта', desc: 'На закваске, хрустящая корочка', price: 120 }
    ]
  },
  breakfast: {
    photo: 'img/breakfast.jpg',
    note: 'Завтраки — каждый день до 14:00',
    items: [
      { id: 'syrniki', name: 'Сырники', desc: 'Со сметаной и ягодным соусом', price: 340, tag: 'хит' },
      { id: 'oatmeal', name: 'Овсянка с ягодами', desc: 'На молоке, с мёдом и орехами', price: 280 },
      { id: 'benedict', name: 'Яйца бенедикт', desc: 'Бриошь, ветчина, голландез', price: 420 },
      { id: 'avocado', name: 'Тост с авокадо', desc: 'Яйцо пашот и микрозелень', price: 390 },
      { id: 'granola', name: 'Гранола', desc: 'Йогурт, домашняя гранола, фрукты', price: 300 }
    ]
  }
};

// Быстрый поиск позиции по id
const ITEMS = {};
Object.keys(MENU).forEach(function (cat) {
  MENU[cat].items.forEach(function (item) { ITEMS[item.id] = item; });
});

const OAT_PRICE = 40; // растительное молоко

function rub(n) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

// ---------- Всплывашка ----------
const toast = document.getElementById('toast');
let toastTimer;

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1800);
}

// ---------- Корзина ----------
// cart = { "latte": 2, "latte:oat": 1, "croissant": 1 }
let cart = {};
try {
  cart = JSON.parse(localStorage.getItem('zerno-cart')) || {};
} catch (error) {
  cart = {};
}

function saveCart() {
  try {
    localStorage.setItem('zerno-cart', JSON.stringify(cart));
  } catch (error) {
    // не страшно — корзина просто не запомнится
  }
}

// Название и цена позиции в корзине (учитываем «на овсяном»)
function cartLine(key) {
  const parts = key.split(':');
  const item = ITEMS[parts[0]];
  if (!item) return null;
  const oat = parts[1] === 'oat';
  return {
    name: item.name + (oat ? ' на овсяном' : ''),
    price: item.price + (oat ? OAT_PRICE : 0)
  };
}

function addToCart(key, sourceEl) {
  cart[key] = (cart[key] || 0) + 1;
  saveCart();
  renderCart();

  const count = document.getElementById('cart-count');
  count.classList.remove('bump');
  void count.offsetWidth; // перезапуск анимации
  count.classList.add('bump');

  showToast('☕ ' + cartLine(key).name + ' — в заказе');
  if (sourceEl) flyToCart(sourceEl);
}

function changeQty(key, delta) {
  cart[key] = (cart[key] || 0) + delta;
  if (cart[key] <= 0) delete cart[key];
  saveCart();
  renderCart();
}

// Кружок «летит» от кнопки к корзине
function flyToCart(fromEl) {
  const from = fromEl.getBoundingClientRect();
  const to = document.getElementById('cart-open').getBoundingClientRect();
  const dot = document.createElement('div');
  dot.className = 'bean';
  dot.style.left = from.left + from.width / 2 + 'px';
  dot.style.top = from.top + from.height / 2 + 'px';
  dot.style.setProperty('--x', (to.left + to.width / 2 - from.left - from.width / 2) + 'px');
  dot.style.setProperty('--y', (to.top + to.height / 2 - from.top - from.height / 2) + 'px');
  dot.style.setProperty('--r', '360deg');
  dot.style.animationDuration = '0.7s';
  document.body.append(dot);
  setTimeout(function () { dot.remove(); }, 700);
}

function cartTotal() {
  return Object.keys(cart).reduce(function (sum, key) {
    const line = cartLine(key);
    return sum + (line ? line.price * cart[key] : 0);
  }, 0);
}

function renderCart() {
  const keys = Object.keys(cart).filter(cartLine);
  const count = keys.reduce(function (n, key) { return n + cart[key]; }, 0);

  const badge = document.getElementById('cart-count');
  badge.textContent = count;
  badge.classList.toggle('has', count > 0);

  const list = document.getElementById('cart-list');
  list.innerHTML = '';
  document.getElementById('cart-foot').style.display = count ? '' : 'none';

  if (!count) {
    list.innerHTML = '<li class="cart-empty"><span>☕</span>Пока пусто. Добавь что-нибудь из меню</li>';
    return;
  }

  keys.forEach(function (key) {
    const line = cartLine(key);
    const li = document.createElement('li');
    li.className = 'cart-item';

    const name = document.createElement('h4');
    name.textContent = line.name;

    const sum = document.createElement('span');
    sum.className = 'sum';
    sum.textContent = rub(line.price * cart[key]);

    const qty = document.createElement('div');
    qty.className = 'qty';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Меньше');
    minus.addEventListener('click', function () { changeQty(key, -1); });
    const num = document.createElement('b');
    num.textContent = cart[key];
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Больше');
    plus.addEventListener('click', function () { changeQty(key, 1); });
    qty.append(minus, num, plus);

    const price = document.createElement('span');
    price.className = 'muted';
    price.textContent = rub(line.price) + ' / шт';

    li.append(name, sum, qty, price);
    list.append(li);
  });

  document.getElementById('cart-total').textContent = rub(cartTotal());
}

function openCart() {
  closeMenu();
  document.body.classList.add('cart-open');
}

function closeCart() {
  document.body.classList.remove('cart-open');
}

document.getElementById('cart-open').addEventListener('click', openCart);
document.getElementById('cart-close').addEventListener('click', closeCart);
document.getElementById('overlay').addEventListener('click', closeCart);

// Оформление: показываем окно с наполняющейся чашкой
const doneModal = document.getElementById('done');

document.getElementById('checkout').addEventListener('click', function () {
  const pickup = document.getElementById('pickup').value;
  document.getElementById('order-number').textContent = '№' + Math.floor(100 + Math.random() * 900);
  document.getElementById('order-text').textContent =
    'Будет готов ' + pickup + '. Назови номер на кассе — и забирай без очереди.';
  closeCart();
  cart = {};
  saveCart();
  renderCart();
  setTimeout(function () { doneModal.classList.add('open'); }, 250);
});

document.getElementById('done-close').addEventListener('click', function () {
  doneModal.classList.remove('open');
});

doneModal.addEventListener('click', function (event) {
  if (event.target === doneModal) doneModal.classList.remove('open');
});

// ---------- Вкладки меню ----------
let currentTab = 'coffee';

function renderMenu(tab) {
  currentTab = tab;
  const data = MENU[tab];

  document.querySelectorAll('#menu-tabs button').forEach(function (button) {
    button.classList.toggle('active', button.dataset.tab === tab);
  });

  // Плавная смена фото
  const photo = document.getElementById('menu-photo');
  photo.classList.add('swap');
  setTimeout(function () {
    photo.src = data.photo;
    document.getElementById('menu-note').textContent = data.note;
    photo.classList.remove('swap');
  }, 250);

  const list = document.getElementById('menu-list');
  list.innerHTML = '';
  data.items.forEach(function (item, index) {
    const li = document.createElement('li');
    li.className = 'menu-item';
    li.style.animationDelay = (index * 0.05) + 's';

    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = item.name;
    if (item.tag) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = item.tag;
      title.append(tag);
    }
    const desc = document.createElement('p');
    desc.textContent = item.desc;
    info.append(title, desc);

    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = rub(item.price);

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'add-btn';
    add.textContent = '+';
    add.setAttribute('aria-label', 'Добавить ' + item.name);
    add.addEventListener('click', function () {
      addToCart(item.id, add);
      add.classList.add('added');
      setTimeout(function () { add.classList.remove('added'); }, 500);
    });

    li.append(info, price, add);
    list.append(li);
  });
}

document.querySelectorAll('#menu-tabs button').forEach(function (button) {
  button.addEventListener('click', function () { renderMenu(button.dataset.tab); });
});

// ---------- Квиз «Подобрать кофе» ----------
const QUESTIONS = [
  {
    title: 'Какой кофе ты любишь?',
    key: 'strength',
    options: [['soft', '🌤', 'Мягкий и лёгкий'], ['medium', '☕', 'Сбалансированный'], ['strong', '⚡', 'Крепкий, чтобы проснуться']]
  },
  {
    title: 'С молоком или без?',
    key: 'milk',
    options: [['none', '🖤', 'Без молока'], ['cow', '🥛', 'С обычным молоком'], ['oat', '🌾', 'С растительным']]
  },
  {
    title: 'Сладкое любишь?',
    key: 'sweet',
    options: [['no', '🙅', 'Нет, только вкус кофе'], ['yes', '🍯', 'Да, хочу десерт в чашке']]
  }
];

const quizBody = document.getElementById('quiz-body');
const quizBar = document.getElementById('quiz-bar');
let answers = {};

// Логика подбора напитка по ответам
function pickDrink(a) {
  const milk = a.milk !== 'none';
  if (a.sweet === 'yes') return milk ? 'raf' : 'bumble';
  if (!milk) return { soft: 'filter', medium: 'americano', strong: 'espresso' }[a.strength];
  return { soft: 'latte', medium: 'cappuccino', strong: 'flatwhite' }[a.strength];
}

const WHY = {
  espresso: 'Концентрированный вкус и максимум бодрости за пару глотков.',
  americano: 'Чистый вкус кофе, который можно пить долго и с удовольствием.',
  filter: 'Лёгкий и ароматный — раскрывает ягодные ноты зерна.',
  flatwhite: 'Крепко, но мягко: двойной эспрессо и немного бархатного молока.',
  cappuccino: 'Идеальный баланс кофе и молочной пенки.',
  latte: 'Нежный и молочный — как тёплое одеяло в чашке.',
  raf: 'Сливочный, ванильный и очень уютный. Десерт, который можно пить.',
  bumble: 'Освежающий микс апельсина, карамели и эспрессо.'
};

function renderQuestion(step) {
  quizBar.style.width = (step / QUESTIONS.length * 100) + '%';
  const q = QUESTIONS[step];

  const wrap = document.createElement('div');
  wrap.className = 'quiz-step';
  wrap.innerHTML = '<small>Вопрос ' + (step + 1) + ' из ' + QUESTIONS.length + '</small><h3></h3><div class="options"></div>';
  wrap.querySelector('h3').textContent = q.title;

  q.options.forEach(function (opt) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    const icon = document.createElement('span');
    icon.textContent = opt[1];
    button.append(icon, opt[2]);
    button.addEventListener('click', function () {
      answers[q.key] = opt[0];
      if (step + 1 < QUESTIONS.length) renderQuestion(step + 1);
      else renderResult();
    });
    wrap.querySelector('.options').append(button);
  });

  quizBody.innerHTML = '';
  quizBody.append(wrap);
}

function renderResult() {
  quizBar.style.width = '100%';
  const id = pickDrink(answers);
  const oat = answers.milk === 'oat' && !['espresso', 'americano', 'filter', 'bumble'].includes(id);
  const key = id + (oat ? ':oat' : '');
  const line = cartLine(key);

  quizBody.innerHTML = '';
  const result = document.createElement('div');
  result.className = 'quiz-result';

  const img = document.createElement('img');
  img.src = 'img/hero.jpg';
  img.alt = '';

  const text = document.createElement('div');
  text.innerHTML = '<small class="eyebrow">Твой кофе</small><h3></h3><p></p>';
  text.querySelector('h3').textContent = line.name;
  text.querySelector('p').textContent = WHY[id] + ' ' + rub(line.price) + '.';

  const actions = document.createElement('div');
  actions.className = 'quiz-actions';
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'btn btn-dark';
  add.textContent = 'Добавить в заказ';
  add.addEventListener('click', function () {
    addToCart(key, add);
    add.textContent = 'Добавлено ✓';
  });
  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'btn btn-line';
  again.textContent = 'Пройти ещё раз';
  again.addEventListener('click', function () {
    answers = {};
    renderQuestion(0);
  });
  actions.append(add, again);

  result.append(img, text, actions);
  quizBody.append(result);
}

// ---------- Карта лояльности ----------
const STAMPS = 7;
let stamped = 0;
const stampsBox = document.getElementById('stamps');

function renderStamps() {
  stampsBox.innerHTML = '';
  for (let i = 0; i < STAMPS; i++) {
    const s = document.createElement('button');
    s.type = 'button';
    const gift = i === STAMPS - 1;
    s.className = 'stamp' + (gift ? ' gift' : '') + (i < stamped ? ' on' : '') + (i === stamped ? ' next' : '');
    s.textContent = i < stamped ? (gift ? '🎁' : '☕') : (gift ? '🎁' : '');
    s.setAttribute('aria-label', 'Штамп ' + (i + 1));
    s.disabled = i !== stamped;
    s.addEventListener('click', function () { addStamp(s); });
    stampsBox.append(s);
  }

  document.getElementById('stamp-text').textContent = stamped + ' из ' + STAMPS;
  const hint = document.getElementById('stamp-hint');
  if (stamped === 0) hint.textContent = 'Нажми на первый кружок ☝️';
  else if (stamped < STAMPS - 1) hint.textContent = 'Ещё ' + (STAMPS - 1 - stamped) + ' — и следующий кофе в подарок';
  else if (stamped === STAMPS - 1) hint.textContent = 'Последний штамп — и кофе за наш счёт!';
  else {
    hint.textContent = 'Седьмой кофе — за наш счёт ☕';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'начать заново';
    reset.addEventListener('click', function () { stamped = 0; renderStamps(); });
    hint.append(reset);
  }
}

function addStamp(el) {
  stamped++;
  renderStamps();
  if (stamped === STAMPS) beanBurst(el);
}

// Взрыв кофейных зёрен
function beanBurst(el) {
  const rect = el.getBoundingClientRect();
  for (let i = 0; i < 26; i++) {
    const bean = document.createElement('div');
    bean.className = 'bean';
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 160;
    bean.style.left = rect.left + rect.width / 2 + 'px';
    bean.style.top = rect.top + rect.height / 2 + 'px';
    bean.style.setProperty('--x', Math.cos(angle) * dist + 'px');
    bean.style.setProperty('--y', Math.sin(angle) * dist - 40 + 'px');
    bean.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    document.body.append(bean);
    setTimeout(function () { bean.remove(); }, 1200);
  }
  showToast('🎁 Седьмой кофе — в подарок!');
}

// ---------- Часы работы и статус «Открыто» ----------
const HOURS = [
  [9, 22], // вс
  [8, 22], [8, 22], [8, 22], [8, 22], [8, 23], // пн–пт
  [9, 23]  // сб
];
const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function renderHours() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  const open = hour >= HOURS[day][0] && hour < HOURS[day][1];

  // Пилюля в шапке
  const status = document.getElementById('status');
  status.classList.toggle('closed', !open);
  const label = status.querySelector('span');
  label.textContent = open ? 'Открыто' : 'Закрыто';
  if (open) {
    const time = document.createElement('span');
    time.className = 'status-time';
    time.textContent = ' до ' + HOURS[day][1] + ':00';
    label.append(time);
  }

  // Блок в контактах
  const box = document.getElementById('hours-status');
  box.classList.toggle('closed', !open);
  if (open) {
    box.innerHTML = '<b>Открыто сейчас</b> — ждём до ' + HOURS[day][1] + ':00';
  } else {
    const next = hour < HOURS[day][0] ? day : (day + 1) % 7;
    box.innerHTML = '<b>Сейчас закрыто</b> — откроемся ' + (next === day ? 'сегодня' : 'завтра') + ' в ' + HOURS[next][0] + ':00';
  }

  const list = document.getElementById('hours-list');
  list.innerHTML = '';
  [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
    const li = document.createElement('li');
    if (d === day) li.className = 'today';
    li.innerHTML = '<span>' + DAY_NAMES[d] + '</span><span>' + HOURS[d][0] + ':00 – ' + HOURS[d][1] + ':00</span>';
    list.append(li);
  });
}

// ---------- Мобильное меню ----------
function closeMenu() {
  document.body.classList.remove('menu-open');
}

document.getElementById('burger').addEventListener('click', function () {
  document.body.classList.toggle('menu-open');
});

document.querySelectorAll('.nav a').forEach(function (link) {
  link.addEventListener('click', closeMenu);
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    closeMenu();
    closeCart();
    doneModal.classList.remove('open');
  }
});

// ---------- Шапка и параллакс при прокрутке ----------
const header = document.querySelector('.header');
const parallax = document.querySelectorAll('.parallax');

window.addEventListener('scroll', function () {
  header.classList.toggle('scrolled', window.scrollY > 10);
  parallax.forEach(function (img) {
    img.style.transform = 'translateY(' + (-window.scrollY * Number(img.dataset.speed)) + 'px)';
  });
}, { passive: true });

// ---------- Появление блоков ----------
const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const siblings = Array.from(el.parentElement.children).filter(function (c) {
      return c.classList.contains('reveal');
    });
    el.style.transitionDelay = Math.max(0, siblings.indexOf(el)) * 0.08 + 's';
    el.classList.add('visible');
    observer.unobserve(el);
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });

// ---------- Старт ----------
renderMenu('coffee');
renderQuestion(0);
renderStamps();
renderHours();
renderCart();
setInterval(renderHours, 60000); // статус обновляется сам каждую минуту
