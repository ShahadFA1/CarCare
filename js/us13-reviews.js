/* ===== US13 Rate and review a service center (Norah Alrougi) ===== */
(() => {
  const { Store, $, $$, esc, I, view, setTop, toast, go, me, getBookings, getCenters, centerById, isMine, fmtDay, fmtTime, uid, round2, SERVICE, ROUTES, ACTIONS, INPUTS, HOOKS, tag } = CC;
  const all = () => Store.get('reviews');
  const reviewOf = (id) => all().find((r) => r.bookingId === id);
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  HOOKS.bookingExtra.push((b) => {
    if (!isMine(b) || b.status !== 'paid') return '';
    const r = reviewOf(b.id);
    return r ? `<span class="note"><span class="rev-stars">${stars(r.stars)}</span> You reviewed this visit.</span>`
      : `<button type="button" class="secondary small" data-go="#/d/review?b=${b.id}">${I('star')}Rate this visit</button>`;
  });
  HOOKS.invoiceExtra.push((b) => (isMine(b) && !reviewOf(b.id) ? `<button type="button" class="primary block" data-go="#/d/review?b=${b.id}">${I('star')}Rate this visit</button>` : ''));

  let picked = 0;
  function renderReview(q) {
    setTop({ title: 'Rate your visit', back: '#/d/bookings' });
    const b = getBookings().find((x) => x.id === q.get('b') && isMine(x));
    if (!b || b.status !== 'paid') { view().innerHTML = '<div class="empty"><h2>Not ready to rate</h2><p>You can rate a visit after it is paid.</p><button type="button" class="secondary" data-go="#/d/bookings">My bookings</button></div>'; return; }
    if (reviewOf(b.id)) { view().innerHTML = '<div class="empty"><h2>Already reviewed</h2><p>Each booking can be reviewed once.</p><button type="button" class="secondary" data-go="#/d/bookings">My bookings</button></div>'; return; }
    const c = centerById(b.centerId);
    picked = 0;
    view().innerHTML = `
      <div class="panel"><h2>${esc(c.name)}</h2><p class="sub">${esc(SERVICE[b.issue].label)} · ${esc(fmtDay(b.date))}, ${fmtTime(b.time)} · ${esc(b.ref)}</p></div>
      <div class="form">
        <fieldset class="fld"><legend>Your rating</legend>
          <div class="starpick" role="radiogroup" aria-label="Rating from 1 to 5 stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="starbtn" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? 's' : ''}" data-action="rv-star" data-n="${n}">★</button>`).join('')}</div>
          <p class="ferr" id="rv-star-err" hidden></p></fieldset>
        <div class="fld"><label for="rv-text">Comment (optional)</label><textarea id="rv-text" class="inp" rows="4" maxlength="300" data-input="rv-text" placeholder="How was the service?"></textarea><p class="counter" id="rv-count">0/300</p></div>
      </div>
      ${tag('US13 Rate and review a service center, Norah Alrougi')}
      <div class="actionbar"><p class="progress"><strong id="rv-sum">No rating yet</strong>One review per booking</p><button type="button" class="primary" data-action="rv-save" data-b="${b.id}">Submit review</button></div>`;
  }
  function pick(t) {
    picked = Number(t.dataset.n);
    $$('.starbtn').forEach((s) => { const n = Number(s.dataset.n); s.classList.toggle('on', n <= picked); s.setAttribute('aria-checked', String(n === picked)); });
    $('#rv-sum').textContent = `${picked} out of 5 stars`;
    $('#rv-star-err').hidden = true;
  }
  function save(btn) {
    const b = getBookings().find((x) => x.id === btn.dataset.b && isMine(x));
    if (!b || b.status !== 'paid' || reviewOf(b.id)) return;
    if (!picked) { const e = $('#rv-star-err'); e.textContent = 'Choose from 1 to 5 stars.'; e.hidden = false; return; }
    const comment = $('#rv-text').value.trim().slice(0, 300);
    Store.set('reviews', all().concat([{ id: uid('rv'), bookingId: b.id, centerId: b.centerId, userId: me().id, author: me().name, stars: picked, comment, createdAt: new Date().toISOString() }]));
    // The center's average rating and review count update right away.
    Store.set('centers', getCenters().map((c) => {
      if (c.id !== b.centerId) return c;
      const n = Number(c.reviews) || 0;
      return Object.assign(c, { rating: round2((Number(c.rating) * n + picked) / (n + 1)), reviews: n + 1 });
    }));
    toast('Thank you for your review');
    go(`#/d/center?c=${b.centerId}`);
  }
  ROUTES['/d/review'] = { render: renderReview, nav: null };
  ACTIONS['rv-star'] = pick;
  ACTIONS['rv-save'] = save;
  INPUTS['rv-text'] = (t) => { $('#rv-count').textContent = `${t.value.length}/300`; };
})();
