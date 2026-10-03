const API_URL = 'https://jsonplaceholder.typicode.com/posts?_limit=6';

const localProducts = [
  { id: 1, name: 'Sopa de la abuela', description: 'Caldo reconfortante con verduras, hierbas frescas y sabor casero.', category: 'Sopas', price: 89, image: './images/products/soup.webp' },
  { id: 2, name: 'Pollo de corral', description: 'Pollo tierno preparado con especias, guarnición y mucho cariño.', category: 'Platos fuertes', price: 149, image: './images/products/chicken.webp' },
  { id: 3, name: 'Caldo campesino', description: 'Una receta abundante, cálida y perfecta para cualquier momento.', category: 'Sopas', price: 95, image: './images/products/soup.webp' },
  { id: 4, name: 'Pollo al romero', description: 'Marinado con romero y cítricos para lograr un sabor inolvidable.', category: 'Platos fuertes', price: 159, image: './images/products/chicken.webp' },
  { id: 5, name: 'Sopa del huerto', description: 'Verduras seleccionadas en un caldo ligero con hierbas aromáticas.', category: 'Sopas', price: 92, image: './images/products/soup.webp' },
  { id: 6, name: 'Pollo tradicional', description: 'El clásico de la casa, dorado por fuera y jugoso por dentro.', category: 'Platos fuertes', price: 155, image: './images/products/chicken.webp' }
];

const state = {
  products: localProducts,
  category: 'Todos',
  query: '',
  cart: JSON.parse(localStorage.getItem('pocketstore-cart') || '[]')
};

const grid = document.querySelector('#product-grid');
const filters = document.querySelector('#filters');
const search = document.querySelector('#search');
const emptyState = document.querySelector('#empty-state');
const connectionStatus = document.querySelector('#connection-status');
const cartPanel = document.querySelector('#cart-panel');
const backdrop = document.querySelector('#backdrop');
const cartItems = document.querySelector('#cart-items');

function normalizeApiProducts(posts) {
  return localProducts.map((product, index) => {
    const post = posts[index];
    if (!post) return product;
    const shortDescription = post.body.replace(/\n/g, ' ').split(' ').slice(0, 13).join(' ');
    return { ...product, description: `${shortDescription}.` };
  });
}

async function loadProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.products = normalizeApiProducts(await response.json());
  } catch (error) {
    console.info('Sin acceso a la API; se usa el catálogo local.', error.message);
    state.products = localProducts;
  } finally {
    renderFilters();
    renderProducts();
  }
}

function renderFilters() {
  const categories = ['Todos', ...new Set(state.products.map((product) => product.category))];
  filters.innerHTML = categories.map((category) => `
    <button class="filter-button ${state.category === category ? 'active' : ''}" type="button" data-category="${category}" aria-pressed="${state.category === category}">${category}</button>
  `).join('');
}

function visibleProducts() {
  const term = state.query.toLocaleLowerCase('es');
  return state.products.filter((product) => {
    const matchesCategory = state.category === 'Todos' || product.category === state.category;
    const matchesQuery = `${product.name} ${product.description}`.toLocaleLowerCase('es').includes(term);
    return matchesCategory && matchesQuery;
  });
}

function renderProducts() {
  const products = visibleProducts();
  grid.setAttribute('aria-busy', 'false');
  emptyState.hidden = products.length > 0;
  grid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-card__image">
        <span class="category-tag">${product.category}</span>
        <img src="${product.image}" alt="${product.name}" width="512" height="512" loading="lazy" />
      </div>
      <div class="product-card__body">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-card__footer">
          <span class="price">${money(product.price)}</span>
          <button class="add-button" type="button" data-add="${product.id}" aria-label="Agregar ${product.name} al carrito">+</button>
        </div>
      </div>
    </article>
  `).join('');
}

function money(value) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

function addToCart(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  const existing = state.cart.find((item) => item.id === id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ ...product, quantity: 1 });
  saveCart();
  showToast(`${product.name} se agregó al carrito`);
}

function removeFromCart(id) {
  state.cart = state.cart.filter((item) => item.id !== id);
  saveCart();
}

function saveCart() {
  localStorage.setItem('pocketstore-cart', JSON.stringify(state.cart));
  renderCart();
}

function renderCart() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#cart-total').textContent = money(total);
  cartItems.innerHTML = state.cart.length ? state.cart.map((item) => `
    <article class="cart-item">
      <img src="${item.image}" alt="" />
      <div><h3>${item.name}</h3><span>${item.quantity} × ${money(item.price)}</span></div>
      <button class="remove-button" type="button" data-remove="${item.id}" aria-label="Quitar ${item.name}">Quitar</button>
    </article>
  `).join('') : '<p class="cart-empty">Tu carrito está vacío.<br />Agrega algo delicioso.</p>';
}

function toggleCart(open) {
  cartPanel.classList.toggle('open', open);
  cartPanel.setAttribute('aria-hidden', String(!open));
  backdrop.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
}

function updateConnectionStatus() {
  const online = navigator.onLine;
  connectionStatus.className = `connection-pill ${online ? 'online' : 'offline'}`;
  connectionStatus.querySelector('span:last-child').textContent = online ? 'En línea · catálogo actualizado' : 'Modo offline · catálogo guardado';
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

filters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderFilters();
  renderProducts();
});
search.addEventListener('input', () => { state.query = search.value.trim(); renderProducts(); });
grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (button) addToCart(Number(button.dataset.add));
});
cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (button) removeFromCart(Number(button.dataset.remove));
});
document.querySelector('#cart-button').addEventListener('click', () => toggleCart(true));
document.querySelector('#close-cart').addEventListener('click', () => toggleCart(false));
backdrop.addEventListener('click', () => toggleCart(false));
document.querySelector('#checkout').addEventListener('click', () => showToast(state.cart.length ? '¡Pedido listo para preparar!' : 'Primero agrega un producto'));
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((error) => console.error('No fue posible registrar el Service Worker:', error)));
}

document.querySelector('#year').textContent = new Date().getFullYear();
updateConnectionStatus();
renderCart();
loadProducts();
