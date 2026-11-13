/* ===== US17 Booking status notifications (Norah Alrougi) ===== */
(() => {
  const { Store, esc, view, setTop, me, centerById, fmtDay, fmtTime, uid, ROUTES, BADGES, on, tag } = CC;
  const all = () => Store.get('notifications');
  const mine = () => { const u = me(); return u ? all().filter((n) => n.userId === u.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) : []; };

  // A center's answer creates a notification for the driver who booked.
  on('decided', (b) => {
    if (!b.driverId) return;
    const c = centerById(b.centerId);
    Store.set('notifications', all().concat([{
      id: uid('n'), userId: b.driverId, bookingId: b.id, ref: b.ref, kind: b.status === 'accepted' ? 'accepted' : 'declined',
      centerId: b.centerId, centerName: c ? c.name : 'The center', date: b.date, time: b.time, read: false, createdAt: new Date().toISOString()
    }]));
  });
  BADGES.driver.push(() => ({ alerts: mine().filter((n) => !n.read).length }));

  function renderAlerts() {
    setTop({ title: 'Alerts' });
    const list = mine();
    view().innerHTML = `
      ${list.length ? `<ul class="blist">${list.map((n) => `
        <li class="bk-row notif${n.read ? '' : ' unread'}">
          <div class="b-top"><span class="b-ref">${esc(n.ref)}${n.read ? '' : ' <span class="new">New</span>'}</span><span class="pill ${n.kind === 'accepted' ? 'accepted' : 'rejected'}">${n.kind === 'accepted' ? 'Accepted' : 'Declined'}</span></div>
          <div class="b-title">${esc(n.centerName)} ${n.kind === 'accepted' ? 'accepted' : 'declined'} your booking</div>
          <div class="b-sub">${esc(fmtDay(n.date))}, ${fmtTime(n.time)}</div>
          <div class="b-next"><span>${n.kind === 'accepted' ? 'Pay before your visit.' : 'Choose another time.'}</span>${n.kind === 'accepted'
            ? `<button type="button" class="text-btn" data-go="#/d/pay?b=${n.bookingId}">Pay now</button>`
            : `<button type="button" class="text-btn" data-go="#/d/book?center=${n.centerId}">Book another time</button>`}</div>
        </li>`).join('')}</ul>` : '<div class="empty"><h2>No alerts yet</h2><p>You get an alert when a center accepts or declines your booking.</p></div>'}
      ${tag('US17 Booking status notifications, Norah Alrougi')}`;
    // Opening the list marks the driver's alerts as read.
    const u = me();
    if (u && list.some((n) => !n.read)) Store.set('notifications', all().map((n) => (n.userId === u.id ? Object.assign(n, { read: true }) : n)));
  }
  ROUTES['/d/alerts'] = { render: renderAlerts, nav: 'driver', tab: 'alerts' };
})();
