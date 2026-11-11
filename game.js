(() => {
  'use strict';
  const SAVE_KEY = 'pawfect-day-save-v1';
  const products = [
    { id: 'toy', name: 'Squeaky toy', emoji: '🧸', category: 'toys', description: 'A squeak here, a zoomie there.', baseCost: 15, rate: 0.2 },
    { id: 'treatJar', name: 'Treat jar', emoji: '🍯', category: 'care', description: 'A little snack stash, always nearby.', baseCost: 60, rate: 1 },
    { id: 'pupPal', name: 'Pup pal', emoji: '🐕', category: 'toys', description: 'Best friends make playtime better.', baseCost: 250, rate: 4 },
    { id: 'cozyBed', name: 'Cloud-soft bed', emoji: '🛏️', category: 'care', description: 'Dreamy naps mean happy tail wags.', baseCost: 1100, rate: 12 },
    { id: 'agility', name: 'Zoomie course', emoji: '🏅', category: 'toys', description: 'A whole course for extra bouncy paws.', baseCost: 5200, rate: 42 },
    { id: 'spa', name: 'Pawdicure spa', emoji: '🫧', category: 'care', description: 'So fresh, so fluffy, so fancy.', baseCost: 26000, rate: 160 }
  ];
  const today = () => new Date().toISOString().slice(0, 10);
  const freshState = () => ({ treats: 0, totalEarned: 0, pets: 0, xp: 0, level: 1, owned: {}, lastSeen: Date.now(), lastDay: today(), streak: 1, goalDay: today(), goalPets: 0, goalClaimed: false, sound: true, name: 'Biscuit' });
  let state;
  try { state = { ...freshState(), ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch { state = freshState(); }
  state.owned ||= {};
  let toastTimer;
  let filter = 'all';
  let audioContext;

  const $ = (id) => document.getElementById(id);
  const compact = (value) => {
    if (value < 1000) return Math.floor(value).toLocaleString();
    const units = [['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]];
    for (const [unit, size] of units) if (value >= size) return (value / size).toFixed(value < size * 10 ? 1 : 0).replace(/\.0$/, '') + unit;
    return String(Math.floor(value));
  };
  const costOf = (product) => Math.floor(product.baseCost * Math.pow(1.16, state.owned[product.id] || 0));
  const rate = () => products.reduce((sum, product) => sum + product.rate * (state.owned[product.id] || 0), 0);
  const tapValue = () => 1 + Math.floor((state.level - 1) / 2) + Math.floor(rate() / 12);
  const addTreats = (amount, countAsEarned = true) => {
    if (!(amount > 0) || !Number.isFinite(amount)) return;
    state.treats += amount;
    if (countAsEarned) state.totalEarned += amount;
  };
  function save() {
    state.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* Continue without persistent storage. */ }
  }
  function addXP(amount) {
    state.xp += amount;
    while (state.xp >= state.level * 100) {
      state.xp -= state.level * 100;
      state.level++;
      showToast(`Biscuit reached level ${state.level}! ⭐`);
    }
  }
  function playSound(freq = 610) {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(freq * 1.32, audioContext.currentTime + 0.08);
      gain.gain.setValueAtTime(0.055, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.13);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + 0.14);
    } catch { /* Audio is an optional treat. */ }
  }
  function showToast(message) {
    const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
  }
  function clickPup(event) {
    const earned = tapValue(); addTreats(earned); state.pets++; state.goalPets++; addXP(1);
    const button = $('pup-button'); button.classList.remove('wag'); void button.offsetWidth; button.classList.add('wag');
    const stage = document.querySelector('.pup-stage'); const rect = stage.getBoundingClientRect();
    const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
    const float = document.createElement('span'); float.className = 'float-text'; float.textContent = `+${compact(earned)} 🍪`;
    float.style.left = `${Math.max(20, Math.min(rect.width - 85, x - 12))}px`; float.style.top = `${Math.max(35, y - 10)}px`;
    stage.appendChild(float); setTimeout(() => float.remove(), 850);
    playSound(570 + Math.random() * 150); render(); save();
  }
  function buy(product) {
    const price = costOf(product);
    if (state.treats + 1e-8 < price) { showToast('A few more treats and it’s yours! 🍪'); return; }
    state.treats -= price; state.owned[product.id] = (state.owned[product.id] || 0) + 1;
    addXP(Math.max(2, Math.ceil(product.rate))); playSound(740);
    showToast(`${product.name} added to Biscuit’s goodies!`); render(); save();
  }
  function productCard(product, quick = false) {
    const owned = state.owned[product.id] || 0; const price = costOf(product);
    if (quick) return `<article class="quick-card"><span class="quick-emoji">${product.emoji}</span><div class="quick-info"><b>${product.name}</b><small>+${product.rate} / sec</small></div><button class="quick-buy" data-buy="${product.id}" ${state.treats < price ? 'disabled' : ''}>🍪 ${compact(price)}</button></article>`;
    return `<article class="shop-item"><span class="shop-item-icon">${product.emoji}</span><div class="shop-item-copy"><h3>${product.name}</h3><p>${product.description}</p><span class="owned">Owned: ${owned} · +${product.rate} treats/sec each</span></div><button class="buy-button" data-buy="${product.id}" ${state.treats < price ? 'disabled' : ''}>🍪 ${compact(price)}<span>BUY GOODIE</span></button></article>`;
  }
  function render() {
    const currentRate = rate();
    $('treat-count').textContent = compact(state.treats);
    $('rate-count').textContent = compact(currentRate);
    $('level-count').textContent = state.level;
    $('streak-count').textContent = state.streak || 1;
    document.querySelectorAll('.pup-name').forEach(el => { el.textContent = state.name || 'Biscuit'; });
    document.querySelector('.stage-name strong').textContent = state.name || 'Biscuit';
    const needed = state.level * 100;
    $('xp-label').textContent = `${Math.floor(state.xp)} / ${needed} XP`;
    $('xp-progress').style.width = `${Math.min(100, state.xp / needed * 100)}%`;
    $('goal-title').textContent = `Give ${state.name || 'Biscuit'} 25 pets`;
    $('goal-progress').textContent = `${Math.min(25, state.goalPets)} / 25 pets`;
    const claim = $('claim-button');
    claim.hidden = state.goalPets < 25 || state.goalClaimed;
    $('goal-title').classList.toggle('goal-done', state.goalClaimed);
    $('quick-upgrades').innerHTML = products.slice(0, 2).map(product => productCard(product, true)).join('');
    $('shop-treat-count').textContent = compact(state.treats);
    $('shop-rate').textContent = `+${compact(currentRate)} / sec`;
    $('shop-list').innerHTML = products.filter(product => filter === 'all' || product.category === filter).map(product => productCard(product)).join('');
    $('stat-pets').textContent = compact(state.pets);
    $('stat-earned').textContent = compact(state.totalEarned);
    $('stat-goodies').textContent = compact(Object.values(state.owned).reduce((a, b) => a + b, 0));
    $('stat-level').textContent = state.level;
    const milestone = Math.min(100, state.pets);
    $('milestone-progress').style.width = `${milestone}%`;
    $('milestone-description').textContent = state.pets >= 100 ? 'You earned the Pet Pal badge. Biscuit is so proud!' : `Give Biscuit ${100 - state.pets} more pets to earn the Pet Pal badge.`;
    $('sound-toggle').classList.toggle('muted', !state.sound);
    $('sound-toggle').setAttribute('aria-label', state.sound ? 'Turn sound off' : 'Turn sound on');
    $('shop-dot').hidden = !products.some(product => state.treats >= costOf(product));
  }
  function changeView(name) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `${name}-view`));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => changeView(button.dataset.view)));
  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.nav)));
  $('pup-button').addEventListener('click', clickPup);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-buy]');
    if (button) { const product = products.find(item => item.id === button.dataset.buy); if (product) buy(product); }
  });
  document.querySelectorAll('.shop-tab').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('.shop-tab').forEach(tab => tab.classList.toggle('selected', tab === button));
    render();
  }));
  $('claim-button').addEventListener('click', () => {
    if (state.goalPets >= 25 && !state.goalClaimed) { state.goalClaimed = true; addTreats(50); addXP(10); playSound(880); showToast('Little goal complete! +50 treats 🎉'); render(); save(); }
  });
  $('sound-toggle').addEventListener('click', () => { state.sound = !state.sound; if (state.sound) playSound(660); render(); save(); showToast(state.sound ? 'Sound on ♫' : 'Sound off'); });
  $('profile-button').addEventListener('click', () => showToast(`${state.name || 'Biscuit'} sends you a happy tail wag! 🐾`));
  $('reset-button').addEventListener('click', () => {
    const modal = document.createElement('div'); modal.className = 'reset-modal'; modal.innerHTML = '<div class="modal-card"><div style="font-size:34px">🐾</div><h2>Start a new adventure?</h2><p>This will reset your treats, goodies, and pup progress on this device.</p><div class="modal-actions"><button class="modal-cancel">Keep playing</button><button class="modal-confirm">Start fresh</button></div></div>';
    document.body.appendChild(modal); modal.querySelector('.modal-cancel').onclick = () => modal.remove();
    modal.querySelector('.modal-confirm').onclick = () => { state = freshState(); save(); render(); modal.remove(); changeView('home'); showToast('A fresh start with your best bud! 🐶'); };
    modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
  });

  // Daily goal and gentle return bonus.
  if (state.goalDay !== today()) { state.goalDay = today(); state.goalPets = 0; state.goalClaimed = false; }
  if (state.lastDay !== today()) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streak = state.lastDay === yesterday ? (state.streak || 1) + 1 : 1;
    state.lastDay = today();
  }
  const awaySeconds = Math.max(0, Math.min(8 * 60 * 60, (Date.now() - (state.lastSeen || Date.now())) / 1000));
  if (awaySeconds > 60 && rate() > 0) {
    const bonus = Math.floor(rate() * awaySeconds);
    if (bonus > 0) { addTreats(bonus); setTimeout(() => showToast(`Welcome back! Biscuit found ${compact(bonus)} treats while you were away 🐾`), 450); }
  }
  render(); save();
  setInterval(() => { if (rate() > 0) { addTreats(rate()); render(); } save(); }, 1000);
})();
