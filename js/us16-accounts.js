/* ===== US16 Create an account and sign in (Shahad Alhusayni) ===== */
(() => {
  const { Store, $, esc, I, view, setTop, toast, go, getUsers, getCenters, me, hashPw, setFieldErr, uid, HOME, ROUTES, ACTIONS, CHANGES, HOOKS, tag } = CC;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const homeFor = (u) => (!u ? '/' : u.status !== 'approved' ? '/status' : { driver: '/d/centers', center: '/c/requests', admin: '/a/verify' }[u.role]);
  const fld = (id, label, input) => `<div class="fld"><label for="${id}">${label}</label>${input}<p class="ferr" id="${id}-err" hidden></p></div>`;
  const inp = (id, type, attrs = '', value = '') => `<input id="${id}" class="inp" type="${type}" value="${esc(value)}" aria-describedby="${id}-err" ${attrs}>`;
  const formErr = (msg) => { const e = $('#form-err'); e.textContent = msg || ''; e.hidden = !msg; };

  // Only signed-in, approved users of the right type can open each side of the app.
  HOOKS.guard.push((key) => {
    const u = me();
    if (key === '/' || key === '/signin' || key === '/signup') return u ? homeFor(u) : null;
    if (key === '/status') return !u ? '/signin' : u.status === 'approved' ? homeFor(u) : null;
    const area = key.startsWith('/d/') ? 'driver' : key.startsWith('/c/') ? 'center' : key.startsWith('/a/') ? 'admin' : null;
    if (!area) return null;
    if (!u) return '/signin';
    if (u.status !== 'approved') return '/status';
    return u.role === area ? null : homeFor(u);
  });

  function renderSignIn() {
    setTop({ title: 'Sign in', back: '#/' });
    view().innerHTML = `
      <div class="form">
        ${fld('si-email', 'Email', inp('si-email', 'email', 'autocomplete="username" placeholder="name@example.com"'))}
        ${fld('si-pass', 'Password', inp('si-pass', 'password', 'autocomplete="current-password"'))}
        <p class="ferr" id="form-err" role="alert" hidden></p>
        <p class="form-note">New to CarCare? <button type="button" class="text-btn" data-go="#/signup">Create an account</button></p>
      </div>
      ${tag('US16 Create an account and sign in, Shahad Alhusayni')}
      <div class="actionbar"><p class="progress"><strong>Welcome back</strong>Drivers, service centers and admins</p><button type="button" class="primary" data-action="signin">Sign in</button></div>`;
  }
  function signIn() {
    const email = $('#si-email').value.trim().toLowerCase();
    const pw = $('#si-pass').value;
    setFieldErr('si-email', email ? null : 'Enter your email.');
    setFieldErr('si-pass', pw ? null : 'Enter your password.');
    formErr(null);
    if (!email || !pw) return;
    const u = getUsers().find((x) => x.email === email);
    if (!u || u.pass !== hashPw(email, pw)) {
      formErr('The email or password is wrong. Try again.');
      $('#si-pass').value = '';
      $('#si-pass').focus();
      return;
    }
    Store.set('cc_session', u.id);
    toast(`Signed in as ${u.name}`);
    go(`#${homeFor(u)}`);
  }

  let draft = { role: 'driver', name: '', district: '', email: '' };
  function renderSignUp() {
    setTop({ title: 'Create an account', back: '#/' });
    const center = draft.role === 'center';
    view().innerHTML = `
      <div class="form">
        ${fld('su-role', 'Account type', `<div class="select-wrap"><select id="su-role" class="inp" data-change="su-role"><option value="driver"${center ? '' : ' selected'}>Driver</option><option value="center"${center ? ' selected' : ''}>Service center</option></select>${I('chevD')}</div>`)}
        ${fld('su-name', center ? 'Service center name' : 'Full name', inp('su-name', 'text', 'autocomplete="name"', draft.name))}
        ${center ? fld('su-district', 'District', inp('su-district', 'text', 'placeholder="For example: Al-Malqa"', draft.district)) : ''}
        ${fld('su-email', 'Email', inp('su-email', 'email', 'autocomplete="email" placeholder="name@example.com"', draft.email))}
        ${fld('su-pass', 'Password', inp('su-pass', 'password', 'autocomplete="new-password" placeholder="At least 8 characters"'))}
        ${fld('su-pass2', 'Confirm password', inp('su-pass2', 'password', 'autocomplete="new-password"'))}
        <p class="ferr" id="form-err" role="alert" hidden></p>
        <p class="form-note">The CarCare team checks every new account before it can book or publish slots.</p>
      </div>
      ${tag('US16 Create an account and sign in, Shahad Alhusayni')}
      <div class="actionbar"><p class="progress"><strong>New account</strong>All fields are required</p><button type="button" class="primary" data-action="signup">Create account</button></div>`;
  }
  CHANGES['su-role'] = (t) => {
    draft = { role: t.value, name: $('#su-name').value, district: $('#su-district') ? $('#su-district').value : draft.district, email: $('#su-email').value };
    renderSignUp();
    $('#su-role').focus();
  };
  function signUp() {
    const role = $('#su-role').value;
    const val = (id) => ($(`#${id}`) ? $(`#${id}`).value.trim() : '');
    const email = val('su-email').toLowerCase();
    const pw = $('#su-pass').value, pw2 = $('#su-pass2').value;
    const errs = {};
    if (val('su-name').length < 2) errs['su-name'] = role === 'center' ? 'Enter the service center name.' : 'Enter your full name.';
    if (role === 'center' && !val('su-district')) errs['su-district'] = 'Enter the district.';
    if (!EMAIL.test(email)) errs['su-email'] = 'Enter a valid email, like name@example.com.';
    else if (getUsers().some((u) => u.email === email)) errs['su-email'] = 'This email is already registered. Sign in instead.';
    if (pw.length < 8) errs['su-pass'] = 'Use at least 8 characters.';
    if (pw !== pw2) errs['su-pass2'] = 'The passwords do not match.';
    const ids = ['su-name', 'su-district', 'su-email', 'su-pass', 'su-pass2'].filter((id) => $(`#${id}`));
    ids.forEach((id) => setFieldErr(id, errs[id]));
    const first = ids.find((id) => errs[id]);
    if (first) { $(`#${first}`).focus(); return; }
    const user = { id: uid('u'), role, name: val('su-name'), email, pass: hashPw(email, pw), status: 'pending', createdAt: new Date().toISOString() };
    if (role === 'center') {
      const centers = getCenters();
      const id = uid('c');
      const off = () => (Math.random() - 0.5) * 0.06;
      centers.push({ id, name: user.name, district: val('su-district'), rating: 0, reviews: 0, priceLevel: 2, services: [], prices: {}, hours: '', lat: HOME.lat + off(), lng: HOME.lng + off(), status: 'pending' });
      Store.set('centers', centers);
      user.centerId = id;
    }
    Store.set('users', getUsers().concat([user]));
    Store.set('cc_session', user.id);
    draft = { role: 'driver', name: '', district: '', email: '' };
    toast('Account created');
    go('#/status');
  }

  function renderStatus() {
    const u = me();
    setTop({ title: 'Account status' });
    const rejected = u.status === 'rejected';
    view().innerHTML = `
      <section class="confirm">
        <div class="confirm-icon ${rejected ? 'is-bad' : 'is-wait'}" aria-hidden="true">${I(rejected ? 'x' : 'clock')}</div>
        <h2>${rejected ? 'Your account was not approved' : 'Your account is waiting for verification'}</h2>
        <p class="lead">${rejected ? 'You can’t book or publish slots with this account.' : 'The CarCare team checks every new account. You can use CarCare as soon as it is approved.'}</p>
        <dl class="kv">
          <dt>Name</dt><dd>${esc(u.name)}</dd>
          <dt>Email</dt><dd>${esc(u.email)}</dd>
          <dt>Account type</dt><dd>${u.role === 'center' ? 'Service center' : 'Driver'}</dd>
          <dt>Status</dt><dd>${rejected ? 'Rejected' : 'Pending verification'}</dd>
          ${rejected ? `<dt>Reason</dt><dd>${esc(u.reason || 'Not given')}</dd>` : ''}
        </dl>
      </section>
      ${tag('US14 Verify new registrations, Sara Alzannan', 'US16 Create an account and sign in, Shahad Alhusayni')}`;
  }

  ROUTES['/signin'] = { render: renderSignIn, nav: null };
  ROUTES['/signup'] = { render: renderSignUp, nav: null };
  ROUTES['/status'] = { render: renderStatus, nav: null };
  ACTIONS.signin = signIn;
  ACTIONS.signup = signUp;
  ACTIONS.signout = () => { Store.remove('cc_session'); toast('Signed out'); go('#/'); };
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.closest) return;
    if (e.target.closest('#si-email, #si-pass')) { e.preventDefault(); signIn(); }
  });
})();
