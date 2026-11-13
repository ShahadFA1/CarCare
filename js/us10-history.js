/* ===== US10 Maintenance history (Joud Aldhaban) ===== */
(() => {
  const { esc, I, view, setTop, go, getBookings, getInvoices, getCars, carName, centerById, isMine, fmtDay, fmtTime, fmtSAR, SERVICE, ROUTES, HOOKS, CHANGES, tag } = CC;
  HOOKS.carTools.push((c) => `<button type="button" class="chip-btn" data-go="#/d/history?car=${c.id}">${I('list')}History</button>`);

  function renderHistory(q) {
    setTop({ title: 'Maintenance history', back: '#/d/cars' });
    const cars = getCars();
    const sel = cars.some((c) => c.id === q.get('car')) ? q.get('car') : 'all';
    const invoices = getInvoices();
    const key = (b) => `${b.date} ${b.time}`;
    const rows = getBookings().filter((b) => isMine(b) && b.status === 'paid' && (sel === 'all' || b.carId === sel))
      .sort((a, b) => (key(a) < key(b) ? 1 : -1))
      .map((b) => ({ b, inv: invoices.find((i) => i.bookingId === b.id), c: centerById(b.centerId) }));
    view().innerHTML = `
      <div class="pagehead"><label for="hs-car" class="fld-label">Car</label><div class="select-wrap"><select id="hs-car" class="inp" data-change="hs-car"><option value="all">All my cars</option>${cars.map((c) => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(carName(c))}</option>`).join('')}</select>${I('chevD')}</div></div>
      ${rows.length ? `<ul class="blist">${rows.map(({ b, inv, c }) => `
        <li class="bk-row">
          <div class="b-top"><span class="b-ref">${esc(fmtDay(b.date))}, ${fmtTime(b.time)}</span><span class="b-amt">${inv ? fmtSAR(inv.total) : ''}</span></div>
          <div class="b-title">${esc(SERVICE[b.issue].label)} at ${esc(c ? c.name : 'the center')}</div>
          <div class="b-sub">${esc((b.car && b.car.name) || '')} · ${esc(b.ref)}</div>
          <div class="b-next"><span>Paid${inv ? `, ${esc(inv.no)}` : ''}</span><button type="button" class="text-btn" data-go="#/d/invoice?b=${b.id}">View invoice</button></div>
        </li>`).join('')}</ul>` : '<div class="empty"><h2>No maintenance yet</h2><p>Paid services appear here, newest first.</p></div>'}
      ${tag('US10 Maintenance history, Joud Aldhaban')}`;
  }
  CHANGES['hs-car'] = (t) => go(`#/d/history?car=${t.value}`, true);
  ROUTES['/d/history'] = { render: renderHistory, nav: 'driver', tab: 'cars' };
})();
