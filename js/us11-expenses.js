/* ===== US11 Vehicle expenses (Joud Aldhaban) ===== */
(() => {
  const { Store, $, esc, I, view, setTop, toast, refresh, go, me, getCars, carName, getBookings, getInvoices, isMine, fmtDay, fmtSAR, round2, isoDate, uid, setFieldErr, SERVICE, ROUTES, ACTIONS, HOOKS, CHANGES, tag } = CC;
  const CATS = { fuel: 'Fuel', parts: 'Parts', insurance: 'Insurance', other: 'Other' };
  const all = () => Store.get('expenses');
  HOOKS.carTools.push((c) => `<button type="button" class="chip-btn" data-go="#/d/expenses?car=${c.id}">${I('wallet')}Expenses</button>`);

  // Spending = paid CarCare invoices for the car + expenses the driver adds herself.
  function entries(car) {
    const invoices = getInvoices();
    const services = getBookings().filter((b) => isMine(b) && b.status === 'paid' && b.carId === car.id).map((b) => {
      const inv = invoices.find((i) => i.bookingId === b.id);
      return { kind: 'service', id: b.id, date: isoDate(new Date(inv ? inv.issuedAt : b.paidAt || b.date)), label: `${SERVICE[b.issue].label} (CarCare)`, amount: inv ? inv.total : 0 };
    });
    const own = all().filter((e) => e.ownerId === me().id && e.carId === car.id).map((e) => ({ kind: 'own', id: e.id, date: e.date, label: CATS[e.category] + (e.note ? `: ${e.note}` : ''), amount: Number(e.amount) }));
    return services.concat(own).sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  function renderExpenses(q) {
    setTop({ title: 'Vehicle expenses', back: '#/d/cars' });
    const cars = getCars();
    const car = cars.find((c) => c.id === q.get('car')) || cars[0];
    if (!car) { view().innerHTML = '<div class="empty"><h2>No cars yet</h2><p>Add a car first, then record its expenses.</p><button type="button" class="secondary" data-go="#/d/car?id=new">Add a vehicle</button></div>'; return; }
    const list = entries(car);
    const month = isoDate(new Date()).slice(0, 7);
    const sum = (xs) => round2(xs.reduce((a, x) => a + x.amount, 0));
    const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });
    view().innerHTML = `
      <div class="pagehead"><label for="ex-car" class="fld-label">Car</label><div class="select-wrap"><select id="ex-car" class="inp" data-change="ex-car">${cars.map((c) => `<option value="${c.id}"${c.id === car.id ? ' selected' : ''}>${esc(carName(c))}</option>`).join('')}</select>${I('chevD')}</div></div>
      <div class="stat-grid">
        <div class="stat"><small>Total for this car</small><b id="ex-total">${fmtSAR(sum(list))}</b></div>
        <div class="stat"><small>${esc(monthName)} (this month)</small><b id="ex-month">${fmtSAR(sum(list.filter((x) => x.date.slice(0, 7) === month)))}</b></div>
        <div class="stat"><small>Services through CarCare</small><b>${fmtSAR(sum(list.filter((x) => x.kind === 'service')))}</b></div>
        <div class="stat"><small>Other expenses</small><b>${fmtSAR(sum(list.filter((x) => x.kind === 'own')))}</b></div>
      </div>
      ${list.length ? `<ul class="blist">${list.map((x) => `
        <li class="bk-row">
          <div class="b-top"><span class="b-ref">${esc(fmtDay(x.date))}</span><span class="b-amt">${fmtSAR(x.amount)}</span></div>
          <div class="b-title">${esc(x.label)}</div>
          ${x.kind === 'own' ? `<div class="b-extra"><button type="button" class="secondary small danger" data-action="ex-del" data-e="${x.id}">Delete</button></div>` : ''}
        </li>`).join('')}</ul>` : '<p class="form-note pad">No expenses for this car yet.</p>'}
      <div class="form">
        <h2 class="form-h">Add an expense</h2>
        <div class="fld-row">
          <div class="fld"><label for="ex-date">Date</label><input id="ex-date" class="inp" type="date" max="${isoDate(new Date())}" value="${isoDate(new Date())}" aria-describedby="ex-date-err"><p class="ferr" id="ex-date-err" hidden></p></div>
          <div class="fld"><label for="ex-cat">Category</label><div class="select-wrap"><select id="ex-cat" class="inp">${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>${I('chevD')}</div></div>
        </div>
        <div class="fld"><label for="ex-amount">Amount</label><div class="unit-wrap"><input id="ex-amount" class="inp" inputmode="decimal" placeholder="120" aria-describedby="ex-amount-err"><span class="unit">SAR</span></div><p class="ferr" id="ex-amount-err" hidden></p></div>
        <div class="fld"><label for="ex-note">Note (optional)</label><input id="ex-note" class="inp" maxlength="60" placeholder="For example: full tank"></div>
        <div class="f-actions"><button type="button" class="primary" data-action="ex-save" data-car="${car.id}">Add expense</button></div>
      </div>
      ${tag('US11 Vehicle expenses, Joud Aldhaban')}`;
  }
  function save(btn) {
    const date = $('#ex-date').value, amount = Number($('#ex-amount').value.replace(/,/g, ''));
    const errs = {};
    if (!date) errs['ex-date'] = 'Choose the date.';
    if (!(amount > 0) || amount > 100000) errs['ex-amount'] = 'Enter an amount in SAR, more than 0.';
    ['ex-date', 'ex-amount'].forEach((id) => setFieldErr(id, errs[id]));
    if (Object.keys(errs).length) return;
    Store.set('expenses', all().concat([{ id: uid('e'), ownerId: me().id, carId: btn.dataset.car, date, category: $('#ex-cat').value, amount: round2(amount), note: $('#ex-note').value.trim() }]));
    toast('Expense added');
    refresh();
  }
  CHANGES['ex-car'] = (t) => go(`#/d/expenses?car=${t.value}`, true);
  ROUTES['/d/expenses'] = { render: renderExpenses, nav: 'driver', tab: 'cars' };
  ACTIONS['ex-save'] = save;
  ACTIONS['ex-del'] = (t) => { Store.set('expenses', all().filter((e) => e.id !== t.dataset.e)); toast('Expense deleted'); refresh(); };
})();
