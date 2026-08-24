# Seven Ministries International — Education Management System

A modern, three-portal Education Management System built for Seven Ministries
International: a **Registrar (Admin)** portal, a **Teacher** portal, and a
**Student** portal.

## How to run it

No installation needed — it's a static site.

1. Unzip the folder.
2. Open `index.html` in any modern browser (Chrome, Edge, Safari, Firefox).
   - Or, for the smoothest experience, serve it locally, e.g.:
     ```
     cd sevenministries-ems
     python3 -m http.server 8080
     ```
     then visit `http://localhost:8080`.

All data (students, teachers, lessons, assignments, grades, fee payments) is
stored in the browser's `localStorage`, so the demo persists between visits
on the same browser/device. No server or database setup is required to try
it out.

## How the core workflow works

- **Fees → Portal ID.** A student has no login until the registrar records a
  fee payment for them. Doing so (Registrar → *Issue Student ID*) instantly
  generates a unique Portal ID and password for that student, tied to their
  class and subjects.
- **Teachers** sign in with IDs issued by the registrar, then can:
  - Publish **lesson plans** (title, objectives, content) per subject/class
  - Schedule **live online classes** (generates a shareable room link)
  - Post **assignments** with due dates and a max score
  - **Grade** student submissions with a score and written feedback
- **Students** sign in with their issued ID and can:
  - Browse **lessons** posted for their class/subjects
  - Join **live classes**
  - **Submit assignments** (and resubmit before grading)
  - View **grades and feedback**
  - View their digital **ID card**

## Demo credentials

| Role      | Portal ID     | Password   |
|-----------|---------------|------------|
| Registrar | `SMI-ADMIN`   | `admin123` |
| Teacher   | `SMI-T-101`   | `Grace247` |
| Student   | `SMI-S-1001`  | `Peace410` |

The login screen also shows these on-screen as a quick-start reference.

To start from a clean slate at any time, open the browser console on the
page and run:
```js
localStorage.removeItem("smi_ems_db_v1");
```
then refresh — the seed data (three sample students, three teachers, and a
handful of lessons/assignments) will be regenerated.

## Project structure

```
sevenministries-ems/
├── index.html          Landing page, login screen, and app shell
├── css/
│   └── styles.css      Full visual design system
├── js/
│   ├── data.js          Data layer (seed data + localStorage helpers)
│   └── app.js            Routing, auth, and all dashboard rendering
└── README.md
```

## Notes on taking this further

This build is a fully working front-end demo suitable for presenting the
concept, running a pilot, or as a foundation to connect to a real backend.
To move it into production you'd typically:

- Replace the `localStorage` data layer in `js/data.js` with real API calls
  to a backend (e.g. Node/Express, Django, Laravel) backed by a proper
  database (PostgreSQL/MySQL).
- Add real payment gateway integration (e.g. Paystack, Flutterwave, mobile
  money) for the fee-payment step that issues student IDs.
- Add real video conferencing for "Live Classes" (e.g. Zoom SDK, Jitsi, or
  Google Meet links) in place of the placeholder room links.
- Add password hashing, session tokens, and role-based server-side auth in
  place of the client-side demo authentication.
- Add file uploads for assignment submissions (currently text-only).
