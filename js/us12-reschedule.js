/* ===== US12 Reschedule or cancel a booking (Renad Alqahtani) ===== */
(() => {
  const { Store, $, esc, view, setTop, toast, go, refresh, getBookings, getSlots, saveBooking, centerById, isMine, fmtDay, fmtTime, parseISO, nowKey, SERVICE, ROUTES, ACTIONS, HOOKS, openSheet, closeSheet, tag } = CC;
  const startOf = (b) => { const d = parseISO(b.date); const [h, m] = b.time.split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
  const canChange = (b) => (b.status === 'pending' || b.status === 'accepted') && (startOf(b) - Date.now()) / 3600000 > 24;
  const release = (slotId) => {
    const slots = getSlots();
    const s = slots.find((x) => x.id === slotId);
    if (s) { s.available = true; delete s.bookingId; Store.set('slots', slots); }
  };

  HOOKS.bookingExtra.push((b) => {
    if (!isMine(b) || (b.status !== 'pending' && b.status !== 'accepted')) return '';
    if (!canChange(b)) {
      return '<button type="button" class="secondary small" disabled>Reschedule</button><button type="button" class="secondary small" disabled>Cancel</button>'
        + '<span class="note">Changes are allowed only up to 24 hours before the appointment.</span>';
    }
    return `<button type="button" class="secondary small" data-go="#/d/reschedule?b=${b.id}">Reschedule</button>`
      + `<button type="button" class="secondary small danger" data-action="bk-cancel" data-b="${b.id}">Cancel</button>`;
  });

  let pick = { b: null, date: null, slot: null };
  function renderReschedule(q) {
    setTop({ title: 'Reschedule booking', back: '#/d/bookings' });
    const b = getBookings().find((x) => x.id === q.get('b') && isMine(x));
    if (!b || !canChange(b)) {
      view().innerHTML = '<div class="empty"><h2>This booking can’t be changed</h2><p>Changes are allowed only up to 24 hours before the appointment.</p><button type="button" class="secondary" data-go="#/d/bookings">My bookings</button></div>';
      return;
    }
    const c = centerById(b.centerId);
    const slots = getSlots().filter((s) => s.centerId === b.centerId && s.available !== false && !s.bookingId && `${s.date} ${s.time}` > nowKey())
      .sort((x, y) => (`${x.date} ${x.time}` < `${y.date} ${y.time}` ? -1 : 1));
    const days = [...new Set(slots.map((s) => s.date))];
    if (pick.b !== b.id) pick = { b: b.id, date: days[0] || null, slot: null };
    if (!days.includes(pick.date)) pick.date = days[0] || null;
    const chosen = slots.find((s) => s.id === pick.slot);
    view().innerHTML = `
      <div class="panel"><h2>${esc(SERVICE[b.issue].label)} at ${esc(c.name)}</h2><p class="sub">${esc(b.ref)} · now ${esc(fmtDay(b.date))}, ${fmtTime(b.time)}</p></div>
      <div class="form">
        <h2 class="form-h">Choose a new time</h2>
        <p class="form-note">Only this center’s free times are shown. Your current time is released for other drivers.</p>
        ${days.length ? `
          <div class="dates" role="radiogroup" aria-label="Day">${days.map((d) => { const dt = parseISO(d); return `<button type="button" class="date" role="radio" data-action="rs-date" data-date="${d}" aria-checked="${d === pick.date}"><span class="dow">${dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span><span class="dom">${dt.getDate()}</span><span class="mon">${dt.toLocaleDateString('en-GB', { month: 'short' })}</span></button>`; }).join('')}</div>
          <div class="times" role="radiogroup" aria-label="Time">${slots.filter((s) => s.date === pick.date).map((s) => `<button type="button" class="time" role="radio" data-action="rs-time" data-slot="${esc(s.id)}" aria-checked="${s.id === pick.slot}">${fmtTime(s.time)}</button>`).join('')}</div>`
          : '<div class="empty-inline"><p>This center has no other free times this week.</p></div>'}
        <p class="ferr" id="rs-err" role="alert" hidden></p>
      </div>
      ${tag('US12 Reschedule or cancel a booking, Renad Alqahtani')}
      <div class="actionbar"><p class="progress"><strong>${chosen ? `${esc(fmtDay(chosen.date))}, ${fmtTime(chosen.time)}` : 'New time'}</strong>${chosen ? 'The center will confirm the new time' : 'Not chosen yet'}</p><button type="button" class="primary" data-action="rs-save" data-b="${b.id}">Save new time</button></div>`;
  }
  function saveReschedule(btn) {
    const b = getBookings().find((x) => x.id === btn.dataset.b && isMine(x));
    if (!b || !canChange(b)) return;
    const slots = getSlots();
    const s = slots.find((x) => x.id === pick.slot && x.available !== false && !x.bookingId);
    if (!s) { const e = $('#rs-err'); e.textContent = 'Choose a new free time first.'; e.hidden = false; return; }
    release(b.slotId);
    const fresh = getSlots();
    const taken = fresh.find((x) => x.id === s.id);
    taken.available = false;
    taken.bookingId = b.id;
    Store.set('slots', fresh);
    Object.assign(b, { slotId: s.id, date: s.date, time: s.time, status: 'pending', rescheduledAt: new Date().toISOString() });
    delete b.acceptedAt;
    saveBooking(b);
    pick = { b: null, date: null, slot: null };
    toast(`Moved to ${fmtDay(b.date)}, ${fmtTime(b.time)}. Waiting for the center.`);
    go('#/d/bookings');
  }
  function askCancel(btn) {
    const b = getBookings().find((x) => x.id === btn.dataset.b && isMine(x));
    if (!b || !canChange(b)) return;
    openSheet('Cancel booking', (body) => {
      body.innerHTML = `<h2 class="sheet-h">Cancel booking ${esc(b.ref)}?</h2>
        <p class="sheet-p">${esc(SERVICE[b.issue].label)} on ${esc(fmtDay(b.date))}, ${fmtTime(b.time)}. The time will be free for other drivers.</p>
        <div class="r-actions"><button type="button" class="secondary" data-sheet-act="keep">Keep booking</button><button type="button" class="primary danger" data-sheet-act="cancel">Cancel booking</button></div>`;
    }, (e) => {
      const t = e.target.closest('[data-sheet-act]');
      if (!t) return;
      if (t.dataset.sheetAct === 'cancel') {
        release(b.slotId);
        Object.assign(b, { status: 'cancelled', cancelledAt: new Date().toISOString() });
        saveBooking(b);
        toast(`Booking ${b.ref} cancelled`);
      }
      closeSheet();
      refresh();
    });
  }

  ROUTES['/d/reschedule'] = { render: renderReschedule, nav: null };
  ACTIONS['rs-date'] = (t) => { pick.date = t.dataset.date; pick.slot = null; refresh(); };
  ACTIONS['rs-time'] = (t) => { pick.slot = t.dataset.slot; refresh(); };
  ACTIONS['rs-save'] = saveReschedule;
  ACTIONS['bk-cancel'] = askCancel;
})();
