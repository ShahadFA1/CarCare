# CarCare – Car Maintenance Management App

CS 388T Agile Software Development · Section 7C1 · Group 1 · Final delivery (Sprint 2)

CarCare connects drivers with car service centers. Drivers manage their cars, find and filter nearby centers, book a service, pay online and keep their maintenance records. Service centers manage their slots, booking requests and public profile. Admins verify new accounts and follow the platform on a dashboard.

## How to run

No installation is needed. Download the repository and open `index.html` in Chrome, Edge, Safari or Firefox. All data is saved in the browser, and **Reset demo data** on the start screen restores the demo.

| Account | Email | Password |
|---|---|---|
| Driver | driver@carcare.sa | Driver@123 |
| Service center (Al-Malqa Auto Care) | center@carcare.sa | Center@123 |
| Admin | admin@carcare.sa | Admin@123 |

For card payment use the test card **4242 4242 4242 4242**, any future expiry date and any 3 digits.

## Project structure

| File | Contents | Owner |
|---|---|---|
| `index.html` | Page layout, loads the style sheet and scripts | Shared |
| `css/style.css` | Visual style for every screen (light and dark mode) | Shared |
| `js/app.js` | Shared data layer (T0.1, T2), home screen and navigation (T0.2), Sprint 1 stories US01–US07 | Whole team |
| `js/us16-accounts.js` | US16 Create an account and sign in | Shahad Alhusayni |
| `js/us12-reschedule.js` | US12 Reschedule or cancel a booking | Renad Alqahtani |
| `js/us17-notifications.js` | US17 Booking status notifications | Norah Alrougi |
| `js/us09-reminders.js` | US09 Maintenance reminders | Norah Alrougi |
| `js/us10-history.js` | US10 Maintenance history | Joud Aldhaban |
| `js/us11-expenses.js` | US11 Vehicle expenses | Joud Aldhaban |
| `js/us08-center-profile.js` | US08 Service center public profile | Renad Alqahtani |
| `js/us13-reviews.js` | US13 Rate and review a service center | Norah Alrougi |
| `js/us14-verification.js` | US14 Verify new registrations | Sara Alzannan |
| `js/us15-dashboard.js` | US15 Admin dashboard | Sara Alzannan |
| `tests/e2e_test.py` | End-to-end test of all acceptance criteria | Joud Aldhaban |

## Stories in this release

| Sprint | Stories | Story points |
|---|---|---|
| Sprint 1 | US01 vehicle profile, US02 nearby centers, US03 filters, US04 booking, US05 slots, US06 booking requests, US07 payment and invoice | 41 |
| Sprint 2 | US16 accounts, US12 reschedule or cancel, US17 notifications, US09 reminders, US10 history, US11 expenses, US08 center profile, US13 reviews, US14 verification, US15 dashboard | 39 |

## Shared data

All screens read and write one shared data layer (`Store` in `js/app.js`) with these keys: `users`, `cars`, `centers`, `slots`, `bookings`, `invoices`, `notifications`, `reminders`, `expenses`, `reviews`. A booking moves through Pending, Accepted or Declined, Paid, or Cancelled.

## Testing

`tests/e2e_test.py` opens the app in a headless browser and checks every acceptance criterion of US01–US17, then reports the result of each check.

## Known limits

- Data is saved in the browser, so an account's data stays on one device. Cloud sync across devices is in the Product Backlog as US18.
- Card and Apple Pay payments are simulated, and the map is built into the app.
