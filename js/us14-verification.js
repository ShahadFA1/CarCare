/* ===== US14 Verify new registrations (Sara Alzannan) ===== */
(() => {
  const { Store, $, esc, I, view, setTop, toast, refresh, getUsers, getCenters, centerById, fmtDay, openSheet, closeSheet, ROUTES, ACTIONS, BADGES, tag } = CC;
  const roleName = (u) => (u.role === 'center' ? 'Service center' : 'Driver');
  BADGES.admin.push(() => ({ verify: getUsers().filter((u) => u.status === 'pending').length }));

  function renderVerify() {
    setTop({ title: 'Verify registrations' });
    const users = getUsers();
    const pending = users.filter((u) => u.status === 'pending').sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const decided = users.filter((u) => u.decidedAt).sort((a, b) => (a.decidedAt < b.decidedAt ? 1 : -1)).slice(0, 8);
    view().innerHTML = `
      ${pending.length ? `<ul class="rlist">${pending.map((u) => { const c = u.centerId && centerById(u.centerId); return `
        <li class="rcard">
          <div class="r-top"><span class="lit">${I(u.role === 'center' ? 'store' : 'user')}</span><div class="r-title"><h3>${esc(u.name)}</h3><p>${roleName(u)} · registered ${esc(fmtDay(u.createdAt.slice(0, 10)))}</p></div><span class="pill pending">Pending</span></div>
          <dl class="kv"><dt>Email</dt><dd>${esc(u.email)}</dd>${c ? `<dt>District</dt><dd>${esc(c.district)}</dd>` : ''}</dl>
          <div class="r-actions"><button type="button" class="secondary" data-action="vf-reject" data-u="${u.id}">Reject</button><button type="button" class="primary" data-action="vf-approve" data-u="${u.id}">Approve</button></div>
        </li>`; }).join('')}</ul>` : '<div class="empty"><h2>No accounts waiting</h2><p>New drivers and service centers appear here for checking.</p></div>'}
      ${decided.length ? `<h3 class="day-h">Recently checked</h3><ul class="sched">${decided.map((u) => `<li><span class="s-when">${esc(fmtDay(u.decidedAt.slice(0, 10)))}</span><span class="s-what"><strong>${esc(u.name)}</strong><span>${roleName(u)}${u.reason ? `, reason: ${esc(u.reason)}` : ''}</span></span><span class="pill ${u.status === 'approved' ? 'accepted' : 'rejected'}">${u.status === 'approved' ? 'Approved' : 'Rejected'}</span></li>`).join('')}</ul>` : ''}
      ${tag('US14 Verify new registrations, Sara Alzannan')}`;
  }
  function decide(id, status, reason) {
    const u = getUsers().find((x) => x.id === id);
    if (!u || u.status !== 'pending') return;
    Store.set('users', getUsers().map((x) => (x.id === id ? Object.assign(x, { status, reason: reason || '', decidedAt: new Date().toISOString() }) : x)));
    if (u.centerId) Store.set('centers', getCenters().map((c) => (c.id === u.centerId ? Object.assign(c, { status }) : c)));
    toast(status === 'approved' ? `${u.name} approved` : `${u.name} rejected`);
    refresh();
  }
  function askReject(t) {
    const u = getUsers().find((x) => x.id === t.dataset.u);
    if (!u) return;
    openSheet('Reject account', (body) => {
      body.innerHTML = `<h2 class="sheet-h">Reject ${esc(u.name)}?</h2>
        <div class="fld"><label for="vf-reason">Reason (required)</label><textarea id="vf-reason" class="inp" rows="3" maxlength="200" placeholder="For example: the commercial registration could not be confirmed"></textarea><p class="ferr" id="vf-reason-err" hidden></p></div>
        <div class="r-actions"><button type="button" class="secondary" data-sheet-act="back">Back</button><button type="button" class="primary danger" data-sheet-act="reject">Reject account</button></div>`;
    }, (e) => {
      const b = e.target.closest('[data-sheet-act]');
      if (!b) return;
      if (b.dataset.sheetAct === 'back') { closeSheet(); return; }
      const reason = $('#vf-reason').value.trim();
      if (!reason) { const er = $('#vf-reason-err'); er.textContent = 'Write the reason so the user knows what to fix.'; er.hidden = false; $('#vf-reason').focus(); return; }
      closeSheet();
      decide(u.id, 'rejected', reason);
    });
  }
  ROUTES['/a/verify'] = { render: renderVerify, nav: 'admin', tab: 'verify' };
  ACTIONS['vf-approve'] = (t) => decide(t.dataset.u, 'approved');
  ACTIONS['vf-reject'] = askReject;
})();
