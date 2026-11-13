/* ===== US15 Admin dashboard (Sara Alzannan) ===== */
(() => {
  const { esc, view, setTop, getUsers, getCenters, getBookings, getInvoices, isoDate, fmtSAR, round2, ROUTES, tag } = CC;
  const count = (list, f) => list.filter(f).length;

  function chart(days) {
    const max = Math.max(1, ...days.map((d) => d.n));
    const W = 320, H = 150, bw = 30, gap = (W - 7 * bw) / 8;
    return `<svg viewBox="0 0 ${W} ${H + 34}" role="img" aria-label="Bookings for each of the last 7 days: ${esc(days.map((d) => `${d.label} ${d.n}`).join(', '))}">
      <line x1="0" y1="${H}" x2="${W}" y2="${H}" class="axis"/>
      ${days.map((d, i) => { const h = Math.round((d.n / max) * (H - 24)); const x = gap + i * (bw + gap); return `
        <rect x="${x}" y="${H - h}" width="${bw}" height="${h}" rx="4" class="bar"/>
        <text x="${x + bw / 2}" y="${H - h - 6}" text-anchor="middle" class="val">${d.n}</text>
        <text x="${x + bw / 2}" y="${H + 16}" text-anchor="middle" class="lbl">${esc(d.dow)}</text>
        <text x="${x + bw / 2}" y="${H + 30}" text-anchor="middle" class="lbl2">${esc(d.dom)}</text>`; }).join('')}
    </svg>`;
  }
  function renderDashboard() {
    setTop({ title: 'Admin dashboard' });
    const users = getUsers(), centers = getCenters(), bookings = getBookings(), invoices = getInvoices();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = isoDate(d);
      days.push({ key, dow: d.toLocaleDateString('en-GB', { weekday: 'short' }), dom: `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`, label: `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`, n: count(bookings, (b) => b.createdAt && isoDate(new Date(b.createdAt)) === key) });
    }
    const box = (title, total, rows) => `<div class="stat"><small>${title}</small><b>${total}</b><ul>${rows.map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join('')}</ul></div>`;
    view().innerHTML = `
      <div class="stat-grid">
        ${box('Users', users.length, [['Drivers', count(users, (u) => u.role === 'driver')], ['Service centers', count(users, (u) => u.role === 'center')], ['Admins', count(users, (u) => u.role === 'admin')]])}
        ${box('Service centers', centers.length, [['Approved', count(centers, (c) => !c.status || c.status === 'approved')], ['Pending', count(centers, (c) => c.status === 'pending')], ['Rejected', count(centers, (c) => c.status === 'rejected')]])}
        ${box('Bookings', bookings.length, [['Pending', count(bookings, (b) => b.status === 'pending')], ['Accepted', count(bookings, (b) => b.status === 'accepted')], ['Declined', count(bookings, (b) => b.status === 'rejected')], ['Paid', count(bookings, (b) => b.status === 'paid')], ['Cancelled', count(bookings, (b) => b.status === 'cancelled')]])}
        ${box('Total paid', fmtSAR(round2(invoices.reduce((a, i) => a + Number(i.total), 0))), [['Invoices', invoices.length], ['Average', invoices.length ? fmtSAR(round2(invoices.reduce((a, i) => a + Number(i.total), 0) / invoices.length)) : fmtSAR(0)]])}
      </div>
      <div class="chart"><h2>Bookings in the last 7 days</h2>${chart(days)}</div>
      ${tag('US15 Admin dashboard, Sara Alzannan')}`;
  }
  ROUTES['/a/dashboard'] = { render: renderDashboard, nav: 'admin', tab: 'dashboard' };
})();
