(() => {
  'use strict';
  const SAVE_KEY = 'pawfect-day-save-v2';
  const products = [
    { id: 'toy', name: 'Squeaky star', emoji: '🧸', category: 'play', description: 'A cheerful squeak for supervised play.', baseCost: 15, rate: .2 },
    { id: 'clicker', name: 'Gentle water clicker', emoji: '💧', category: 'play', description: 'A soft click cue for positive, reward-based practice. Keep water breaks handy.', baseCost: 45, rate: .35 },
    { id: 'treatJar', name: 'Treat jar', emoji: '🍯', category: 'care', description: 'A little snack stash, always nearby.', baseCost: 90, rate: 1 },
    { id: 'pupPal', name: 'Playmate plush', emoji: '🧸', category: 'play', description: 'A cuddly friend for imaginative adventures.', baseCost: 250, rate: 3 },
    { id: 'waterBottle', name: 'Cute water bottle', emoji: '🧃', category: 'care', description: 'Easy sips between every round of play.', baseCost: 480, rate: 5 },
    { id: 'cozyBed', name: 'Open-door den nook', emoji: '🏠', category: 'cozy', description: 'A soft, open den to rest in or leave whenever you like.', baseCost: 900, rate: 9 },
    { id: 'harness', name: 'Comfy adventure harness', emoji: '🎀', category: 'play', description: 'A soft accessory for pretend play and neighborhood strolls.', baseCost: 1900, rate: 18 },
    { id: 'agility', name: 'Cushion obstacle course', emoji: '🎾', category: 'play', description: 'Low, soft obstacles for a bouncy indoor course.', baseCost: 4200, rate: 38 },
    { id: 'puzzle', name: 'Treat puzzle mat', emoji: '🧩', category: 'care', description: 'A slow, sniffy puzzle for curious paws.', baseCost: 8500, rate: 75 },
    { id: 'spa', name: 'Fluff & brush kit', emoji: '🫧', category: 'care', description: 'A gentle brush, only if Pip is in the mood.', baseCost: 18000, rate: 150 },
    { id: 'blankets', name: 'Den blanket bundle', emoji: '🛏️', category: 'cozy', description: 'Extra-soft blankets for naps and quiet time.', baseCost: 42000, rate: 330 }
  ];
  const activities = [
    { id: 'fetch', name: 'Soft-ball fetch', emoji: '🎾', desc: 'A few gentle throws across the playroom.', cost: 3, reward: 16, bond: 5, xp: 8, label: 'Play together' },
    { id: 'clicker', name: 'Clicker practice', emoji: '💧', desc: 'Practice a fun trick with praise and treat rewards.', cost: 2, reward: 11, bond: 7, xp: 10, label: 'Practice kindly' },
    { id: 'puzzle', name: 'Snuffle & seek', emoji: '🧩', desc: 'Hide a treat in a puzzle mat and sniff it out.', cost: 2, reward: 13, bond: 5, xp: 8, label: 'Start sniffing' },
    { id: 'brush', name: 'Brush & accessorize', emoji: '🪮', desc: 'A gentle grooming break, only with a happy yes.', cost: 1, reward: 8, bond: 4, xp: 7, label: 'Get cozy' },
    { id: 'water', name: 'Water break', emoji: '🥤', desc: 'Pause play for a refreshing drink and a breather.', cost: 0, reward: 2, bond: 2, xp: 3, label: 'Take a break', restore: 3 }
  ];
  const today = () => new Date().toISOString().slice(0, 10);
  const freshState = () => ({ treats: 0, totalEarned: 0, pets: 0, xp: 0, level: 1, owned: {}, energy: 10, bond: 0, activities: 0, lastSeen: Date.now(), lastDay: today(), streak: 1, goalDay: today(), goalActivities: 0, goalClaimed: false, sound: true, name: 'Pip' });
  let state;
  try { state = { ...freshState(), ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch { state = freshState(); }
  state.owned ||= {};
  state.energy = Math.max(0, Math.min(10, Number(state.energy) || 0));
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
      showToast(`${state.name || 'Pip'} reached level ${state.level}! ⭐`);
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
      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.13);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + 0.14);
    } catch { /* Audio is optional. */ }
  }
  function showToast(message) {
    const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
  }
  function clickPup(event) {
    const earned = tapValue(); addTreats(earned); state.pets++; state.bond++; addXP(1);
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
    addXP(Math.max(2, Math.ceil(product.rate / 2))); playSound(740);
    showToast(`${product.name} added to the playroom!`); render(); save();
  }
  function productCard(product, quick = false) {
    const owned = state.owned[product.id] || 0; const price = costOf(product);
    if (quick) return `<article class="quick-card"><span class="quick-emoji">${product.emoji}</span><div class="quick-info"><b>${product.name}</b><small>+${product.rate} treats / sec</small></div><button class="quick-buy" data-buy="${product.id}" ${state.treats < price ? 'disabled' : ''}>🍪 ${compact(price)}</button></article>`;
    return `<article class="shop-item"><span class="shop-item-icon">${product.emoji}</span><div class="shop-item-copy"><h3>${product.name}</h3><p>${product.description}</p><span class="owned">Owned: ${owned} · +${product.rate} treats/sec each</span></div><button class="buy-button" data-buy="${product.id}" ${state.treats < price ? 'disabled' : ''}>🍪 ${compact(price)}<span>ADD TO NOOK</span></button></article>`;
  }
  function activityCard(item) {
    const affordable = state.energy >= item.cost;
    const bonus = item.id === 'clicker' && state.owned.clicker ? ' · clicker bonus!' : '';
    return `<article class="activity-card"><span class="activity-emoji">${item.emoji}</span><h3>${item.name}</h3><p>${item.desc}</p><span class="activity-reward">${item.restore ? `+${item.restore} energy` : `${item.cost} energy · +${item.reward}${bonus} 🍪 · +${item.bond} bond`}</span><button class="activity-button" data-activity="${item.id}" ${!affordable ? 'disabled' : ''}>${affordable ? item.label : 'Rest to recharge'}</button></article>`;
  }
  function doActivity(id) {
    const item = activities.find(activity => activity.id === id);
    if (!item) return;
    if (item.restore) {
      const restored = Math.min(item.restore, 10 - state.energy);
      if (!restored) { showToast('Energy is already full — take a cozy pause instead!'); return; }
      state.energy += restored; state.bond += item.bond; addTreats(item.reward); addXP(item.xp);
      showToast(`Water break! +${restored} energy and a little treat 🥤`);
    } else {
      if (state.energy < item.cost) { showToast('Pip needs a breather first. Try a water break or the cozy den.'); return; }
      state.energy -= item.cost;
      let reward = item.reward;
      if (id === 'clicker' && state.owned.clicker) reward += state.owned.clicker * 5;
      if (id === 'puzzle' && state.owned.puzzle) reward += state.owned.puzzle * 4;
      addTreats(reward); state.bond += item.bond; state.activities++; state.goalActivities++;
      addXP(item.xp); playSound(id === 'clicker' ? 800 : 620);
      showToast(`${item.name} was a success! +${reward} treats and +${item.bond} bond ✨`);
    }
    render(); save();
  }
  function restInDen() {
    const restored = Math.min(3, 10 - state.energy);
    if (!restored) { showToast('Pip is already fully recharged!'); return; }
    state.energy += restored; state.bond += 1; addXP(2); playSound(510);
    showToast(`A peaceful den break. +${restored} energy 💤`); render(); save();
  }
  function render() {
    const currentRate = rate();
    $('treat-count').textContent = compact(state.treats); $('rate-count').textContent = compact(currentRate);
    $('energy-count').textContent = state.energy; $('activity-energy').textContent = state.energy;
    $('bond-count').textContent = compact(state.bond); $('activity-bond').textContent = compact(state.bond);
    $('level-count').textContent = state.level; $('streak-count').textContent = state.streak || 1;
    document.querySelectorAll('.pup-name').forEach(el => { el.textContent = state.name || 'Pip'; });
    document.querySelector('.stage-pup-name').textContent = state.name || 'Pip';
    $('mood-label').textContent = state.energy >= 7 ? 'eager' : state.energy >= 3 ? 'content' : 'ready for a rest';
    const needed = state.level * 100;
    $('xp-label').textContent = `${Math.floor(state.xp)} / ${needed} XP`;
    $('xp-progress').style.width = `${Math.min(100, state.xp / needed * 100)}%`;
    $('goal-title').textContent = `Share 3 activities with ${state.name || 'Pip'}`;
    $('goal-progress').textContent = `${Math.min(3, state.goalActivities)} / 3 activities`;
    const claim = $('claim-button'); claim.hidden = state.goalActivities < 3 || state.goalClaimed;
    $('goal-title').classList.toggle('goal-done', state.goalClaimed);
    $('quick-upgrades').innerHTML = products.slice(0, 2).map(product => productCard(product, true)).join('');
    $('shop-treat-count').textContent = compact(state.treats); $('shop-rate').textContent = `+${compact(currentRate)} / sec`;
    $('shop-list').innerHTML = products.filter(product => filter === 'all' || product.category === filter).map(product => productCard(product)).join('');
    $('activity-list').innerHTML = activities.map(activityCard).join('');
    $('den-description').textContent = state.owned.cozyBed ? 'Your open-door den is extra soft and always available as a calm, optional nook.' : 'A calm, open-door nook for a breather. Never locked; Pip can come and go.';
    $('stat-pets').textContent = compact(state.pets); $('stat-earned').textContent = compact(state.totalEarned);
    $('stat-goodies').textContent = compact(Object.values(state.owned).reduce((a, b) => a + b, 0)); $('stat-level').textContent = state.level;
    $('milestone-progress').style.width = `${Math.min(100, state.pets)}%`;
    $('milestone-description').textContent = state.pets >= 100 ? 'Badge earned! Pip is so proud of your friendly pats.' : `Give Pip ${100 - state.pets} more friendly pats to earn this badge.`;
    $('milestone-state').textContent = state.pets >= 100 ? 'Earned!' : `${Math.min(100, state.pets)}%`;
    $('activity-milestone-progress').style.width = `${Math.min(100, state.activities * 10)}%`;
    $('activity-milestone-description').textContent = state.activities >= 10 ? 'Badge earned! What a lovely playroom team.' : `Complete ${10 - state.activities} more shared activities.`;
    $('activity-milestone-state').textContent = `${Math.min(10, state.activities)}/10`;
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
    const buyButton = event.target.closest('[data-buy]');
    if (buyButton) { const product = products.find(item => item.id === buyButton.dataset.buy); if (product) buy(product); return; }
    const activityButton = event.target.closest('[data-activity]');
    if (activityButton) doActivity(activityButton.dataset.activity);
  });
  document.querySelectorAll('.shop-tab').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('.shop-tab').forEach(tab => { const selected = tab === button; tab.classList.toggle('selected', selected); tab.setAttribute('aria-selected', selected); });
    render();
  }));
  $('claim-button').addEventListener('click', () => {
    if (state.goalActivities >= 3 && !state.goalClaimed) { state.goalClaimed = true; addTreats(50); addXP(10); playSound(880); showToast('Little goal complete! +50 treats 🎉'); render(); save(); }
  });
  $('den-button').addEventListener('click', restInDen);
  $('sound-toggle').addEventListener('click', () => { state.sound = !state.sound; if (state.sound) playSound(660); render(); save(); showToast(state.sound ? 'Sound on ♫' : 'Sound off'); });
  $('profile-button').addEventListener('click', () => showToast(`${state.name || 'Pip'} gives you a happy tail wag! 🐾`));
  $('reset-button').addEventListener('click', () => {
    const modal = document.createElement('div'); modal.className = 'reset-modal'; modal.innerHTML = '<div class="modal-card"><div style="font-size:34px">🐾</div><h2>Start a new adventure?</h2><p>This resets treats, supplies, energy, and Pip’s progress on this device.</p><div class="modal-actions"><button class="modal-cancel">Keep playing</button><button class="modal-confirm">Start fresh</button></div></div>';
    document.body.appendChild(modal); modal.querySelector('.modal-cancel').onclick = () => modal.remove();
    modal.querySelector('.modal-confirm').onclick = () => { state = freshState(); save(); render(); modal.remove(); changeView('home'); showToast('A fresh day with your best pal! 🐾'); };
    modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
  });

  if (state.goalDay !== today()) { state.goalDay = today(); state.goalActivities = 0; state.goalClaimed = false; }
  if (state.lastDay !== today()) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streak = state.lastDay === yesterday ? (state.streak || 1) + 1 : 1;
    state.lastDay = today();
  }
  const awaySeconds = Math.max(0, Math.min(8 * 60 * 60, (Date.now() - (state.lastSeen || Date.now())) / 1000));
  if (awaySeconds > 60 && rate() > 0) {
    const bonus = Math.floor(rate() * awaySeconds);
    if (bonus > 0) { addTreats(bonus); setTimeout(() => showToast(`Welcome back! Pip found ${compact(bonus)} treats while you were away 🐾`), 450); }
  }
  render(); save();
  setInterval(() => { if (rate() > 0) { addTreats(rate()); render(); } save(); }, 1000);
})();
