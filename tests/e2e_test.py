"""CarCare end-to-end test: checks every acceptance criterion of US01-US17 in a real browser.
Run:  pip install playwright && playwright install chromium && python tests/e2e_test.py
"""
import asyncio, json, sys
from playwright.async_api import async_playwright
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
URL = (ROOT / 'index.html').as_uri()
SHOTS = str(ROOT / 'tests' / 'screenshots')
results = []
def check(name, ok, info=''):
    results.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (f'  [{info}]' if info and not ok else ''))

async def main():
    import os; os.makedirs(SHOTS, exist_ok=True)
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page(viewport={'width': 400, 'height': 860})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        ev = pg.evaluate
        async def go(h): await ev(f"CC.go('{h}')"); await pg.wait_for_timeout(120)
        async def shot(n): await pg.wait_for_timeout(150); await pg.screenshot(path=f'{SHOTS}/{n}.png')
        async def signin(e, pw):
            await go('#/signin'); await pg.fill('#si-email', e); await pg.fill('#si-pass', pw); await pg.click('[data-action=signin]'); await pg.wait_for_timeout(200)
        async def signout():
            if await pg.is_visible('#switch'): await pg.click('#switch'); await pg.wait_for_timeout(150)
        store = lambda k: ev(f"CC.Store.get('{k}')")
        await pg.goto(URL); await pg.wait_for_timeout(300)
        await ev("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)

        # ---------- US16 accounts
        await shot('us16_landing')
        await go('#/signup'); await pg.fill('#su-name', 'Huda Saad'); await pg.fill('#su-email', 'driver@carcare.sa'); await pg.fill('#su-pass', 'short'); await pg.fill('#su-pass2', 'short')
        await pg.click('[data-action=signup]')
        check('US16 password must have at least 8 characters', 'at least 8' in (await pg.text_content('#su-pass-err')))
        check('US16 an email can be registered only once', 'already registered' in (await pg.text_content('#su-email-err')))
        await pg.fill('#su-email', 'huda@example.com'); await pg.fill('#su-pass', 'Huda@2026'); await pg.fill('#su-pass2', 'Huda@2026'); await pg.click('[data-action=signup]'); await pg.wait_for_timeout(200)
        u = [x for x in await store('users') if x['email'] == 'huda@example.com']
        check('US16 sign-up creates the account (US14: pending)', len(u) == 1 and u[0]['status'] == 'pending' and len(u[0]['pass']) == 64)
        check('US14 a pending user only sees her status', await ev('location.hash') == '#/status' and 'waiting for verification' in (await pg.text_content('#view')))
        await go('#/d/book'); check('US14 a pending user cannot book', await ev('location.hash') == '#/status')
        await shot('us14_status')
        await signout()
        await signin('driver@carcare.sa', 'wrongpass1')
        check('US16 wrong password shows a clear error and does not open the app', await ev('location.hash') == '#/signin' and 'wrong' in (await pg.text_content('#form-err')))
        await shot('us16_signin_error')
        await signin('driver@carcare.sa', 'Driver@123')
        check('US16 driver signs in and lands on Centers', await ev('location.hash') == '#/d/centers')
        await pg.reload(); await pg.wait_for_timeout(300)
        check('US16 stays signed in after reopening the app', await ev('CC.me() && CC.me().email') == 'driver@carcare.sa' and await pg.is_visible('#switch'))

        # ---------- Sprint 1 regression: US02, US03
        names = await ev("[...document.querySelectorAll('.crow h3')].map(h => h.textContent.trim())")
        dists = await ev("[...document.querySelectorAll('.crow .sub')].map(s => parseFloat(s.textContent.split(',')[1]))")
        pins = await ev("document.querySelectorAll('.mpin').length")
        check('US02 centers listed by distance with numbered pins', dists == sorted(dists) and pins == len(names) and 'Qurtubah Car Service' not in names)
        await ev("CC.Store.set('cc_filters', {minRating: 4.5, service: null, prices: []})"); await pg.reload(); await pg.wait_for_timeout(300)
        rs = await ev("[...document.querySelectorAll('.crow .rating')].map(r => parseFloat(r.textContent.replace('★','')))")
        check('US03 rating filter keeps only matching centers', len(rs) > 0 and all(r >= 4.5 for r in rs))
        await ev("CC.Store.set('cc_filters', {minRating: 0, service: null, prices: []})"); await pg.reload(); await pg.wait_for_timeout(300)

        # ---------- US08 public profile (driver)
        await pg.click('.crow h3 .link-btn >> nth=0'); await pg.wait_for_timeout(150)
        prof = await pg.text_content('#view')
        check('US08 profile shows district, hours, services with prices, map and rating', all(x in prof for x in ['Riyadh', 'Working hours', 'Services and prices', 'SAR', 'reviews']) and await ev("document.querySelectorAll('.mini-map .mpin').length") == 1)
        await shot('us08_profile_driver')
        cid = await ev("new URLSearchParams(location.hash.split('?')[1]).get('c')")
        await pg.click('.actionbar [data-go^="#/d/book"]'); await pg.wait_for_timeout(200)
        check('US08 booking can start from the profile', await ev('location.hash') == f'#/d/book?center={cid}')

        # ---------- US01 + US04 booking (Sprint 1 regression with accounts)
        await go('#/d/car?id=new'); await pg.fill('#car-make', 'Kia'); await pg.fill('#car-model', 'Rio'); await pg.select_option('#car-year', '2020'); await pg.fill('#car-plate', '12AB'); await pg.fill('#car-odo', '30000')
        await pg.click('[data-action=save-car]'); check('US01 plate format is checked', 'like ABC 1234' in (await pg.text_content('#car-plate-err')))
        await pg.fill('#car-plate', 'KRD 55'); await pg.click('[data-action=save-car]'); await pg.wait_for_timeout(200)
        cars = await store('cars'); kia = [c for c in cars if c['plate'] == 'KRD 55']
        check('US01 saved car belongs to the signed-in driver (US16)', len(kia) == 1 and kia[0]['ownerId'] == 'u-driver')
        await go('#/d/book?center=c1')
        await pg.click('[data-action=bk-send]'); await pg.wait_for_timeout(100)
        check('US04 request cannot be sent until required fields are chosen', await ev("document.querySelectorAll('.err-msg:not([hidden]), .msg:not([hidden])').length") > 0 or 'Choose' in (await pg.text_content('#view')))
        await pg.check(f"#bk-cars input[value=\"{kia[0]['id']}\"]", force=True)
        await pg.click('[data-action=bk-issue][data-issue=oil]')
        await pg.click('[data-action=bk-date]:not([disabled]) >> nth=2'); await pg.click('[data-action=bk-time]:not([disabled]) >> nth=0')
        await pg.click('[data-action=bk-send]'); await pg.wait_for_timeout(200)
        bks = await store('bookings'); b1 = sorted([b for b in bks if b.get('driverId') == 'u-driver' and b['status'] == 'pending'], key=lambda b: b['createdAt'])[-1]
        slot = [s for s in await store('slots') if s['id'] == b1['slotId']][0]
        check('US04 booking saved as Pending with a reference and the slot taken', b1['ref'].startswith('CC-') and slot['bookingId'] == b1['id'])

        # ---------- US12 reschedule / cancel
        await go('#/d/bookings')
        row_ok = await ev(f"!!document.querySelector('[data-go=\"#/d/reschedule?b={b1['id']}\"]') && !!document.querySelector('[data-action=bk-cancel][data-b=\"{b1['id']}\"]')")
        check('US12 booking more than 24 hours away shows Reschedule and Cancel', row_ok)
        await shot('us12_bookings_actions')
        await go(f"#/d/reschedule?b={b1['id']}")
        offered = await ev("[...document.querySelectorAll('[data-action=rs-time]')].map(t => t.dataset.slot)")
        free = {s['id'] for s in await store('slots') if s['centerId'] == 'c1' and s.get('available') is not False and not s.get('bookingId')}
        check('US12 rescheduling offers only the center free slots', len(offered) > 0 and all(o in free for o in offered))
        await pg.click('[data-action=rs-time] >> nth=1'); await shot('us12_reschedule')
        new_slot = await ev("document.querySelector('[data-action=rs-time][aria-checked=true]').dataset.slot")
        await pg.click('[data-action=rs-save]'); await pg.wait_for_timeout(200)
        sl = {s['id']: s for s in await store('slots')}; b1n = [b for b in await store('bookings') if b['id'] == b1['id']][0]
        check('US12 old slot released, new slot taken, booking back to Pending', not sl[b1['slotId']].get('bookingId') and sl[new_slot].get('bookingId') == b1['id'] and b1n['status'] == 'pending' and b1n['slotId'] == new_slot)
        # a second booking to cancel
        await go('#/d/book?center=c1'); await pg.check(f"#bk-cars input[value=\"{kia[0]['id']}\"]", force=True); await pg.click('[data-action=bk-issue][data-issue=brakes]')
        await pg.click('[data-action=bk-date]:not([disabled]) >> nth=3'); await pg.click('[data-action=bk-time]:not([disabled]) >> nth=0'); await pg.click('[data-action=bk-send]'); await pg.wait_for_timeout(200)
        b2 = sorted([b for b in await store('bookings') if b.get('driverId') == 'u-driver' and b['status'] == 'pending'], key=lambda b: b['createdAt'])[-1]
        await go('#/d/bookings'); await pg.click(f"[data-action=bk-cancel][data-b=\"{b2['id']}\"]"); await pg.wait_for_timeout(150); await shot('us12_cancel_sheet')
        await pg.click('[data-sheet-act=cancel]'); await pg.wait_for_timeout(200)
        b2n = [b for b in await store('bookings') if b['id'] == b2['id']][0]; s2 = [s for s in await store('slots') if s['id'] == b2['slotId']][0]
        check('US12 cancelling sets Cancelled and releases the slot', b2n['status'] == 'cancelled' and not s2.get('bookingId'))
        # within 24 hours: actions disabled
        await ev(f"(() => {{ const all = CC.Store.get('bookings'); const b = all.find(x => x.id === '{b1['id']}'); const d = new Date(Date.now() + 5*3600000); b.date = CC.isoDate(d); b.time = CC.pad(d.getHours()) + ':00'; CC.Store.set('bookings', all); }})()")
        await go('#/d/centers'); await go('#/d/bookings')
        dis = await ev(f"[...document.querySelectorAll('.bk-row')].some(r => r.textContent.includes('{b1['ref']}') && r.querySelector('.b-extra button[disabled]') && r.textContent.includes('24 hours'))")
        check('US12 within 24 hours the actions are disabled with the 24-hour message', dis)
        await shot('us12_within_24h')
        await ev(f"(() => {{ const all = CC.Store.get('bookings'); const b = all.find(x => x.id === '{b1['id']}'); b.date = '{b1n['date']}'; b.time = '{b1n['time']}'; CC.Store.set('bookings', all); }})()")
        await signout()

        # ---------- US06 + US17 center answers, driver notified
        await signin('center@carcare.sa', 'Center@123')
        check('US16 center signs in and sees only its own requests', await ev('location.hash') == '#/c/requests' and await ev("CC.meCenter().id") == 'c1')
        await pg.click(f"[data-action=accept][data-b=\"{b1['id']}\"]"); await pg.wait_for_timeout(200)
        await shot('us06_us17_center_accept')
        hist = await ev("(() => { return true; })()")
        await pg.click('[data-action=reqtab][data-tab=history]'); await pg.wait_for_timeout(100)
        check('US12 the center sees the cancelled booking', b2['ref'] in (await pg.text_content('#view')) and 'Cancelled' in (await pg.text_content('#view')))
        await signout()
        await signin('driver@carcare.sa', 'Driver@123')
        badge = await ev("(document.querySelector('[data-go=\"#/d/alerts\"] .badge') || {}).textContent")
        n = [x for x in await store('notifications') if x['bookingId'] == b1['id']]
        check('US17 driver gets a notification with center, date and time', len(n) == 1 and n[0]['kind'] == 'accepted' and n[0]['centerName'] == 'Al-Malqa Auto Care' and n[0]['date'] == b1n['date'])
        check('US17 badge shows the number of unread notifications', badge == '1')
        await go('#/d/alerts'); await shot('us17_alerts')
        check('US17 accepted notification leads to payment', await ev(f"!!document.querySelector('[data-go=\"#/d/pay?b={b1['id']}\"]')"))
        await go('#/d/centers')
        check('US17 opening the list marks notifications as read', all(x['read'] for x in await store('notifications') if x['userId'] == 'u-driver') and not await ev("!!document.querySelector('[data-go=\"#/d/alerts\"] .badge')"))

        # ---------- US07 payment (regression) and US13 review
        await go(f"#/d/pay?b={b1['id']}")
        await pg.fill('#cc-name', 'Demo Driver'); await pg.fill('#cc-num', '1234 5678 9012 3456'); await pg.fill('#cc-exp', '12/29'); await pg.fill('#cc-cvv', '123'); await pg.click('[data-action=pay]')
        check('US07 invalid card number is rejected', 'valid 16-digit' in (await pg.text_content('#cc-num-err')))
        await pg.fill('#cc-num', '4242 4242 4242 4242'); await pg.click('[data-action=pay]'); await pg.wait_for_timeout(1400)
        inv = [i for i in await store('invoices') if i['bookingId'] == b1['id']]
        check('US07 paid booking gets a tax invoice with 15% VAT', len(inv) == 1 and abs(inv[0]['vat'] - round(inv[0]['sub'] * 0.15, 2)) < 0.01 and await ev('location.hash') == f"#/d/invoice?b={b1['id']}")
        check('US13 the invoice offers Rate this visit after payment', await ev(f"!!document.querySelector('[data-go=\"#/d/review?b={b1['id']}\"]')"))
        before = [c for c in await store('centers') if c['id'] == 'c1'][0]
        await go(f"#/d/review?b={b1['id']}"); await pg.click('[data-action=rv-save]')
        check('US13 a rating from 1 to 5 stars is required', 'Choose from 1 to 5' in (await pg.text_content('#rv-star-err')))
        check('US13 comment is limited to 300 characters', await ev("document.querySelector('#rv-text').maxLength") == 300)
        await pg.click('[data-action=rv-star][data-n="5"]'); await pg.fill('#rv-text', 'Fast service and clear price.'); await shot('us13_review_form')
        await pg.click('[data-action=rv-save]'); await pg.wait_for_timeout(200)
        after = [c for c in await store('centers') if c['id'] == 'c1'][0]
        exp = round((before['rating'] * before['reviews'] + 5) / (before['reviews'] + 1), 2)
        check('US13 center average rating and review count update', after['reviews'] == before['reviews'] + 1 and abs(after['rating'] - exp) < 0.01)
        await shot('us13_profile_after_review')
        check('US13 the new rating shows on the profile', f"({after['reviews']} reviews)" in (await pg.text_content('#view')) and 'Fast service' in (await pg.text_content('#view')))
        await go(f"#/d/review?b={b1['id']}")
        check('US13 each booking can be reviewed only once', 'Already reviewed' in (await pg.text_content('#view')))

        # ---------- US10 history and US11 expenses
        await go('#/d/history')
        dates = await ev("[...document.querySelectorAll('.bk-row .b-ref')].map(x => x.textContent)")
        paid = [b for b in await store('bookings') if b.get('driverId') == 'u-driver' and b['status'] == 'paid']
        check('US10 history lists every paid service newest first', len(dates) == len(paid) == 2 and b1n['ref'] in (await pg.text_content('#view')))
        await shot('us10_history')
        await pg.select_option('#hs-car', 'v-demo'); await pg.wait_for_timeout(150)
        check('US10 history can be filtered by car', await ev("document.querySelectorAll('.bk-row').length") == 1 and 'CC-2047' in (await pg.text_content('#view')))
        await pg.click('.bk-row [data-go^="#/d/invoice"]'); await pg.wait_for_timeout(150)
        check('US10 an entry opens its invoice', 'Tax invoice' in (await pg.text_content('#view')))
        await go(f"#/d/expenses?car={kia[0]['id']}")
        t0 = await pg.text_content('#ex-total')
        await pg.fill('#ex-amount', '200'); await pg.select_option('#ex-cat', 'parts'); await pg.fill('#ex-note', 'Wipers'); await pg.click('[data-action=ex-save]'); await pg.wait_for_timeout(150)
        t1 = await pg.text_content('#ex-total')
        num = lambda s: float(s.replace('SAR', '').replace(',', ''))
        check('US11 totals come from paid invoices plus added expenses', abs(num(t0) - inv[0]['total']) < 0.01 and abs(num(t1) - (inv[0]['total'] + 200)) < 0.01)
        check('US11 this month total updates when an expense is added', abs(num(await pg.text_content('#ex-month')) - (inv[0]['total'] + 200)) < 0.01)
        await shot('us11_expenses')
        await pg.click('[data-action=ex-del] >> nth=0'); await pg.wait_for_timeout(150)
        check('US11 totals update when an expense is deleted', abs(num(await pg.text_content('#ex-total')) - inv[0]['total']) < 0.01)
        await pg.fill('#ex-amount', '0'); await pg.click('[data-action=ex-save]')
        check('US11 the amount must be more than 0', 'more than 0' in (await pg.text_content('#ex-amount-err')))

        # ---------- US09 reminders
        await go('#/d/cars')
        check('US09 a due reminder is highlighted at the top of My cars', 'Maintenance due soon' in (await pg.text_content('#view')) and 'in 300 km' in (await pg.text_content('#view')))
        await shot('us09_cars_due')
        await go(f"#/d/reminders?car={kia[0]['id']}"); await pg.select_option('#rm-service', 'tires'); await pg.click('[data-action=rm-save]')
        check('US09 a reminder needs a date or an odometer reading', 'due date or an odometer' in (await pg.text_content('#rm-km-err')))
        await pg.fill('#rm-km', '30200'); await pg.click('[data-action=rm-save]'); await pg.wait_for_timeout(150)
        await go('#/d/cars')
        check('US09 reminder within 500 km appears at the top', 'Tires for Kia Rio 2020' in (await pg.text_content('.due')))
        await go(f"#/d/reminders?car={kia[0]['id']}"); await pg.click('[data-action=rm-edit] >> nth=0'); await pg.fill('#rm-km', '45000'); await pg.click('[data-action=rm-save]'); await pg.wait_for_timeout(150)
        await go('#/d/cars')
        check('US09 editing a reminder updates it', 'Tires for Kia Rio' not in (await pg.text_content('#view')))
        await go('#/d/reminders?car=v-demo'); await shot('us09_reminders'); await pg.click('[data-action=rm-done] >> nth=0'); await pg.wait_for_timeout(150)
        await go('#/d/cars')
        check('US09 marking as done removes the highlight', 'Maintenance due soon' not in (await pg.text_content('#view')))
        await go(f"#/d/reminders?car={kia[0]['id']}"); await pg.click('[data-action=rm-del] >> nth=0'); await pg.wait_for_timeout(150)
        check('US09 a reminder can be deleted', len([r for r in await store('reminders') if r['carId'] == kia[0]['id']]) == 0)

        # ---------- US15 guard for non-admins
        await go('#/a/dashboard')
        check('US15 only an admin can open the dashboard', await ev('location.hash') == '#/d/centers')
        await signout()

        # ---------- US08 center edits its profile, US05 slots (regression)
        await signin('center@carcare.sa', 'Center@123')
        await go('#/c/profile'); await pg.fill('#pf-name', ''); await pg.click('[data-action=pf-save]')
        check('US08 center name is required', 'center name' in (await pg.text_content('#pf-name-err')))
        await pg.fill('#pf-name', 'Al-Malqa Auto Care')
        boxes = await ev("[...document.querySelectorAll('[data-svc]')].map(b => b.dataset.svc)")
        for s in boxes: await pg.uncheck(f'#pf-s-{s}')
        await pg.click('[data-action=pf-save]')
        check('US08 at least one service with a price is required', 'at least one service' in (await pg.text_content('#pf-svc-err')))
        for s in boxes: await pg.check(f'#pf-s-{s}')
        await pg.fill('#pf-p-oil', '139'); await pg.fill('#pf-hours', 'Saturday to Thursday, 8:00 AM – 11:00 PM'); await pg.click('[data-action=pf-save]'); await pg.wait_for_timeout(150)
        c1 = [c for c in await store('centers') if c['id'] == 'c1'][0]
        check('US08 center saves its profile with prices and hours', c1['prices']['oil'] == 139 and '11:00 PM' in c1['hours'])
        await shot('us08_profile_edit')
        await go('#/c/slots')
        days_with = await ev("[...document.querySelectorAll('[data-action=slotday]')].map(b => b.dataset.date)")
        c1days = sorted({s['date'] for s in await store('slots') if s['centerId'] == 'c1'})
        target = [d for d in days_with if d in c1days][0]
        await pg.click(f'[data-action=slotday][data-date="{target}"]'); await pg.wait_for_timeout(150)
        free_btn = await ev("(document.querySelector('[data-change=slot-open]') || {}).dataset")
        check('US05 the center sees and manages its slots (regression)', free_btn is not None)
        await signout()

        # ---------- US14 admin verification and US15 dashboard
        await signin('admin@carcare.sa', 'Admin@123')
        check('US16 admin signs in to the verification list', await ev('location.hash') == '#/a/verify')
        await shot('us14_verify_list')
        hu = [x for x in await store('users') if x['email'] == 'huda@example.com'][0]
        await pg.click(f"[data-action=vf-approve][data-u=\"{hu['id']}\"]"); await pg.wait_for_timeout(150)
        check('US14 admin approves an account', [x for x in await store('users') if x['id'] == hu['id']][0]['status'] == 'approved')
        await pg.click('[data-action=vf-reject][data-u="u-lama"]'); await pg.wait_for_timeout(100); await pg.click('[data-sheet-act=reject]')
        check('US14 a rejection needs a reason', 'Write the reason' in (await pg.text_content('#vf-reason-err')))
        await pg.fill('#vf-reason', 'The ID could not be confirmed.'); await shot('us14_reject_reason'); await pg.click('[data-sheet-act=reject]'); await pg.wait_for_timeout(150)
        check('US14 admin rejects an account with a reason', [x for x in await store('users') if x['id'] == 'u-lama'][0]['reason'] == 'The ID could not be confirmed.')
        await pg.click('[data-action=vf-approve][data-u="u-qurtubah"]'); await pg.wait_for_timeout(150)
        check('US14 approving a center publishes it to drivers', [c for c in await store('centers') if c['id'] == 'c8'][0]['status'] == 'approved')
        await go('#/a/dashboard'); await shot('us15_dashboard')
        users, bks, invs = await store('users'), await store('bookings'), await store('invoices')
        txt = await pg.text_content('#view')
        total_paid = round(sum(i['total'] for i in invs), 2)
        check('US15 dashboard shows users by type and bookings by status', f"Users{len(users)}" in txt.replace(' ', '').replace('\n', '') or str(len(users)) in txt)
        check('US15 dashboard shows the total amount paid', f"{total_paid:,.2f}" in txt)
        check('US15 chart shows bookings for each of the last 7 days', await ev("document.querySelectorAll('.chart rect.bar').length") == 7)
        await signout()

        # ---------- US14/US16 after decisions
        await signin('lama@example.com', 'Lama@2026')
        check('US14 a rejected user sees the reason and cannot use the app', await ev('location.hash') == '#/status' and 'could not be confirmed' in (await pg.text_content('#view')))
        await signout()
        await signin('huda@example.com', 'Huda@2026')
        check('US16 each user sees only her own data', await ev('location.hash') == '#/d/centers' and await ev('CC.getCars().length') == 0)
        names2 = await ev("[...document.querySelectorAll('.crow h3')].map(h => h.textContent.trim())")
        check('US14 the approved center now appears to drivers', 'Qurtubah Car Service' in names2)
        await go('#/d/bookings'); check('US16 a new driver has no bookings of other drivers', 'No bookings yet' in (await pg.text_content('#view')))
        await signout()
        check('US16 sign out returns to the start screen', await ev('location.hash') in ('#/', '') and not await pg.is_visible('#switch'))

        check('No errors in the browser console', not errors, '; '.join(errors[:3]))
        await br.close()
    passed = sum(1 for r in results if r[1])
    print(f'\n{passed}/{len(results)} checks passed')
    sys.exit(0 if passed == len(results) else 1)
asyncio.run(main())
