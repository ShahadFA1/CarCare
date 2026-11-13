/* ===== US09 Maintenance reminders (Norah Alrougi) ===== */
(() => {
  const { Store, $, esc, I, view, setTop, toast, refresh, me, getCars, carName, SERVICE, SERVICES, fmtDay, parseISO, isoDate, uid, setFieldErr, ROUTES, ACTIONS, HOOKS, tag } = CC;
  const all = () => Store.get('reminders');
  const mine = () => { const u = me(); return u ? all().filter((r) => r.ownerId === u.id) : []; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const state = (r, car) => {
    const days = r.dueDate ? Math.round((parseISO(r.dueDate) - today()) / 86400000) : null;
    const km = r.dueKm != null && car ? r.dueKm - car.odometer : null;
    return { days, km, due: !r.done && ((days != null && days <= 7) || (km != null && km <= 500)) };
  };
  const when = (r) => [r.dueDate ? `by ${fmtDay(r.dueDate)}` : '', r.dueKm != null ? `at ${Number(r.dueKm).toLocaleString('en-US')} km` : ''].filter(Boolean).join(' or ');
  const left = (s) => [s.days == null ? '' : s.days < 0 ? `${-s.days} days late` : s.days === 0 ? 'due today' : `in ${s.days} days`,
    s.km == null ? '' : s.km < 0 ? `${(-s.km).toLocaleString('en-US')} km late` : `in ${s.km.toLocaleString('en-US')} km`].filter(Boolean).join(' or ');

  // Reminders due within 7 days or 500 km are shown at the top of My cars.
  HOOKS.carsTop.push((cars) => {
    const due = mine().map((r) => ({ r, car: cars.find((c) => c.id === r.carId) })).filter(({ r, car }) => car && state(r, car).due);
    if (!due.length) return '';
    return `<div class="due" role="status"><strong>${I('bell')}Maintenance due soon</strong><ul>${due.map(({ r, car }) =>
      `<li><button type="button" class="link-btn" data-go="#/d/reminders?car=${car.id}">${esc(SERVICE[r.service].label)} for ${esc(carName(car))}</button>, ${esc(left(state(r, car)))}</li>`).join('')}</ul></div>`;
  });
  HOOKS.carTools.push((c) => `<button type="button" class="chip-btn" data-go="#/d/reminders?car=${c.id}">${I('bell')}Reminders</button>`);

  let editing = null;
  function renderReminders(q) {
    setTop({ title: 'Maintenance reminders', back: '#/d/cars' });
    const cars = getCars();
    const car = cars.find((c) => c.id === q.get('car')) || cars[0];
    if (!car) { view().innerHTML = '<div class="empty"><h2>No cars yet</h2><p>Add a car first, then set reminders for it.</p><button type="button" class="secondary" data-go="#/d/car?id=new">Add a vehicle</button></div>'; return; }
    const list = mine().filter((r) => r.carId === car.id).sort((a, b) => Number(a.done) - Number(b.done));
    const r = list.find((x) => x.id === editing) || null;
    view().innerHTML = `
      <div class="panel"><h2>${esc(carName(car))}</h2><p class="sub">${esc(car.plate)} · odometer ${Number(car.odometer).toLocaleString('en-US')} km</p></div>
      ${list.length ? `<ul class="blist">${list.map((x) => { const s = state(x, car); return `
        <li class="bk-row${s.due ? ' is-due' : ''}">
          <div class="b-top"><span class="b-title">${esc(SERVICE[x.service].label)}</span><span class="pill ${x.done ? 'paid' : s.due ? 'pending' : 'accepted'}">${x.done ? 'Done' : s.due ? 'Due soon' : 'Planned'}</span></div>
          <div class="b-sub">Due ${esc(when(x))}${x.done ? '' : `, ${esc(left(s))}`}</div>
          <div class="b-extra">${x.done ? '' : `<button type="button" class="secondary small" data-action="rm-done" data-r="${x.id}">Mark as done</button><button type="button" class="secondary small" data-action="rm-edit" data-r="${x.id}">Edit</button>`}<button type="button" class="secondary small danger" data-action="rm-del" data-r="${x.id}">Delete</button></div>
        </li>`; }).join('')}</ul>` : '<p class="form-note pad">No reminders for this car yet.</p>'}
      <div class="form">
        <h2 class="form-h">${r ? 'Edit reminder' : 'Add a reminder'}</h2>
        <div class="fld"><label for="rm-service">Service</label><div class="select-wrap"><select id="rm-service" class="inp" aria-describedby="rm-service-err"><option value="">Choose a service</option>${SERVICES.filter((s) => s.id !== 'other').map((s) => `<option value="${s.id}"${r && r.service === s.id ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select>${I('chevD')}</div><p class="ferr" id="rm-service-err" hidden></p></div>
        <div class="fld-row">
          <div class="fld"><label for="rm-date">Due date</label><input id="rm-date" class="inp" type="date" min="${isoDate(today())}" value="${r && r.dueDate ? r.dueDate : ''}" aria-describedby="rm-date-err"><p class="ferr" id="rm-date-err" hidden></p></div>
          <div class="fld"><label for="rm-km">Due odometer</label><div class="unit-wrap"><input id="rm-km" class="inp" inputmode="numeric" value="${r && r.dueKm != null ? r.dueKm : ''}" placeholder="${Number(car.odometer) + 5000}" aria-describedby="rm-km-err"><span class="unit">km</span></div><p class="ferr" id="rm-km-err" hidden></p></div>
        </div>
        <p class="form-note">Set a date, an odometer reading, or both.</p>
        <div class="f-actions">${r ? '<button type="button" class="secondary" data-action="rm-cancel">Cancel</button>' : ''}<button type="button" class="primary" data-action="rm-save" data-car="${car.id}" data-r="${r ? r.id : ''}">${r ? 'Save changes' : 'Add reminder'}</button></div>
      </div>
      ${tag('US09 Maintenance reminders, Norah Alrougi')}`;
  }
  function save(btn) {
    const service = $('#rm-service').value, date = $('#rm-date').value, kmRaw = $('#rm-km').value.replace(/[,\s]/g, '');
    const errs = {};
    if (!service) errs['rm-service'] = 'Choose the service.';
    if (kmRaw && !/^\d{1,6}$/.test(kmRaw)) errs['rm-km'] = 'Enter the reading in km, numbers only.';
    if (!date && !kmRaw) errs['rm-km'] = 'Set a due date or an odometer reading.';
    ['rm-service', 'rm-date', 'rm-km'].forEach((id) => setFieldErr(id, errs[id]));
    if (Object.keys(errs).length) return;
    const list = all();
    const data = { service, dueDate: date || null, dueKm: kmRaw ? Number(kmRaw) : null };
    const old = list.find((x) => x.id === btn.dataset.r);
    if (old) Object.assign(old, data, { done: false });
    else list.push(Object.assign({ id: uid('r'), ownerId: me().id, carId: btn.dataset.car, done: false }, data));
    Store.set('reminders', list);
    editing = null;
    toast(old ? 'Reminder updated' : 'Reminder added');
    refresh();
  }
  const update = (id, f) => { Store.set('reminders', all().map((x) => (x.id === id ? f(x) : x)).filter(Boolean)); refresh(); };

  ROUTES['/d/reminders'] = { render: renderReminders, nav: 'driver', tab: 'cars' };
  ACTIONS['rm-save'] = save;
  ACTIONS['rm-edit'] = (t) => { editing = t.dataset.r; refresh(); $('#rm-service').focus(); };
  ACTIONS['rm-cancel'] = () => { editing = null; refresh(); };
  ACTIONS['rm-done'] = (t) => { update(t.dataset.r, (x) => Object.assign(x, { done: true })); toast('Marked as done'); };
  ACTIONS['rm-del'] = (t) => { update(t.dataset.r, () => null); toast('Reminder deleted'); };
})();
