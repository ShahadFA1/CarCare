/* ===== US08 Service center public profile (Renad Alqahtani) ===== */
(() => {
  const { Store, $, $$, esc, I, lamp, view, setTop, toast, refresh, getCenters, centerById, meCenter, getUsers, me, fmtDay, fmtSAR, SERVICE, SERVICES, LEVELS, mapSVG, setFieldErr, ROUTES, ACTIONS, tag } = CC;
  const priceOf = (c, s) => (c.prices && Number(c.prices[s]) > 0 ? Number(c.prices[s]) : Math.round(SERVICE[s].price * (LEVELS[c.priceLevel] || LEVELS[2]).factor));
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  // Driver view: the public profile, opened from the centers list or the map.
  function renderProfile(q) {
    setTop({ title: 'Service center', back: '#/d/centers' });
    const c = centerById(q.get('c'));
    if (!c || (c.status && c.status !== 'approved')) { view().innerHTML = '<div class="empty"><h2>Center not found</h2><p>Choose a center from the list.</p><button type="button" class="secondary" data-go="#/d/centers">Centers</button></div>'; return; }
    const reviews = Store.get('reviews').filter((r) => r.centerId === c.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);
    view().innerHTML = `
      <div class="panel">
        <h2 class="p-name">${esc(c.name)}</h2>
        <p class="sub">${esc(c.district)}, Riyadh</p>
        <div class="crow-meta"><span class="rating"><span class="star" aria-hidden="true">★</span> ${Number(c.rating).toFixed(1)} <small>(${c.reviews || 0} reviews)</small></span><span>${LEVELS[c.priceLevel] ? LEVELS[c.priceLevel].label : ''}</span></div>
        <dl class="kv"><dt>Working hours</dt><dd>${esc(c.hours || 'Not set yet')}</dd></dl>
      </div>
      <div class="panel"><h2>Services and prices</h2>
        <ul class="prices">${c.services.map((s) => `<li><span class="lit">${lamp(s)}</span><span>${esc(SERVICE[s].label)}</span><b>${fmtSAR(priceOf(c, s))}</b></li>`).join('')}</ul>
        <p class="form-note">Prices before 15% VAT.</p></div>
      <div class="panel"><h2>Location</h2><div class="mini-map">${mapSVG([Object.assign({ dist: 0 }, c)])}</div></div>
      <div class="panel"><h2>Recent reviews</h2>${reviews.length ? `<ul class="rev">${reviews.map((r) => `<li><div class="rev-top"><span class="rev-stars" aria-label="${r.stars} out of 5 stars">${stars(r.stars)}</span><small>${esc(r.author)}, ${esc(fmtDay(r.createdAt.slice(0, 10)))}</small></div>${r.comment ? `<p>${esc(r.comment)}</p>` : ''}</li>`).join('')}</ul>` : '<p class="sub">No written reviews yet.</p>'}</div>
      ${tag('US08 Service center public profile, Renad Alqahtani', 'US13 Rate and review a service center, Norah Alrougi')}
      <div class="actionbar"><p class="progress"><strong>${esc(c.name)}</strong>${c.services.length} services</p><button type="button" class="primary" data-go="#/d/book?center=${c.id}">Book here</button></div>`;
  }

  // Service center view: edit its own public profile.
  function renderEdit() {
    setTop({ title: 'Public profile' });
    const c = meCenter();
    view().innerHTML = `
      <div class="cstrip"><span>Signed in as</span><strong>${esc(c.name)}</strong></div>
      <div class="form">
        <div class="fld"><label for="pf-name">Center name</label><input id="pf-name" class="inp" value="${esc(c.name)}" aria-describedby="pf-name-err"><p class="ferr" id="pf-name-err" hidden></p></div>
        <div class="fld"><label for="pf-district">District</label><input id="pf-district" class="inp" value="${esc(c.district)}" aria-describedby="pf-district-err"><p class="ferr" id="pf-district-err" hidden></p></div>
        <div class="fld"><label for="pf-hours">Working hours</label><input id="pf-hours" class="inp" value="${esc(c.hours || '')}" placeholder="Saturday to Thursday, 9:00 AM – 10:00 PM"></div>
        <fieldset class="svc-edit"><legend>Services and prices (SAR, before VAT)</legend>
          ${SERVICES.filter((s) => s.id !== 'other').map((s) => { const on = c.services.includes(s.id); return `
            <label class="svc-row"><input type="checkbox" id="pf-s-${s.id}" data-svc="${s.id}"${on ? ' checked' : ''}><span class="lit">${lamp(s.id)}</span><span>${esc(s.label)}</span></label>
            <input class="inp svc-price" id="pf-p-${s.id}" inputmode="numeric" aria-label="${esc(s.label)} price" value="${on ? priceOf(c, s.id) : ''}" placeholder="${priceOf(c, s.id)}">`; }).join('')}
        </fieldset>
        <p class="ferr" id="pf-svc-err" role="alert" hidden></p>
        <p class="form-note">Name, district and at least one service with a price are required. Drivers see this profile from the centers list and the map.</p>
        <div class="f-actions"><button type="button" class="primary" data-action="pf-save">Save profile</button></div>
      </div>
      ${tag('US08 Service center public profile, Renad Alqahtani')}`;
  }
  function save() {
    const name = $('#pf-name').value.trim(), district = $('#pf-district').value.trim();
    const errs = {};
    if (name.length < 2) errs['pf-name'] = 'Enter the center name.';
    if (!district) errs['pf-district'] = 'Enter the district.';
    ['pf-name', 'pf-district'].forEach((id) => setFieldErr(id, errs[id]));
    const services = [], prices = {};
    let bad = null;
    $$('[data-svc]').forEach((box) => {
      if (!box.checked) return;
      const id = box.dataset.svc, v = Number($(`#pf-p-${id}`).value.replace(/[,\s]/g, ''));
      if (!(v > 0) || v > 99999) bad = bad || `Enter a price for ${SERVICE[id].label}.`;
      services.push(id); prices[id] = Math.round(v);
    });
    if (!services.length) bad = 'Choose at least one service with a price.';
    const e = $('#pf-svc-err'); e.textContent = bad || ''; e.hidden = !bad;
    if (Object.keys(errs).length || bad) return;
    const c = meCenter();
    Store.set('centers', getCenters().map((x) => (x.id === c.id ? Object.assign(x, { name, district, hours: $('#pf-hours').value.trim(), services, prices }) : x)));
    const u = me();
    Store.set('users', getUsers().map((x) => (x.id === u.id ? Object.assign(x, { name }) : x)));
    toast('Profile saved');
    refresh();
  }
  ROUTES['/d/center'] = { render: renderProfile, nav: null };
  ROUTES['/c/profile'] = { render: renderEdit, nav: 'center', tab: 'profile' };
  ACTIONS['pf-save'] = save;
  document.addEventListener('change', (e) => {
    const box = e.target.closest && e.target.closest('[data-svc]');
    if (!box) return;
    const p = $(`#pf-p-${box.dataset.svc}`);
    if (box.checked && !p.value) p.value = p.placeholder;
  });
})();
