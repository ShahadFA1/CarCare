(() => {
  'use strict';

  /* ===== T0.1 Shared data layer (Shahad Alhusayni): one place for all shared data; falls back to memory if the browser blocks storage ===== */
  const Store = (() => {
    const memory = {};
    let persistent = true;
    try { localStorage.setItem('cc_probe', '1'); localStorage.removeItem('cc_probe'); } catch (e) { persistent = false; }
    const read = (key) => {
      try {
        const raw = persistent ? localStorage.getItem(key) : memory[key];
        return raw == null ? null : JSON.parse(raw);
      } catch (e) { return null; }
    };
    const write = (key, value) => {
      const raw = JSON.stringify(value);
      if (persistent) { try { localStorage.setItem(key, raw); return; } catch (e) { persistent = false; } }
      memory[key] = raw;
    };
    const remove = (key) => {
      try { if (persistent) localStorage.removeItem(key); } catch (e) { /* ignore */ }
      delete memory[key];
    };
    return {
      get: (key) => { const v = read(key); return Array.isArray(v) ? v : []; },
      val: (key, fallback) => { const v = read(key); return v == null ? fallback : v; },
      set: write,
      remove
    };
  })();

  /* ===== Reference data ===== */
  const SERVICES = [
    { id: 'oil', label: 'Oil change', price: 150 },
    { id: 'brakes', label: 'Brakes', price: 280 },
    { id: 'battery', label: 'Battery', price: 350 },
    { id: 'engine', label: 'Engine light', price: 200 },
    { id: 'ac', label: 'A/C', price: 220 },
    { id: 'tires', label: 'Tires', price: 180 },
    { id: 'inspection', label: 'Inspection', price: 120 },
    { id: 'other', label: 'Something else', price: 100 }
  ];
  const SERVICE = Object.fromEntries(SERVICES.map((s) => [s.id, s]));
  const LEVELS = { 1: { label: 'Budget', factor: 0.85 }, 2: { label: 'Mid-range', factor: 1 }, 3: { label: 'Premium', factor: 1.3 } };
  const VAT_RATE = 0.15;
  const HOME = { lat: 24.8247, lng: 46.642, label: 'Al-Yasmin, Riyadh' };
  const SLOT_TIMES = ['09:00', '10:30', '12:00', '13:30', '16:00', '17:30', '19:00'];
  const MAKES = ['Toyota', 'Hyundai', 'Nissan', 'Kia', 'Chevrolet', 'Ford', 'Lexus', 'Honda', 'GMC', 'Mazda', 'Mitsubishi', 'Mercedes-Benz', 'BMW', 'Changan', 'MG', 'Geely'];
  const DEMO_CENTERS = [
    { id: 'c1', name: 'Al-Malqa Auto Care', district: 'Al-Malqa', rating: 4.7, priceLevel: 2, services: ['oil', 'brakes', 'battery', 'engine', 'ac', 'tires', 'inspection'], lat: 24.8085, lng: 46.6135 },
    { id: 'c2', name: 'Rawdah Quick Lube', district: 'Al-Rawdah', rating: 4.3, priceLevel: 1, services: ['oil', 'battery', 'tires', 'inspection'], lat: 24.7352, lng: 46.7698 },
    { id: 'c3', name: 'Hittin Car Clinic', district: 'Hittin', rating: 4.8, priceLevel: 3, services: ['oil', 'brakes', 'battery', 'engine', 'ac', 'tires', 'inspection'], lat: 24.7691, lng: 46.6003 },
    { id: 'c4', name: 'Al-Nakheel Service Center', district: 'Al-Nakheel', rating: 4.1, priceLevel: 2, services: ['oil', 'brakes', 'engine', 'ac', 'inspection'], lat: 24.7457, lng: 46.6452 },
    { id: 'c5', name: 'Yasmin Tire & Battery', district: 'Al-Yasmin', rating: 4.4, priceLevel: 1, services: ['battery', 'tires', 'inspection'], lat: 24.8195, lng: 46.6625 },
    { id: 'c6', name: 'Al-Sahafa Auto Electric', district: 'Al-Sahafa', rating: 3.9, priceLevel: 1, services: ['battery', 'engine', 'ac'], lat: 24.8031, lng: 46.6327 },
    { id: 'c7', name: 'Narjis Premium Garage', district: 'Al-Narjis', rating: 4.6, priceLevel: 3, services: ['oil', 'brakes', 'engine', 'ac', 'tires', 'inspection'], lat: 24.8571, lng: 46.6745 }
  ];

  /* ===== Helpers ===== */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const view = () => $('#view');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDay = (s) => { const d = parseISO(s); return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`; };
  const fmtDayLong = (s) => { const d = parseISO(s); return `${d.toLocaleDateString('en-GB', { weekday: 'long' })} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'long' })}`; };
  const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`; };
  const round2 = (x) => Math.round(x * 100) / 100;
  const fmtSAR = (n) => `SAR ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const nowKey = () => { const n = new Date(); return `${isoDate(n)} ${pad(n.getHours())}:${pad(n.getMinutes())}`; };
  const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const kmBetween = (a, b) => {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const carName = (c) => [c.make, c.model, c.year].filter(Boolean).join(' ') || 'My car';
  const plateHTML = (p) => (p ? `<span class="plate"><b>${esc(p)}</b><i>KSA</i></span>` : '');

  const getCenters = () => Store.get('centers');
  const centerById = (id) => getCenters().find((c) => c.id === id) || null;
  const getSlots = () => Store.get('slots');
  const getBookings = () => Store.get('bookings');
  const getInvoices = () => Store.get('invoices');

  /* ===== T2 Shared data layer for Sprint 2 (Shahad Alhusayni): accounts, reminders, expenses, reviews, notifications ===== */
  const sha256 = (input) => {
    let ascii = unescape(encodeURIComponent(String(input)));
    const rr = (v, k) => (v >>> k) | (v << (32 - k));
    const maxWord = 2 ** 32, bitLen = ascii.length * 8, words = [], k = [], isComposite = {};
    let hash = [], primes = 0, result = '';
    for (let cand = 2; primes < 64; cand++) {
      if (isComposite[cand]) continue;
      for (let i = 0; i < 313; i += cand) isComposite[i] = cand;
      hash[primes] = (Math.pow(cand, 0.5) * maxWord) | 0;
      k[primes++] = (Math.pow(cand, 1 / 3) * maxWord) | 0;
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
    words[words.length] = (bitLen / maxWord) | 0;
    words[words.length] = bitLen;
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16), old = hash;
      hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i]
          + (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? '0' : '') + b.toString(16); }
    return result;
  };
  const hashPw = (email, pw) => sha256(`carcare:${String(email).trim().toLowerCase()}:${pw}`);
  const getUsers = () => Store.get('users');
  const me = () => { const id = Store.val('cc_session', null); return id ? (getUsers().find((u) => u.id === id) || null) : null; };
  const allCars = () => Store.get('cars');
  const getCars = () => { const u = me(); return u ? allCars().filter((c) => c.ownerId === u.id) : []; };
  const isMine = (b) => { const u = me(); return !!u && b.driverId === u.id; };
  const liveCenters = () => getCenters().filter((c) => !c.status || c.status === 'approved');
  const HOOKS = { guard: [], seed: [], bookingExtra: [], invoiceExtra: [], carsTop: [], carTools: [] };
  const BADGES = { driver: [], center: [], admin: [] };
  const LISTENERS = {};
  const on = (name, f) => { (LISTENERS[name] = LISTENERS[name] || []).push(f); };
  const emit = (name, data) => (LISTENERS[name] || []).forEach((f) => f(data));
  const CHANGES = {};
  const INPUTS = {};
  const isFree = (s) => s.available !== false && !s.bookingId;
  const offers = (c, id) => id === 'other' || !c || !Array.isArray(c.services) || c.services.includes(id);
  const carLabel = (b) => {
    if (b.car && b.car.name) return b.car.name;
    const c = allCars().find((x) => x.id === b.carId);
    return c ? carName(c) : 'Car';
  };
  const carPlate = (b) => (b.car && b.car.plate) || ((allCars().find((x) => x.id === b.carId) || {}).plate) || '';
  const saveBooking = (b) => { const all = getBookings(); const i = all.findIndex((x) => x.id === b.id); if (i >= 0) all[i] = b; else all.push(b); Store.set('bookings', all); };

  /* ===== Icons ===== */
  const svg = (cls, inner) => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true" focusable="false">${inner}</svg>`;
  const LAMP = {
    oil: '<path d="M2.5 10.5h4l1.6-1.8h5.6l1.6 1.8L21 8.2l-5.6 6.4H4a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M9.5 8.7V6.8h3.2"/><path d="M19.8 15.6c.7 1 1.1 1.7 1.1 2.2a1.1 1.1 0 0 1-2.2 0c0-.5.4-1.2 1.1-2.2z"/>',
    brakes: '<circle cx="12" cy="12" r="5.6"/><path d="M12 9.2v3.4"/><path d="M12 15.1h.01" stroke-width="2.6"/><path d="M5.2 6.9a8.5 8.5 0 0 0 0 10.2"/><path d="M18.8 6.9a8.5 8.5 0 0 1 0 10.2"/>',
    battery: '<rect x="2.5" y="7.5" width="19" height="12" rx="1.6"/><path d="M6.5 7.5v-2h3v2M14.5 7.5v-2h3v2"/><path d="M6.3 13.5h3.4M14.3 13.5h3.4M16 11.8v3.4"/>',
    engine: '<path d="M9 5h5M11.5 5v3"/><path d="M5 10V8h10l2 2h2.5v2.2H21v4.6h-1.5V19H17l-2 1.6H8.5L6 18.5H4.5v-2.8H3v-3.4h1.5V10z"/>',
    ac: '<path d="M12 2.8v18.4M4 7.4l16 9.2M4 16.6l16-9.2"/><path d="M9.6 4.3 12 6.6l2.4-2.3M9.6 19.7 12 17.4l2.4 2.3"/>',
    tires: '<path d="M6.3 19.6a8 8 0 1 1 11.4 0"/><path d="M4.6 21.4h3M10.5 21.4h3M16.4 21.4h3"/><path d="M12 9v5"/><path d="M12 17h.01" stroke-width="2.6"/>',
    inspection: '<path d="M14.8 3.6a5 5 0 0 0-5.6 6.7l-6 6a1.9 1.9 0 0 0 2.7 2.7l6-6a5 5 0 0 0 6.7-5.6l-2.9 2.9-2.6-.7-.7-2.6z"/>',
    other: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.7a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.7"/><path d="M12 17.2h.01" stroke-width="2.6"/>'
  };
  const lamp = (id) => svg('lampi', LAMP[id] || LAMP.other);
  const P = {
    car: '<path d="M4.6 17.5h-.8a.8.8 0 0 1-.8-.8v-3.1c0-.7.3-1.3.8-1.8l1.6-1.4 1.5-3.4a2 2 0 0 1 1.8-1.2h6.6a2 2 0 0 1 1.8 1.2l1.5 3.4 1.6 1.4c.5.5.8 1.1.8 1.8v3.1a.8.8 0 0 1-.8.8h-.8M9.1 17.5h5.8"/><path d="M6.4 10.4h11.2"/><circle cx="6.9" cy="17.5" r="2"/><circle cx="17.1" cy="17.5" r="2"/>',
    wrench: LAMP.inspection,
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    ticket: '<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4z"/><path d="M14.5 6.5v2M14.5 11v2M14.5 15.5v2"/>',
    inbox: '<path d="M4 13.5 6.2 6.6a1.5 1.5 0 0 1 1.4-1.1h8.8a1.5 1.5 0 0 1 1.4 1.1L20 13.5V17a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17z"/><path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="M15.2 5.3l3.5 3.5L9 18.5l-4.5 1 1-4.5z"/><path d="M13.4 7.1l3.5 3.5"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l.8 12h8.4L17 7"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="1.6"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    chevR: '<path d="M9 5l7 7-7 7"/>',
    chevL: '<path d="M15 5l-7 7 7 7"/>',
    chevD: '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    swap: '<path d="M7 7.5h11.5l-3-3M17 16.5H5.5l3 3"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    shield: '<path d="M12 3.5 5 6.2v5.1c0 4.3 3 7.8 7 9.2 4-1.4 7-4.9 7-9.2V6.2z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V7M17 16v-8"/>',
    store: '<path d="M4 9.5 5.5 5h13L20 9.5"/><path d="M4 9.5c0 1.4 1.1 2.5 2.7 2.5s2.6-1.1 2.6-2.5c0 1.4 1.2 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1.2 2.5 2.7 2.5S20 10.9 20 9.5"/><path d="M5.5 12v7.5h13V12"/><path d="M10 19.5v-4h4v4"/>',
    star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.8l-5.1 2.6 1-5.6-4.1-4 5.7-.8z"/>',
    out: '<path d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14"/><path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.2-3.3 3.9-5 7-5s5.8 1.7 7 5"/>',
    list: '<path d="M8 6.5h11M8 12h11M8 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" stroke-width="2.4"/>',
    wallet: '<rect x="3.5" y="6.5" width="17" height="12" rx="2"/><path d="M15.5 12.5h5"/><path d="M6 6.5 15 4l1 2.5"/>'
  };
  const I = (name) => svg('i', P[name]);

  /* ===== Demo data ===== */
  function makeSlots(centers) {
    const out = [];
    const t0 = new Date();
    t0.setHours(0, 0, 0, 0);
    let days = 0;
    for (let i = 1; days < 6; i++) {
      const d = new Date(t0);
      d.setDate(t0.getDate() + i);
      if (d.getDay() === 5) continue; // centers close on Friday
      const date = isoDate(d);
      centers.forEach((c, ci) => SLOT_TIMES.forEach((t, ti) => {
        const taken = (i * 3 + ci * 5 + ti * 7) % 5 === 0;
        const slot = { id: `${c.id}-${date}-${t.replace(':', '')}`, centerId: c.id, date, time: t, available: !taken };
        if (taken) slot.bookingId = 'phone';
        out.push(slot);
      }));
      days++;
    }
    return out;
  }
  function seed() {
    if (Store.val('cc_seeded', false)) {
      if (!getSlots().some((s) => `${s.date} ${s.time}` > nowKey())) Store.set('slots', getSlots().concat(makeSlots(liveCenters())));
      seedAccounts();
      return;
    }
    const slots = makeSlots(DEMO_CENTERS);
    const days = [...new Set(slots.filter((s) => s.centerId === 'c1').map((s) => s.date))];
    const demo = [
      { ref: 'CC-4310', car: { name: 'Hyundai Elantra 2019', plate: 'RSD 2841' }, issue: 'oil', note: 'Due for the 15,000 km service.', day: 0, time: '10:30', status: 'pending' },
      { ref: 'CC-5127', car: { name: 'Nissan Patrol 2022', plate: 'NJR 718' }, issue: 'ac', note: 'A/C blows warm air in the afternoon.', day: 0, time: '16:00', status: 'pending' },
      { ref: 'CC-3986', car: { name: 'Kia Sportage 2020', plate: 'HKL 5520' }, issue: 'brakes', note: '', day: 1, time: '12:00', status: 'accepted' }
    ];
    const bookings = demo.map((d, i) => {
      const slot = slots.find((s) => s.centerId === 'c1' && s.date === days[d.day] && s.time === d.time);
      const id = `seed${i + 1}`;
      slot.available = false;
      slot.bookingId = id;
      return {
        id, ref: d.ref, driverId: null, car: d.car, centerId: 'c1', slotId: slot.id, date: slot.date, time: slot.time,
        issue: d.issue, note: d.note, status: d.status, createdAt: new Date(Date.now() - (5 - i) * 3600000).toISOString()
      };
    });
    Store.set('centers', DEMO_CENTERS.map((c, i) => Object.assign({ status: 'approved', reviews: [32, 18, 41, 12, 9, 7, 26][i], hours: 'Saturday to Thursday, 9:00 AM – 10:00 PM' }, c)));
    Store.set('slots', slots);
    Store.set('bookings', bookings);
    Store.set('cars', []);
    Store.set('invoices', []);
    Store.set('cc_seeded', true);
    seedAccounts();
  }
  function seedAccounts() {
    if (getUsers().length) return;
    const day = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return isoDate(d); };
    const users = [
      ['u-driver', 'driver', 'Demo Driver', 'driver@carcare.sa', 'Driver@123', 'approved', null],
      ['u-center', 'center', 'Al-Malqa Auto Care', 'center@carcare.sa', 'Center@123', 'approved', 'c1'],
      ['u-admin', 'admin', 'CarCare Admin', 'admin@carcare.sa', 'Admin@123', 'approved', null],
      ['u-lama', 'driver', 'Lama Alotaibi', 'lama@example.com', 'Lama@2026', 'pending', null],
      ['u-qurtubah', 'center', 'Qurtubah Car Service', 'qurtubah@example.com', 'Qurtubah@26', 'pending', 'c8']
    ].map(([id, role, name, email, pw, status, centerId], i) => ({ id, role, name, email, pass: hashPw(email, pw), status, centerId, createdAt: new Date(Date.now() - (20 - i) * 86400000).toISOString() }));
    Store.set('users', users);
    const centers = getCenters();
    if (!centers.some((c) => c.id === 'c8')) {
      centers.push({ id: 'c8', name: 'Qurtubah Car Service', district: 'Qurtubah', rating: 0, reviews: 0, priceLevel: 2, services: ['oil', 'tires', 'inspection'], lat: 24.8275, lng: 46.728, status: 'pending', hours: 'Saturday to Thursday, 9:00 AM – 10:00 PM' });
      Store.set('centers', centers);
    }
    const car = { id: 'v-demo', ownerId: 'u-driver', make: 'Toyota', model: 'Camry', year: 2021, plate: 'ABC 1234', odometer: 42000 };
    Store.set('cars', allCars().filter((c) => c.ownerId).concat([car]));
    const past = { id: 'b-past', ref: 'CC-2047', driverId: 'u-driver', carId: car.id, car: { name: carName(car), plate: car.plate }, centerId: 'c1', slotId: null,
      date: day(-16), time: '10:30', issue: 'oil', note: '', status: 'paid', createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
      acceptedAt: new Date(Date.now() - 17 * 86400000).toISOString(), paidAt: new Date(Date.now() - 17 * 86400000).toISOString() };
    Store.set('bookings', getBookings().filter((b) => b.driverId !== undefined || !b.mine).concat([past]));
    const p = priceFor(past);
    Store.set('invoices', [{ id: 'inv-past', no: `INV-${new Date().getFullYear()}-0001`, bookingId: past.id, centerId: 'c1', issue: 'oil', sub: p.sub, vat: p.vat, total: p.total, level: p.level, method: 'card', last4: '4242', issuedAt: past.paidAt }]);
    Store.set('reminders', [{ id: 'r-demo', ownerId: 'u-driver', carId: car.id, service: 'oil', dueDate: null, dueKm: 42300, done: false }]);
    Store.set('expenses', [{ id: 'e-demo', ownerId: 'u-driver', carId: car.id, date: day(-10), category: 'fuel', amount: 120, note: 'Full tank' }]);
    Store.set('reviews', []);
    Store.set('notifications', []);
    HOOKS.seed.forEach((f) => f());
  }
  function resetDemo() {
    ['centers', 'slots', 'bookings', 'cars', 'invoices', 'cc_seeded', 'cc_filters', 'cc_me', 'cc_role', 'users', 'cc_session', 'reminders', 'expenses', 'reviews', 'notifications'].forEach(Store.remove);
    filters = { minRating: 0, service: null, prices: [] };
    Object.assign(bk, { carId: null, centerId: null, issue: null, note: '', date: null, slotId: null });
    seed();
  }

  /* ===== Chrome: top bar, bottom nav, toast, sheet ===== */
  let backHref = null;
  function setTop({ title = 'CarCare', back = null, hidden = false } = {}) {
    $('#topbar').hidden = hidden;
    $('#title').textContent = title;
    document.title = hidden ? 'CarCare' : `${title} – CarCare`;
    backHref = back;
    const b = $('#back');
    b.hidden = !back;
    b.innerHTML = I('chevL');
    $('#topbar').classList.toggle('has-back', !!back);
    $('#switch').hidden = !me();
    $('#switch').innerHTML = `${I('out')}Sign out`;
  }
  const NAVS = {
    driver: [['centers', '#/d/centers', 'Centers', 'pin'], ['bookings', '#/d/bookings', 'Bookings', 'ticket'], ['cars', '#/d/cars', 'My cars', 'car'], ['alerts', '#/d/alerts', 'Alerts', 'bell']],
    center: [['requests', '#/c/requests', 'Requests', 'inbox'], ['slots', '#/c/slots', 'Slots', 'clock'], ['profile', '#/c/profile', 'Profile', 'store']],
    admin: [['verify', '#/a/verify', 'Verify', 'shield'], ['dashboard', '#/a/dashboard', 'Dashboard', 'chart']]
  };
  function renderNav(kind, active) {
    const nav = $('#nav');
    if (!kind) { nav.hidden = true; nav.innerHTML = ''; return; }
    nav.hidden = false;
    const badges = {};
    if (kind === 'driver') badges.bookings = getBookings().filter((b) => isMine(b) && (b.status === 'pending' || b.status === 'accepted')).length;
    if (kind === 'center') badges.requests = getBookings().filter((b) => b.centerId === meCenter().id && b.status === 'pending').length;
    (BADGES[kind] || []).forEach((f) => Object.assign(badges, f()));
    nav.innerHTML = NAVS[kind].map(([id, href, label, icon]) => (
      `<button type="button" class="navlink" data-go="${href}"${id === active ? ' aria-current="page"' : ''}>${I(icon)}<span>${label}</span>${badges[id] ? `<span class="badge" aria-label="${badges[id]} open">${badges[id]}</span>` : ''}</button>`
    )).join('');
  }
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  let sheetOpener = null;
  function openSheet(label, build, onClick) {
    closeSheet();
    sheetOpener = document.activeElement;
    const root = $('#sheet-root');
    root.innerHTML = `<div class="sheet-backdrop" data-sheet="backdrop"><div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1"><div class="sheet-grip" aria-hidden="true"></div><div class="sheet-body" id="sheet-body"></div></div></div>`;
    build($('#sheet-body'));
    $('.sheet-backdrop', root).addEventListener('click', (e) => {
      if (e.target.dataset && e.target.dataset.sheet === 'backdrop') { closeSheet(); return; }
      onClick(e);
    });
    document.body.classList.add('sheet-open');
    const first = $('.sheet-panel button, .sheet-panel select, .sheet-panel input', root);
    (first || $('.sheet-panel', root)).focus();
  }
  function closeSheet() {
    const root = $('#sheet-root');
    if (!root.innerHTML) return;
    root.innerHTML = '';
    document.body.classList.remove('sheet-open');
    if (sheetOpener && document.contains(sheetOpener)) sheetOpener.focus();
    sheetOpener = null;
  }
  const tag = (...lines) => `<footer class="story-tag">${lines.map((l) => `<span>${esc(l)}</span>`).join('')}</footer>`;
  function placeNotches(ticket) {
    const head = $('.ticket-head', ticket);
    const top = head.offsetTop + head.offsetHeight - 9;
    $$('.notch', ticket).forEach((n) => { n.style.top = `${top}px`; });
  }

  /* ===== T0.2 Home screen and navigation (Sara Alzannan) ===== */
  function renderLanding() {
    setTop({ hidden: true });
    view().innerHTML = `
      <section class="hero">
        <div class="dashrow" aria-hidden="true">${SERVICES.map((s, i) => `<span style="--i:${i}">${lamp(s.id)}</span>`).join('')}</div>
        <h1 class="hero-title">CarCare</h1>
        <p class="hero-sub">Book car maintenance, follow the center’s answer, and keep every invoice in one place.</p>
      </section>
      <section class="roles" aria-label="Sign in or create an account">
        <button type="button" class="role" data-go="#/signin">
          <span class="role-ic">${I('user')}</span>
          <span class="role-text"><strong>Sign in</strong><small>Drivers, service centers and admins</small></span>${I('chevR')}
        </button>
        <button type="button" class="role" data-go="#/signup">
          <span class="role-ic">${I('plus')}</span>
          <span class="role-text"><strong>Create an account</strong><small>New driver or service center</small></span>${I('chevR')}
        </button>
      </section>
      <details class="demo-accounts"><summary>Demo accounts</summary>
        <dl><dt>Driver</dt><dd>driver@carcare.sa · Driver@123</dd><dt>Service center</dt><dd>center@carcare.sa · Center@123</dd><dt>Admin</dt><dd>admin@carcare.sa · Admin@123</dd></dl>
      </details>
      <p class="proto">Final increment: US01 to US17. Your data is saved in this browser.</p>
      <p class="proto"><button type="button" class="text-btn" data-action="reset">Reset demo data</button></p>`;
  }

  /* ===== US02 Find nearby service centers (Joud Aldhaban) + US03 Filter service centers (Renad Alqahtani) ===== */
  let filters = Object.assign({ minRating: 0, service: null, prices: [] }, Store.val('cc_filters', {}));
  const matches = (c, f) => {
    if (f.minRating && !(Number(c.rating) >= f.minRating)) return false;
    if (f.service && !offers(c, f.service)) return false;
    if (f.prices.length && !f.prices.includes(Number(c.priceLevel))) return false;
    return true;
  };
  const centersSorted = () => liveCenters().map((c) => Object.assign({}, c, { dist: kmBetween(HOME, c) })).sort((a, b) => a.dist - b.dist);
  const BBOX = { minLat: 24.72, maxLat: 24.875, minLng: 46.56, maxLng: 46.8 };
  const proj = (p) => [((p.lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * 360, ((BBOX.maxLat - p.lat) / (BBOX.maxLat - BBOX.minLat)) * 200];
  function mapSVG(list) {
    const streets = [];
    for (let x = 18; x < 360; x += 30) streets.push(`M${x} -10V210`);
    for (let y = 14; y < 200; y += 26) streets.push(`M-10 ${y}H370`);
    const majors = ['M140 -10C142 60 147 120 152 210', 'M-10 113C80 106 200 119 370 104', 'M-10 41C90 49 220 37 370 52', 'M152 113C214 136 268 158 370 176'];
    const [hx, hy] = proj(HOME);
    const pins = list.map((c, i) => {
      const [x, y] = proj(c);
      return `<g class="mpin" data-action="pin" data-center="${c.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" tabindex="0" role="button" aria-label="${i + 1}, ${esc(c.name)}"><circle r="11"/><text y="4">${i + 1}</text></g>`;
    }).join('');
    return `<div class="map"><svg viewBox="0 0 360 200" role="img" aria-label="Map of nearby service centers">
      <path class="m-park" d="M222 64c14-10 40-8 50 4s6 30-10 36-38 4-46-8-8-22 6-32z"/>
      <path class="m-water" d="M26 -10C44 40 18 96 36 140S30 190 40 210"/>
      <path class="m-street" d="${streets.join('')}"/>
      ${majors.map((d) => `<path class="m-casing" d="${d}"/>`).join('')}
      ${majors.map((d) => `<path class="m-major" d="${d}"/>`).join('')}
      <g transform="translate(${hx.toFixed(1)} ${hy.toFixed(1)})"><circle class="you-halo" r="15"/><circle class="you-dot" r="6"/><text class="you-label" x="-14" y="-12">You</text></g>
      ${pins}
    </svg></div>`;
  }
  function activeChips() {
    const chips = [];
    if (filters.minRating) chips.push(['rating', `Rating ${filters.minRating.toFixed(1)}+`]);
    if (filters.service) chips.push(['service', SERVICE[filters.service].label]);
    if (filters.prices.length) chips.push(['prices', filters.prices.map((p) => LEVELS[p].label).join(', ')]);
    return chips.map(([k, label]) => `<button type="button" class="chip" data-action="remove-filter" data-key="${k}" aria-label="Remove filter ${esc(label)}">${esc(label)}${I('x')}</button>`).join('')
      + '<button type="button" class="text-btn" data-action="clear-filters">Clear all</button>';
  }
  function renderCenters() {
    setTop({ title: 'Service centers' });
    const list = centersSorted().filter((c) => matches(c, filters));
    const nActive = (filters.minRating ? 1 : 0) + (filters.service ? 1 : 0) + (filters.prices.length ? 1 : 0);
    view().innerHTML = `
      <div class="locbar">${I('pin')}<span>Near <strong>${HOME.label}</strong></span></div>
      ${mapSVG(list)}
      <div class="list-head">
        <p><strong>${list.length} ${list.length === 1 ? 'center' : 'centers'}</strong> by distance</p>
        <button type="button" class="filter-btn" data-action="open-filters" aria-haspopup="dialog">${I('sliders')}Filters${nActive ? `<span class="badge">${nActive}</span>` : ''}</button>
      </div>
      ${nActive ? `<div class="chips">${activeChips()}</div>` : ''}
      ${list.length ? `<ul class="clist">${list.map((c, i) => `
        <li class="crow" id="row-${c.id}">
          <span class="pinno" aria-hidden="true">${i + 1}</span>
          <div class="crow-text">
            <h3><button type="button" class="link-btn" data-go="#/d/center?c=${c.id}">${esc(c.name)}</button></h3>
            <p class="sub">${esc(c.district)}, ${c.dist.toFixed(1)} km away</p>
            <div class="crow-meta"><span class="rating"><span class="star" aria-hidden="true">★</span> ${Number(c.rating).toFixed(1)}${c.reviews ? ` <small>(${c.reviews})</small>` : ''}</span><span>${LEVELS[c.priceLevel] ? LEVELS[c.priceLevel].label : ''}</span></div>
            <div class="svc-icons" aria-label="Services: ${esc(c.services.map((s) => SERVICE[s].label).join(', '))}">${c.services.map((s) => `<span class="${s === filters.service ? 'hit' : ''}" title="${esc(SERVICE[s].label)}">${lamp(s)}</span>`).join('')}</div>
          </div>
          <button type="button" class="primary small" data-go="#/d/book?center=${c.id}">Book</button>
        </li>`).join('')}</ul>`
        : `<div class="empty"><h2>No centers match these filters</h2><p>Try a lower rating or another price range.</p><button type="button" class="secondary" data-action="clear-filters">Clear filters</button></div>`}
      ${tag('US02 Find nearby service centers, Joud Aldhaban', 'US03 Filter service centers, Renad Alqahtani')}`;
  }
  function openFilters() {
    const draft = { minRating: filters.minRating, service: filters.service, prices: filters.prices.slice() };
    const draw = () => {
      const n = centersSorted().filter((c) => matches(c, draft)).length;
      $('#sheet-body').innerHTML = `
        <h2 class="sheet-title">Filters</h2>
        <h3>Minimum rating</h3>
        <div class="seg">${[0, 3.5, 4, 4.5].map((r) => `<button type="button" data-r="${r}" aria-pressed="${draft.minRating === r}">${r ? `${r.toFixed(1)}+` : 'Any'}</button>`).join('')}</div>
        <h3>Service needed</h3>
        <div class="lamps compact">${SERVICES.filter((s) => s.id !== 'other').map((s) => `<button type="button" class="lamp" data-s="${s.id}" aria-pressed="${draft.service === s.id}">${lamp(s.id)}<span>${s.label}</span></button>`).join('')}</div>
        <h3>Price range</h3>
        <div class="seg">${[1, 2, 3].map((p) => `<button type="button" data-p="${p}" aria-pressed="${draft.prices.includes(p)}">${LEVELS[p].label}</button>`).join('')}</div>
        <div class="sheet-actions">
          <button type="button" class="secondary" data-f="clear">Clear all</button>
          <button type="button" class="primary" data-f="apply">Show ${n} ${n === 1 ? 'center' : 'centers'}</button>
        </div>`;
    };
    openSheet('Filters', draw, (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.r !== undefined) draft.minRating = Number(b.dataset.r);
      else if (b.dataset.s) draft.service = draft.service === b.dataset.s ? null : b.dataset.s;
      else if (b.dataset.p) { const p = Number(b.dataset.p); draft.prices = draft.prices.includes(p) ? draft.prices.filter((x) => x !== p) : draft.prices.concat(p).sort(); }
      else if (b.dataset.f === 'clear') { draft.minRating = 0; draft.service = null; draft.prices = []; }
      else if (b.dataset.f === 'apply') { filters = draft; Store.set('cc_filters', filters); closeSheet(); refresh(); return; }
      const keep = b.dataset.r !== undefined ? `[data-r="${b.dataset.r}"]` : b.dataset.s ? `[data-s="${b.dataset.s}"]` : b.dataset.p ? `[data-p="${b.dataset.p}"]` : '[data-f="clear"]';
      draw();
      const again = $(`#sheet-body ${keep}`);
      if (again) again.focus();
    });
  }

  /* ===== US04 Book a maintenance appointment (Shahad Alhusayni) ===== */
  const bk = { carId: null, centerId: null, issue: null, note: '', date: null, slotId: null };
  const ERR = { car: 'Choose the car you’re bringing in.', center: 'Choose a service center.', issue: 'Choose what’s wrong so the center can prepare.', time: 'Choose a free date and time.' };
  const step = (key, n, title, hint, body, after) => `
    <section class="step" id="step-${key}" data-n="${n}" aria-labelledby="h-${key}">
      <div class="marker" aria-hidden="true"><span>${n}</span></div>
      <div>
        <h2 id="h-${key}">${title}</h2>
        <p class="hint" id="hint-${key}"${hint ? '' : ' hidden'}>${hint}</p>
        ${body}
        <p class="msg" id="msg-${key}" role="alert" hidden></p>
        ${after || ''}
      </div>
    </section>`;
  function showMsg(key, text, kind) {
    const el = $(`#msg-${key}`);
    if (!el) return;
    el.textContent = text;
    el.className = `msg ${kind || 'err'}`;
    el.hidden = false;
    $(`#step-${key}`).classList.toggle('invalid', (kind || 'err') === 'err');
  }
  function clearMsg(key) {
    const el = $(`#msg-${key}`);
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
    $(`#step-${key}`).classList.remove('invalid');
  }
  function renderBook(q) {
    setTop({ title: 'Book a service', back: '#/d/centers' });
    const pre = q.get('center');
    if (pre && centerById(pre) && pre !== bk.centerId) {
      bk.centerId = pre;
      bk.date = null;
      bk.slotId = null;
      if (bk.issue && !offers(centerById(pre), bk.issue)) bk.issue = null;
    }
    view().innerHTML = `
      <div class="form-sheet">
        ${step('car', 1, 'Your car', '', '<div class="options" id="bk-cars" role="radiogroup" aria-labelledby="h-car"></div>')}
        ${step('center', 2, '<label for="bk-center">Service center</label>', '', `<div class="select-wrap"><select id="bk-center" data-change="bk-center"></select>${I('chevD')}</div><div class="center-meta" id="bk-meta" hidden></div>`)}
        ${step('issue', 3, 'What’s wrong?', 'The center sees this before you arrive, so they can prepare.', '<div class="lamps" id="bk-lamps" role="group" aria-labelledby="h-issue"></div>',
          `<div class="field"><label for="bk-note">Add details (optional) <span class="counter" id="bk-counter">${bk.note.length}/200</span></label><textarea id="bk-note" rows="3" maxlength="200" data-input="bk-note" placeholder="For example: squeaking when I brake at low speed">${esc(bk.note)}</textarea></div>`)}
        ${step('time', 4, 'Date and time', 'Crossed-out times are already booked.', '<div class="dates" id="bk-dates" role="radiogroup" aria-label="Date"></div><div class="times" id="bk-times" role="radiogroup" aria-label="Time"></div>')}
      </div>
      ${tag('US04 Book a maintenance appointment, Shahad Alhusayni')}
      <div class="actionbar"><p class="progress" id="bk-progress" aria-live="polite"></p><button type="button" class="primary" data-action="bk-send">Send booking request</button></div>`;
    drawCars();
    drawCenterSelect();
    drawLamps();
    drawDates();
    bkProgress();
  }
  function drawCars() {
    const cars = getCars();
    const box = $('#bk-cars');
    if (!cars.length) {
      bk.carId = null;
      box.innerHTML = '<div class="empty-inline"><p>No car saved yet. Add your car first so the center knows what’s coming in.</p><button type="button" class="secondary" data-go="#/d/car?id=new&return=book">Add a vehicle</button></div>';
      return;
    }
    if (bk.carId && !cars.some((c) => c.id === bk.carId)) bk.carId = null;
    if (!bk.carId && cars.length === 1) bk.carId = cars[0].id;
    box.innerHTML = cars.map((c) => {
      const on = c.id === bk.carId;
      return `<label class="opt${on ? ' is-checked' : ''}"><input type="radio" name="bk-car" value="${esc(c.id)}" data-change="bk-car"${on ? ' checked' : ''}><span class="dot" aria-hidden="true"></span>
        <span><span class="opt-title">${esc(carName(c))}</span><span class="opt-sub">${esc(c.plate)}, ${Number(c.odometer).toLocaleString('en-US')} km</span></span></label>`;
    }).join('');
  }
  function drawCenterSelect() {
    $('#bk-center').innerHTML = '<option value="">Choose a center</option>' + centersSorted().map((c) => (
      `<option value="${c.id}"${c.id === bk.centerId ? ' selected' : ''}>${esc(c.name)} (${c.dist.toFixed(1)} km)</option>`
    )).join('');
    const c = centerById(bk.centerId);
    const meta = $('#bk-meta');
    meta.hidden = !c;
    meta.innerHTML = c ? `<span>${esc(c.district)}</span><span class="rating"><span class="star" aria-hidden="true">★</span> ${Number(c.rating).toFixed(1)}</span><span>${LEVELS[c.priceLevel].label}</span>` : '';
  }
  function drawLamps() {
    const c = centerById(bk.centerId);
    $('#bk-lamps').innerHTML = SERVICES.map((s) => {
      const ok = offers(c, s.id);
      return `<button type="button" class="lamp" data-action="bk-issue" data-issue="${s.id}" aria-pressed="${bk.issue === s.id}"${ok ? '' : ' aria-disabled="true"'}>${lamp(s.id)}<span>${s.label}</span>${ok ? '' : '<span class="off-note">Not offered</span>'}</button>`;
    }).join('');
  }
  const upcomingSlots = (centerId) => {
    const now = nowKey();
    return getSlots().filter((s) => s.centerId === centerId && `${s.date} ${s.time}` > now)
      .sort((a, b) => (`${a.date} ${a.time}` < `${b.date} ${b.time}` ? -1 : 1));
  };
  function drawDates() {
    const hint = $('#hint-time');
    if (!bk.centerId) {
      $('#bk-dates').innerHTML = '';
      $('#bk-times').innerHTML = '';
      hint.textContent = 'Choose a center to see its free times.';
      return;
    }
    const slots = upcomingSlots(bk.centerId);
    const days = [...new Set(slots.map((s) => s.date))];
    const freeDays = days.filter((d) => slots.some((s) => s.date === d && isFree(s)));
    if (!freeDays.length) {
      bk.date = null;
      $('#bk-dates').innerHTML = '';
      $('#bk-times').innerHTML = '';
      hint.textContent = 'This center has no free times this week. Choose another center.';
      return;
    }
    hint.textContent = 'Crossed-out times are already booked.';
    if (!bk.date || !freeDays.includes(bk.date)) bk.date = freeDays[0];
    $('#bk-dates').innerHTML = days.map((d) => {
      const free = slots.filter((s) => s.date === d && isFree(s)).length;
      const dt = parseISO(d);
      return `<button type="button" class="date" role="radio" data-action="bk-date" data-date="${d}" aria-checked="${d === bk.date}"${free ? '' : ' disabled'} aria-label="${esc(fmtDay(d))}, ${free ? `${free} free times` : 'fully booked'}">
        <span class="dow">${dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span><span class="dom">${dt.getDate()}</span><span class="mon">${free ? dt.toLocaleDateString('en-GB', { month: 'short' }) : 'Full'}</span></button>`;
    }).join('');
    $('#bk-times').innerHTML = slots.filter((s) => s.date === bk.date).map((s) => {
      const free = isFree(s);
      return `<button type="button" class="time" role="radio" data-action="bk-time" data-slot="${esc(s.id)}" aria-checked="${s.id === bk.slotId}"${free ? '' : ` disabled aria-label="${fmtTime(s.time)}, booked"`}>${fmtTime(s.time)}</button>`;
    }).join('');
  }
  function bkProgress() {
    const done = { car: !!bk.carId, center: !!bk.centerId, issue: !!bk.issue, time: !!bk.slotId };
    Object.keys(done).forEach((k) => {
      const s = $(`#step-${k}`);
      s.classList.toggle('complete', done[k]);
      $('.marker', s).innerHTML = done[k] ? I('check') : `<span>${s.dataset.n}</span>`;
    });
    const n = Object.values(done).filter(Boolean).length;
    const next = !done.car ? 'your car' : !done.center ? 'a service center' : !done.issue ? 'what’s wrong' : !done.time ? 'a date and time' : '';
    $('#bk-progress').innerHTML = next ? `<strong>${n} of 4 chosen</strong>Next: ${next}` : '<strong>Ready to send</strong>Center replies next';
  }
  function bkSend() {
    const missing = ['car', 'center', 'issue', 'time'].filter((k) => !{ car: bk.carId, center: bk.centerId, issue: bk.issue, time: bk.slotId }[k]);
    missing.forEach((k) => showMsg(k, k === 'car' && !getCars().length ? 'Add a car first, then send the request.' : ERR[k]));
    if (missing.length) {
      const s = $(`#step-${missing[0]}`);
      s.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      const target = $('input, select, a, .lamp:not([aria-disabled="true"]), .date:not(:disabled), .time:not(:disabled)', s);
      if (target) target.focus({ preventScroll: true });
      return;
    }
    const slots = getSlots();
    const slot = slots.find((s) => s.id === bk.slotId);
    if (!slot || !isFree(slot)) {
      bk.slotId = null;
      drawDates();
      bkProgress();
      showMsg('time', 'That time was just booked by someone else. Choose another one.');
      return;
    }
    const car = getCars().find((c) => c.id === bk.carId);
    const used = new Set(getBookings().map((b) => b.ref));
    let ref;
    do { ref = `CC-${Math.floor(1000 + Math.random() * 9000)}`; } while (used.has(ref));
    const booking = {
      id: uid('b'), ref, driverId: me().id, carId: car.id, car: { name: carName(car), plate: car.plate },
      centerId: bk.centerId, slotId: slot.id, date: slot.date, time: slot.time,
      issue: bk.issue, note: bk.note.trim(), status: 'pending', createdAt: new Date().toISOString()
    };
    slot.available = false;
    slot.bookingId = booking.id;
    Store.set('slots', slots);
    saveBooking(booking);
    Object.assign(bk, { issue: null, note: '', date: null, slotId: null });
    showBooked(booking);
  }
  function showBooked(b) {
    const c = centerById(b.centerId);
    view().innerHTML = `
      <section class="confirm">
        <div class="confirm-icon" aria-hidden="true">${I('check')}</div>
        <h2 id="done-title" tabindex="-1">Booking request sent</h2>
        <p class="lead">${esc(c.name)} will accept or decline it. You’ll see the answer in Bookings.</p>
        <article class="ticket" aria-label="Booking details">
          <span class="notch l" aria-hidden="true"></span><span class="notch r" aria-hidden="true"></span>
          <div class="ticket-head"><div class="ticket-ref"><small>Booking</small>${esc(b.ref)}</div><span class="pill pending">Pending</span></div>
          <dl>
            <dt>Car</dt><dd>${esc(carLabel(b))}</dd>
            <dt>Center</dt><dd>${esc(c.name)}</dd>
            <dt>Problem</dt><dd>${esc(SERVICE[b.issue].label)}</dd>
            ${b.note ? `<dt>Details</dt><dd>${esc(b.note)}</dd>` : ''}
            <dt>When</dt><dd>${esc(fmtDay(b.date))}, ${fmtTime(b.time)}</dd>
          </dl>
        </article>
        <div class="confirm-actions">
          <button type="button" class="primary" data-go="#/d/bookings">View my bookings</button>
          <button type="button" class="secondary" data-go="#/d/centers">Back to centers</button>
        </div>
        <div class="demo-hint">
          <p><strong>Next:</strong> ${esc(c.name)} answers your request, and you get a notification in Alerts. In the demo, sign out and sign in as center@carcare.sa to answer requests at Al-Malqa Auto Care.</p>
        </div>
      </section>
      ${tag('US04 Book a maintenance appointment, Shahad Alhusayni')}`;
    placeNotches($('.ticket'));
    window.scrollTo(0, 0);
    $('#done-title').focus({ preventScroll: true });
  }

  /* ===== Driver: my bookings ===== */
  function renderBookings() {
    setTop({ title: 'My bookings' });
    const mine = getBookings().filter(isMine).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const STATUS = {
      pending: ['Pending', 'Waiting for the center to accept.'],
      accepted: ['Accepted', 'Accepted. Pay before your visit.'],
      rejected: ['Declined', 'The center can’t take this time.'],
      paid: ['Paid', 'Paid. Your invoice is ready.'],
      cancelled: ['Cancelled', 'You cancelled this booking.']
    };
    view().innerHTML = `
      <div class="pagehead"><button type="button" class="primary block" data-go="#/d/book">${I('plus')}Book a service</button></div>
      ${mine.length ? `<ul class="blist">${mine.map((b) => {
        const c = centerById(b.centerId);
        const [label, next] = STATUS[b.status] || STATUS.pending;
        const action = b.status === 'accepted' ? `<button type="button" class="text-btn" data-go="#/d/pay?b=${b.id}">Pay now</button>`
          : b.status === 'paid' ? `<button type="button" class="text-btn" data-go="#/d/invoice?b=${b.id}">View invoice</button>`
          : b.status === 'rejected' ? `<button type="button" class="text-btn" data-go="#/d/book?center=${b.centerId}">Book another time</button>`
          : '';
        const extra = HOOKS.bookingExtra.map((f) => f(b)).join('');
        return `<li class="bk-row">
          <div class="b-top"><span class="b-ref">${esc(b.ref)}</span><span class="pill ${esc(b.status)}">${label}</span></div>
          <div class="b-title">${esc(SERVICE[b.issue].label)} at ${esc(c ? c.name : 'the center')}</div>
          <div class="b-sub">${esc(fmtDay(b.date))}, ${fmtTime(b.time)}, ${esc(carLabel(b))}</div>
          <div class="b-next"><span>${next}</span>${action}</div>
          ${extra ? `<div class="b-extra">${extra}</div>` : ''}
        </li>`;
      }).join('')}</ul>` : '<div class="empty"><h2>No bookings yet</h2><p>Book a service and follow the center’s answer here.</p></div>'}
      ${tag('Booking status (US04) and payment (US07)')}`;
  }

  /* ===== US07 Pay online and get a digital invoice (Renad Alqahtani) ===== */
  let payMethod = 'card';
  const priceFor = (b) => {
    const c = centerById(b.centerId);
    const lvl = LEVELS[c ? c.priceLevel : 2] || LEVELS[2];
    const sub = c && c.prices && Number(c.prices[b.issue]) > 0 ? Math.round(Number(c.prices[b.issue])) : Math.round((SERVICE[b.issue] || SERVICE.other).price * lvl.factor);
    const vat = round2(sub * VAT_RATE);
    return { sub, vat, total: round2(sub + vat), level: lvl.label };
  };
  function renderPay(q) {
    setTop({ title: 'Pay for booking', back: '#/d/bookings' });
    const b = getBookings().find((x) => x.id === q.get('b') && isMine(x));
    if (!b) { view().innerHTML = '<div class="empty"><h2>Booking not found</h2><p>Open it again from My bookings.</p><button type="button" class="secondary" data-go="#/d/bookings">My bookings</button></div>'; return; }
    if (b.status === 'paid') { go(`#/d/invoice?b=${b.id}`, true); return; }
    const c = centerById(b.centerId);
    const p = priceFor(b);
    const fld = (id, label, attrs) => `<div class="fld"><label for="${id}">${label}</label><input id="${id}" class="inp" ${attrs} aria-describedby="${id}-err"><p class="ferr" id="${id}-err" hidden></p></div>`;
    view().innerHTML = `
      <section class="paysum">
        <div class="ps-head"><span class="lit">${lamp(b.issue)}</span><div><h2>${esc(SERVICE[b.issue].label)}</h2><p>${esc(c.name)}</p></div></div>
        <dl class="kv"><dt>Booking</dt><dd>${esc(b.ref)}</dd><dt>When</dt><dd>${esc(fmtDay(b.date))}, ${fmtTime(b.time)}</dd><dt>Car</dt><dd>${esc(carLabel(b))}</dd></dl>
        <dl class="amounts">
          <dt>${esc(SERVICE[b.issue].label)}, ${p.level} center</dt><dd>${fmtSAR(p.sub)}</dd>
          <dt>VAT 15%</dt><dd>${fmtSAR(p.vat)}</dd>
          <dt class="total">Total</dt><dd class="total">${fmtSAR(p.total)}</dd>
        </dl>
      </section>
      ${b.status !== 'accepted' ? `<div class="notice">You can pay after the center accepts this booking.</div>` : `
      <section class="paybox">
        <h2 class="sec-h" id="pm-h">Payment method</h2>
        <div class="options" role="radiogroup" aria-labelledby="pm-h">
          <label class="opt${payMethod === 'card' ? ' is-checked' : ''}"><input type="radio" name="pm" value="card" data-change="pm"${payMethod === 'card' ? ' checked' : ''}><span class="dot" aria-hidden="true"></span><span><span class="opt-title">Card</span><span class="opt-sub">mada, Visa or Mastercard</span></span></label>
          <label class="opt${payMethod === 'applepay' ? ' is-checked' : ''}"><input type="radio" name="pm" value="applepay" data-change="pm"${payMethod === 'applepay' ? ' checked' : ''}><span class="dot" aria-hidden="true"></span><span><span class="opt-title">Apple Pay</span><span class="opt-sub">Confirm with Face ID or Touch ID</span></span></label>
        </div>
        <div id="cardfields"${payMethod === 'card' ? '' : ' hidden'}>
          ${fld('cc-name', 'Name on card', 'autocomplete="cc-name" placeholder="As written on the card"')}
          ${fld('cc-num', 'Card number', 'inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="1234 5678 9012 3456" data-input="cc-num"')}
          <div class="fld-row">
            ${fld('cc-exp', 'Expiry', 'inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/YY" data-input="cc-exp"')}
            ${fld('cc-cvv', 'CVV', 'inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123" data-input="cc-cvv"')}
          </div>
          <p class="hint" style="margin-top:12px">Demo card: 4242 4242 4242 4242, any future date, any 3 digits.</p>
        </div>
      </section>
      <div class="actionbar"><p class="progress"><strong>${fmtSAR(p.total)}</strong>Including VAT</p><button type="button" class="primary" id="paybtn" data-action="pay" data-b="${b.id}">${payMethod === 'applepay' ? 'Pay with Apple Pay' : `Pay ${fmtSAR(p.total)}`}</button></div>`}
      ${tag('US07 Pay online and view a digital invoice, Renad Alqahtani')}`;
  }
  const luhn = (num) => {
    let sum = 0, alt = false;
    for (let i = num.length - 1; i >= 0; i--) { let n = Number(num[i]); if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
    return sum % 10 === 0;
  };
  function setFieldErr(id, msg) {
    const inp = $(`#${id}`), e = $(`#${id}-err`);
    if (msg) { inp.setAttribute('aria-invalid', 'true'); e.textContent = msg; e.hidden = false; }
    else { inp.removeAttribute('aria-invalid'); e.textContent = ''; e.hidden = true; }
  }
  function pay(btn) {
    const b = getBookings().find((x) => x.id === btn.dataset.b);
    if (!b || b.status !== 'accepted') return;
    let last4 = '';
    if (payMethod === 'card') {
      const name = $('#cc-name').value.trim();
      const num = $('#cc-num').value.replace(/\D/g, '');
      const exp = $('#cc-exp').value.trim();
      const cvv = $('#cc-cvv').value.trim();
      const errs = {};
      if (name.length < 2) errs['cc-name'] = 'Enter the name on the card.';
      if (num.length !== 16 || !luhn(num)) errs['cc-num'] = 'Enter a valid 16-digit card number.';
      const m = exp.match(/^(\d{2})\/(\d{2})$/);
      if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) errs['cc-exp'] = 'Use the format MM/YY.';
      else {
        const now = new Date(), y = 2000 + Number(m[2]), mo = Number(m[1]);
        if (y < now.getFullYear() || (y === now.getFullYear() && mo < now.getMonth() + 1)) errs['cc-exp'] = 'This card has expired.';
      }
      if (!/^\d{3,4}$/.test(cvv)) errs['cc-cvv'] = 'Enter the 3 digits on the back of the card.';
      ['cc-name', 'cc-num', 'cc-exp', 'cc-cvv'].forEach((id) => setFieldErr(id, errs[id]));
      const first = ['cc-name', 'cc-num', 'cc-exp', 'cc-cvv'].find((id) => errs[id]);
      if (first) { $(`#${first}`).focus(); return; }
      last4 = num.slice(-4);
    }
    btn.disabled = true;
    btn.textContent = 'Processing…';
    setTimeout(() => {
      const p = priceFor(b);
      const invoices = getInvoices();
      const no = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`;
      invoices.push({ id: uid('inv'), no, bookingId: b.id, centerId: b.centerId, issue: b.issue, sub: p.sub, vat: p.vat, total: p.total, level: p.level, method: payMethod, last4, issuedAt: new Date().toISOString() });
      Store.set('invoices', invoices);
      b.status = 'paid';
      b.paidAt = new Date().toISOString();
      saveBooking(b);
      toast('Payment successful');
      go(`#/d/invoice?b=${b.id}`);
    }, 1100);
  }
  function renderInvoice(q) {
    setTop({ title: 'Invoice', back: '#/d/bookings' });
    const b = getBookings().find((x) => x.id === q.get('b'));
    const inv = b && getInvoices().find((i) => i.bookingId === b.id);
    if (!inv) { view().innerHTML = '<div class="empty"><h2>No invoice yet</h2><p>The invoice appears after payment.</p><button type="button" class="secondary" data-go="#/d/bookings">My bookings</button></div>'; return; }
    const c = centerById(b.centerId);
    const issued = new Date(inv.issuedAt);
    view().innerHTML = `
      <section class="invoice">
        <article class="ticket" aria-label="Invoice">
          <span class="notch l" aria-hidden="true"></span><span class="notch r" aria-hidden="true"></span>
          <div class="ticket-head"><div class="ticket-ref"><small>Tax invoice</small>${esc(inv.no)}</div><span class="pill paid">Paid</span></div>
          <div class="from"><strong>${esc(c.name)}</strong><span>${esc(c.district)}, Riyadh</span></div>
          <dl>
            <dt>Issued</dt><dd>${esc(fmtDay(isoDate(issued)))}, ${fmtTime(`${pad(issued.getHours())}:${pad(issued.getMinutes())}`)}</dd>
            <dt>Booking</dt><dd>${esc(b.ref)}</dd>
            <dt>Car</dt><dd>${esc(carLabel(b))}</dd>
            <dt>Appointment</dt><dd>${esc(fmtDay(b.date))}, ${fmtTime(b.time)}</dd>
          </dl>
          <table class="lines">
            <tr><td>${esc(SERVICE[inv.issue].label)}, ${esc(inv.level)} center</td><td>${fmtSAR(inv.sub)}</td></tr>
            <tr><td>VAT 15%</td><td>${fmtSAR(inv.vat)}</td></tr>
            <tr class="total"><td>Total paid</td><td>${fmtSAR(inv.total)}</td></tr>
          </table>
          <p class="paidwith">Paid with ${inv.method === 'card' ? `card ending ${esc(inv.last4)}` : 'Apple Pay'}.</p>
        </article>
        ${HOOKS.invoiceExtra.map((f) => f(b)).join('')}
        <button type="button" class="secondary block" data-go="#/d/bookings">Back to my bookings</button>
      </section>
      ${tag('US07 Pay online and view a digital invoice, Renad Alqahtani')}`;
    placeNotches($('.ticket'));
  }

  /* ===== US01 Manage vehicle profile (Norah Alrougi) ===== */
  function renderCars() {
    setTop({ title: 'My cars' });
    const cars = getCars();
    view().innerHTML = `
      <div class="pagehead"><button type="button" class="primary block" data-go="#/d/car?id=new">${I('plus')}Add a vehicle</button></div>
      ${HOOKS.carsTop.map((f) => f(cars)).join('')}
      ${cars.length ? `<ul class="carlist">${cars.map((c) => `
        <li class="carrow">
          <span class="car-ic">${I('car')}</span>
          <div class="car-text"><h3>${esc(carName(c))}</h3><div class="car-meta">${plateHTML(c.plate)}<span>${Number(c.odometer).toLocaleString('en-US')} km</span></div></div>
          <button type="button" class="secondary small" data-go="#/d/car?id=${c.id}" aria-label="Edit ${esc(carName(c))}">Edit</button>
          <div class="car-tools">${HOOKS.carTools.map((f) => f(c)).join('')}</div>
        </li>`).join('')}</ul>` : '<div class="empty"><h2>No cars yet</h2><p>Add your car once and use it for every booking.</p></div>'}
      ${tag('US01 Manage vehicle profile, Norah Alrougi')}`;
  }
  function renderCarForm(q) {
    const id = q.get('id');
    const ret = q.get('return') || '';
    const car = id && id !== 'new' ? getCars().find((c) => c.id === id) : null;
    setTop({ title: car ? 'Edit vehicle' : 'Add a vehicle', back: ret === 'book' ? '#/d/book' : '#/d/cars' });
    const years = [];
    for (let y = new Date().getFullYear() + 1; y >= 1990; y--) years.push(y);
    const v = car || { make: '', model: '', year: '', plate: '', odometer: '' };
    const fld = (fid, label, input) => `<div class="fld"><label for="${fid}">${label}</label>${input}<p class="ferr" id="${fid}-err" hidden></p></div>`;
    view().innerHTML = `
      <div class="form">
        ${fld('car-make', 'Make', `<input id="car-make" class="inp" list="makes" value="${esc(v.make)}" placeholder="For example: Toyota" aria-describedby="car-make-err">`)}
        <datalist id="makes">${MAKES.map((m) => `<option value="${m}">`).join('')}</datalist>
        ${fld('car-model', 'Model', `<input id="car-model" class="inp" value="${esc(v.model)}" placeholder="For example: Camry" aria-describedby="car-model-err">`)}
        ${fld('car-year', 'Year', `<div class="select-wrap"><select id="car-year" class="inp" aria-describedby="car-year-err"><option value="">Choose the year</option>${years.map((y) => `<option${String(y) === String(v.year) ? ' selected' : ''}>${y}</option>`).join('')}</select>${I('chevD')}</div>`)}
        ${fld('car-plate', 'Plate number', `<input id="car-plate" class="inp" value="${esc(v.plate)}" placeholder="ABC 1234" autocapitalize="characters" aria-describedby="car-plate-err">`)}
        ${fld('car-odo', 'Current odometer', `<div class="unit-wrap"><input id="car-odo" class="inp" inputmode="numeric" value="${esc(v.odometer)}" placeholder="48200" aria-describedby="car-odo-err"><span class="unit">km</span></div>`)}
      </div>
      ${tag('US01 Manage vehicle profile, Norah Alrougi')}
      <div class="actionbar"><p class="progress"><strong>${car ? 'Edit details' : 'New vehicle'}</strong>All fields are required</p><button type="button" class="primary" data-action="save-car" data-id="${car ? car.id : ''}" data-return="${esc(ret)}">Save vehicle</button></div>`;
  }
  function saveCar(btn) {
    const val = (id) => $(`#${id}`).value.trim();
    const plate = val('car-plate').toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]{3})(\d)/, '$1 $2');
    const odo = val('car-odo').replace(/[,\s]/g, '');
    const errs = {};
    if (!val('car-make')) errs['car-make'] = 'Enter the make.';
    if (!val('car-model')) errs['car-model'] = 'Enter the model.';
    if (!val('car-year')) errs['car-year'] = 'Choose the year.';
    if (!/^[A-Z]{3} \d{1,4}$/.test(plate)) errs['car-plate'] = 'Use 3 letters and up to 4 digits, like ABC 1234.';
    if (!/^\d{1,6}$/.test(odo)) errs['car-odo'] = 'Enter the reading in km, numbers only.';
    ['car-make', 'car-model', 'car-year', 'car-plate', 'car-odo'].forEach((id) => setFieldErr(id, errs[id]));
    const first = ['car-make', 'car-model', 'car-year', 'car-plate', 'car-odo'].find((id) => errs[id]);
    if (first) { $(`#${first}`).focus(); return; }
    const cars = allCars();
    const data = { make: val('car-make'), model: val('car-model'), year: Number(val('car-year')), plate, odometer: Number(odo) };
    let id = btn.dataset.id;
    if (id) Object.assign(cars.find((c) => c.id === id), data);
    else { id = uid('v'); cars.push(Object.assign({ id, ownerId: me().id }, data)); }
    Store.set('cars', cars);
    toast('Vehicle saved');
    if (btn.dataset.return === 'book') { bk.carId = id; go('#/d/book'); } else go('#/d/cars');
  }

  /* ===== Service center side ===== */
  function meCenter() {
    const u = me();
    return (u && u.role === 'center' && centerById(u.centerId)) || getCenters()[0];
  }
  const centerStrip = (c) => `<div class="cstrip"><span>Signed in as</span><strong>${esc(c.name)}</strong></div>`;

  /* ===== US06 Manage booking requests (Norah Alrougi) ===== */
  let reqTab = 'new';
  function renderRequests() {
    setTop({ title: 'Booking requests' });
    const c = meCenter();
    const now = nowKey();
    const all = getBookings().filter((b) => b.centerId === c.id);
    const key = (b) => `${b.date} ${b.time}`;
    const pending = all.filter((b) => b.status === 'pending').sort((a, b) => (key(a) < key(b) ? -1 : 1));
    const upcoming = all.filter((b) => (b.status === 'accepted' || b.status === 'paid') && key(b) >= now).sort((a, b) => (key(a) < key(b) ? -1 : 1));
    const history = all.filter((b) => b.status === 'rejected' || b.status === 'cancelled' || ((b.status === 'accepted' || b.status === 'paid') && key(b) < now)).sort((a, b) => (key(a) < key(b) ? 1 : -1));
    const tabBtn = (id, label, n) => `<button type="button" role="tab" aria-selected="${reqTab === id}" data-action="reqtab" data-tab="${id}">${label}${n ? ` <span class="badge">${n}</span>` : ''}</button>`;
    const pillFor = (b) => `<span class="pill ${b.status}">${{ accepted: 'Accepted', paid: 'Paid', rejected: 'Declined', pending: 'Pending', cancelled: 'Cancelled' }[b.status]}</span>`;
    const schedule = (list) => {
      if (!list.length) return '';
      const days = [...new Set(list.map((b) => b.date))];
      return days.map((d) => `<h3 class="day-h">${esc(fmtDayLong(d))}</h3><ul class="sched">${list.filter((b) => b.date === d).map((b) => `
        <li><span class="s-when">${fmtTime(b.time)}</span><span class="s-what"><strong>${esc(SERVICE[b.issue].label)}</strong><span>${esc(carLabel(b))}, <span class="nw">${esc(b.ref)}</span></span></span>${pillFor(b)}</li>`).join('')}</ul>`).join('');
    };
    let body;
    if (reqTab === 'new') {
      body = pending.length ? `<ul class="rlist">${pending.map((b) => `
        <li class="rcard">
          <div class="r-top"><span class="lit">${lamp(b.issue)}</span><div class="r-title"><h3>${esc(SERVICE[b.issue].label)}</h3><p>${esc(fmtDay(b.date))}, ${fmtTime(b.time)}</p></div><span class="ref">${esc(b.ref)}</span></div>
          <dl class="kv"><dt>Car</dt><dd>${esc(carLabel(b))} ${plateHTML(carPlate(b))}</dd>${b.note ? `<dt>Details</dt><dd>${esc(b.note)}</dd>` : ''}</dl>
          <div class="r-actions"><button type="button" class="secondary" data-action="decline" data-b="${b.id}">Decline</button><button type="button" class="primary" data-action="accept" data-b="${b.id}">Accept</button></div>
        </li>`).join('')}</ul>` : '<div class="empty"><h2>No new requests</h2><p>New bookings from drivers appear here.</p></div>';
    } else if (reqTab === 'upcoming') {
      body = schedule(upcoming) || '<div class="empty"><h2>Nothing scheduled</h2><p>Accepted bookings appear here by day.</p></div>';
    } else {
      body = history.length ? `<ul class="sched" style="margin-top:12px">${history.map((b) => `<li><span class="s-when">${esc(fmtDay(b.date))}</span><span class="s-what"><strong>${esc(SERVICE[b.issue].label)}</strong><span>${esc(carLabel(b))}, <span class="nw">${esc(b.ref)}</span></span></span>${pillFor(b)}</li>`).join('')}</ul>`
        : '<div class="empty"><h2>No history yet</h2><p>Declined and finished bookings appear here.</p></div>';
    }
    view().innerHTML = `
      ${centerStrip(c)}
      <div class="tabs2" role="tablist" aria-label="Requests">${tabBtn('new', 'New', pending.length)}${tabBtn('upcoming', 'Upcoming', 0)}${tabBtn('history', 'History', 0)}</div>
      ${body}
      ${tag('US06 Manage booking requests and appointments, Norah Alrougi')}`;
  }
  function decide(btn, accept) {
    const b = getBookings().find((x) => x.id === btn.dataset.b);
    if (!b || b.status !== 'pending') return;
    if (accept) {
      b.status = 'accepted';
      b.acceptedAt = new Date().toISOString();
      toast('Request accepted. The driver gets a notification.');
    } else {
      b.status = 'rejected';
      const slots = getSlots();
      const s = slots.find((x) => x.id === b.slotId);
      if (s) { s.available = true; delete s.bookingId; Store.set('slots', slots); }
      toast('Request declined. The time is free again.');
    }
    saveBooking(b);
    emit('decided', b);
    refresh();
  }

  /* ===== US05 Manage available booking slots (Sara Alzannan) ===== */
  let slotDate = null;
  function slotDays() {
    const out = [];
    const t0 = new Date();
    t0.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 7; i++) { const d = new Date(t0); d.setDate(t0.getDate() + i); out.push(isoDate(d)); }
    return out;
  }
  function renderSlots() {
    setTop({ title: 'Available slots' });
    const c = meCenter();
    const days = slotDays();
    if (!slotDate || !days.includes(slotDate)) slotDate = days[0];
    const mine = getSlots().filter((s) => s.centerId === c.id);
    const daySlots = mine.filter((s) => s.date === slotDate).sort((a, b) => (a.time < b.time ? -1 : 1));
    const bookings = getBookings();
    view().innerHTML = `
      ${centerStrip(c)}
      <div class="dates pad" role="radiogroup" aria-label="Day">${days.map((d) => {
        const ds = mine.filter((s) => s.date === d);
        const free = ds.filter(isFree).length;
        const dt = parseISO(d);
        return `<button type="button" class="date" role="radio" data-action="slotday" data-date="${d}" aria-checked="${d === slotDate}"><span class="dow">${dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span><span class="dom">${dt.getDate()}</span><span class="mon">${ds.length ? `${free} free` : 'No slots'}</span></button>`;
      }).join('')}</div>
      <div class="slothead"><h2>${esc(fmtDayLong(slotDate))}</h2><button type="button" class="secondary small" data-action="add-slot">${I('plus')}Add slot</button></div>
      ${daySlots.length ? `<ul class="slist">${daySlots.map((s) => {
        const b = s.bookingId && s.bookingId !== 'phone' ? bookings.find((x) => x.id === s.bookingId) : null;
        const state = s.bookingId ? 'booked' : s.available === false ? 'closed' : 'free';
        const text = state === 'booked' ? (b ? `Booked, ${b.ref}` : 'Booked by phone') : state === 'closed' ? 'Closed for booking' : 'Free';
        return `<li class="srow ${state}"><span class="s-time">${fmtTime(s.time)}</span><span class="s-state">${esc(text)}</span>${state === 'booked'
          ? `<span class="lockic" title="Booked slots can’t be changed">${I('lock')}</span>`
          : `<label class="switch"><input type="checkbox" data-change="slot-open" data-s="${s.id}"${state === 'free' ? ' checked' : ''}><span class="track"></span><span class="sr">Open ${fmtTime(s.time)} for booking</span></label>
             <button type="button" class="icon-btn sm" data-action="edit-slot" data-s="${s.id}" aria-label="Edit ${fmtTime(s.time)}">${I('pencil')}</button>
             <button type="button" class="icon-btn sm" data-action="remove-slot" data-s="${s.id}" aria-label="Remove ${fmtTime(s.time)}">${I('trash')}</button>`}</li>`;
      }).join('')}</ul>` : '<div class="empty"><h2>No slots on this day</h2><p>Add the times you can take cars in.</p><button type="button" class="primary" data-action="add-slot">Add a slot</button></div>'}
      ${tag('US05 Manage available booking slots, Sara Alzannan')}`;
  }
  function openSlotSheet(slotId) {
    const c = meCenter();
    const s = slotId ? getSlots().find((x) => x.id === slotId) : null;
    const dates = [];
    const t0 = new Date();
    t0.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 14; i++) { const d = new Date(t0); d.setDate(t0.getDate() + i); dates.push(isoDate(d)); }
    const times = [];
    for (let h = 7; h <= 23; h++) [0, 30].forEach((m) => times.push(`${pad(h)}:${pad(m)}`));
    const selDate = s ? s.date : slotDate || dates[0];
    const selTime = s ? s.time : '09:00';
    openSheet(s ? 'Edit slot' : 'Add a slot', (body) => {
      body.innerHTML = `
        <h2 class="sheet-title">${s ? 'Edit slot' : 'Add a slot'}</h2>
        <p class="hint">${esc(c.name)}</p>
        <div class="fld"><label for="sl-date">Date</label><div class="select-wrap"><select id="sl-date">${dates.map((d) => `<option value="${d}"${d === selDate ? ' selected' : ''}>${esc(fmtDayLong(d))}</option>`).join('')}</select>${I('chevD')}</div></div>
        <div class="fld"><label for="sl-time">Time</label><div class="select-wrap"><select id="sl-time">${times.map((t) => `<option value="${t}"${t === selTime ? ' selected' : ''}>${fmtTime(t)}</option>`).join('')}</select>${I('chevD')}</div></div>
        <p class="msg err" id="sl-err" role="alert" hidden></p>
        <div class="sheet-actions"><button type="button" class="secondary" data-f="cancel">Cancel</button><button type="button" class="primary" data-f="save">Save slot</button></div>`;
    }, (e) => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      if (b.dataset.f === 'cancel') { closeSheet(); return; }
      const date = $('#sl-date').value;
      const time = $('#sl-time').value;
      const slots = getSlots();
      if (slots.some((x) => x.centerId === c.id && x.date === date && x.time === time && x.id !== slotId)) {
        const er = $('#sl-err');
        er.textContent = `There’s already a slot at ${fmtTime(time)} on ${fmtDay(date)}.`;
        er.hidden = false;
        return;
      }
      if (s) Object.assign(slots.find((x) => x.id === slotId), { date, time });
      else slots.push({ id: uid('s'), centerId: c.id, date, time, available: true });
      Store.set('slots', slots);
      slotDate = date;
      closeSheet();
      toast(s ? 'Slot updated' : 'Slot added');
      refresh();
    });
  }

  /* ===== Router ===== */
  const ROUTES = {
    '/': { render: renderLanding, nav: null },
    '/d/centers': { render: renderCenters, nav: 'driver', tab: 'centers' },
    '/d/book': { render: renderBook, nav: null },
    '/d/bookings': { render: renderBookings, nav: 'driver', tab: 'bookings' },
    '/d/pay': { render: renderPay, nav: null },
    '/d/invoice': { render: renderInvoice, nav: null },
    '/d/cars': { render: renderCars, nav: 'driver', tab: 'cars' },
    '/d/car': { render: renderCarForm, nav: null },
    '/c/requests': { render: renderRequests, nav: 'center', tab: 'requests' },
    '/c/slots': { render: renderSlots, nav: 'center', tab: 'slots' }
  };
  let current = { key: '/', q: new URLSearchParams() };
  let lastPath = null;
  function parsePath(h) {
    const clean = String(h || '').replace(/^#/, '') || '/';
    const [path, qs] = clean.split('?');
    return { clean, path, q: new URLSearchParams(qs || '') };
  }
  function go(target, replace) {
    const h = '#' + String(target).replace(/^#/, '');
    try {
      if (replace) history.replaceState(null, '', h); else history.pushState(null, '', h);
    } catch (e) { /* some viewers block address changes; the screen still changes below */ }
    route(h);
  }
  function route(target) {
    const { clean, path, q } = parsePath(target === undefined ? location.hash : target);
    lastPath = clean;
    const key = ROUTES[path] ? path : '/';
    const redirect = HOOKS.guard.reduce((r, f) => r || f(key, q), null);
    if (redirect && redirect !== key) { go(`#${redirect}`, true); return; }
    current = { key, q };
    closeSheet();
    document.documentElement.classList.toggle('on-landing', key === '/');
    ROUTES[key].render(q);
    renderNav(ROUTES[key].nav, ROUTES[key].tab);
    window.scrollTo(0, 0);
  }
  function refresh() {
    const y = window.scrollY;
    ROUTES[current.key].render(current.q);
    renderNav(ROUTES[current.key].nav, ROUTES[current.key].tab);
    window.scrollTo(0, y);
  }

  /* ===== Events ===== */
  const ACTIONS = {
    back: () => { if (backHref) go(backHref); },
    'go-home': () => go('#/'),
    role: (t) => { Store.set('cc_role', t.dataset.role); go(t.dataset.role === 'driver' ? '#/d/centers' : '#/c/requests'); },
    reset: () => { resetDemo(); toast('Demo data reset'); go('#/', true); },
    'open-filters': openFilters,
    'clear-filters': () => { filters = { minRating: 0, service: null, prices: [] }; Store.set('cc_filters', filters); refresh(); },
    'remove-filter': (t) => {
      if (t.dataset.key === 'rating') filters.minRating = 0;
      if (t.dataset.key === 'service') filters.service = null;
      if (t.dataset.key === 'prices') filters.prices = [];
      Store.set('cc_filters', filters);
      refresh();
    },
    pin: (t) => {
      $$('.mpin').forEach((p) => p.classList.toggle('on', p === t));
      const row = $(`#row-${t.dataset.center}`);
      if (!row) return;
      row.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      row.classList.add('flash');
      setTimeout(() => row.classList.remove('flash'), 1200);
    },
    'bk-issue': (t) => {
      const c = centerById(bk.centerId);
      if (t.getAttribute('aria-disabled') === 'true') {
        showMsg('issue', `${c.name} doesn’t offer ${SERVICE[t.dataset.issue].label}. Choose another problem or another center.`, 'info');
        return;
      }
      bk.issue = t.dataset.issue;
      $$('#bk-lamps .lamp').forEach((x) => x.setAttribute('aria-pressed', String(x === t)));
      clearMsg('issue');
      bkProgress();
    },
    'bk-date': (t) => { if (t.disabled) return; bk.date = t.dataset.date; bk.slotId = null; drawDates(); bkProgress(); },
    'bk-time': (t) => {
      if (t.disabled) return;
      bk.slotId = t.dataset.slot;
      $$('#bk-times .time').forEach((x) => x.setAttribute('aria-checked', String(x === t)));
      clearMsg('time');
      bkProgress();
    },
    'bk-send': bkSend,
    'as-center': (t) => { Store.set('cc_me', t.dataset.center); Store.set('cc_role', 'center'); reqTab = 'new'; go('#/c/requests'); },
    pay,
    'save-car': saveCar,
    reqtab: (t) => { reqTab = t.dataset.tab; refresh(); },
    accept: (t) => decide(t, true),
    decline: (t) => decide(t, false),
    slotday: (t) => { slotDate = t.dataset.date; refresh(); },
    'add-slot': () => openSlotSheet(null),
    'edit-slot': (t) => openSlotSheet(t.dataset.s),
    'remove-slot': (t) => {
      const slots = getSlots();
      const s = slots.find((x) => x.id === t.dataset.s);
      if (!s || s.bookingId) return;
      Store.set('slots', slots.filter((x) => x.id !== s.id));
      toast(`Removed ${fmtTime(s.time)}`);
      refresh();
    }
  };
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-go]');
    if (link && !link.closest('#sheet-root')) { e.preventDefault(); go(link.dataset.go); return; }
    const t = e.target.closest('[data-action]');
    if (!t || !ACTIONS[t.dataset.action]) return;
    if (t.closest('#sheet-root')) return;
    e.preventDefault();
    ACTIONS[t.dataset.action](t, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
    const pin = e.target.closest && e.target.closest('.mpin');
    if (pin && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ACTIONS.pin(pin); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    const k = t.dataset && t.dataset.change;
    if (!k) return;
    if (k === 'bk-car') {
      bk.carId = t.value;
      $$('#bk-cars .opt').forEach((o) => o.classList.toggle('is-checked', $('input', o).checked));
      clearMsg('car');
      bkProgress();
    } else if (k === 'bk-center') {
      bk.centerId = t.value || null;
      bk.date = null;
      bk.slotId = null;
      clearMsg('center');
      clearMsg('time');
      const c = centerById(bk.centerId);
      if (c && bk.issue && !offers(c, bk.issue)) {
        showMsg('issue', `${c.name} doesn’t offer ${SERVICE[bk.issue].label}. Choose the problem again.`, 'info');
        bk.issue = null;
      }
      drawCenterSelect();
      drawLamps();
      drawDates();
      bkProgress();
    } else if (k === 'pm') {
      payMethod = t.value;
      refresh();
      const again = $(`input[name="pm"][value="${payMethod}"]`);
      if (again) again.focus();
    } else if (k === 'me') {
      Store.set('cc_me', t.value);
      refresh();
      $('#me').focus();
    } else if (k === 'slot-open') {
      const slots = getSlots();
      const s = slots.find((x) => x.id === t.dataset.s);
      if (!s || s.bookingId) return;
      s.available = t.checked;
      Store.set('slots', slots);
      toast(t.checked ? `${fmtTime(s.time)} is open for booking` : `${fmtTime(s.time)} is closed for booking`);
      refresh();
    } else if (CHANGES[k]) CHANGES[k](t, e);
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.getAttribute && t.getAttribute('aria-invalid') === 'true' && $(`#${t.id}-err`)) setFieldErr(t.id, null);
    const k = t.dataset && t.dataset.input;
    if (!k) return;
    if (k === 'bk-note') { bk.note = t.value.slice(0, 200); $('#bk-counter').textContent = `${bk.note.length}/200`; }
    if (k === 'cc-num') { const d = t.value.replace(/\D/g, '').slice(0, 16); t.value = d.replace(/(\d{4})(?=\d)/g, '$1 '); }
    if (k === 'cc-exp') { const d = t.value.replace(/\D/g, '').slice(0, 4); t.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; }
    if (k === 'cc-cvv') { t.value = t.value.replace(/\D/g, '').slice(0, 4); }
    if (INPUTS[k]) INPUTS[k](t, e);
  });

  const fromAddress = () => { if (parsePath(location.hash).clean !== lastPath) route(location.hash); };
  window.addEventListener('popstate', fromAddress);
  window.addEventListener('hashchange', fromAddress);
  window.CC = {
    Store, $, $$, esc, pad, isoDate, parseISO, fmtDay, fmtDayLong, fmtTime, fmtSAR, round2, nowKey, uid, kmBetween, I, lamp,
    SERVICES, SERVICE, LEVELS, HOME, SLOT_TIMES, getCenters, liveCenters, centerById, getSlots, getBookings, getCars, allCars, getInvoices, getUsers,
    saveBooking, carName, carLabel, carPlate, plateHTML, priceFor, isMine, me, meCenter, hashPw, view, setTop, renderNav, toast, openSheet, closeSheet,
    tag, setFieldErr, placeNotches, mapSVG, go, refresh, ROUTES, ACTIONS, CHANGES, INPUTS, NAVS, BADGES, HOOKS, on, emit,
    start: () => { seed(); route(location.hash); }
  };
})();
