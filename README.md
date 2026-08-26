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

- **Enrollment happens on the website.** Families register through the
  enrolment form on sevenministriesint.com. This portal doesn't duplicate
  that form — instead, the Registrar's **Enrollments** tab shows submissions
  waiting on a fee payment (seeded here as sample data standing in for real
  website submissions).
- **Fees → Portal ID.** A student has no login until the registrar confirms
  a fee payment against one of those enrollments (Registrar → *Enrollments*
  → *Record Payment & Issue ID*), assigning a class and subjects along the
  way. Confirming the payment instantly generates a unique Portal ID and
  password for that student.
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
localStorage.removeItem("smi_ems_db_v3");
```
then refresh — the seed data (three sample students, three teachers, and a
handful of lessons/assignments) will be regenerated.

## Curriculum

Structured on the National Curriculum in England — Year 1 through Year 12
(Key Stages 1–4, plus a non-statutory Sixth Form pathway in Year 12). The
full Key Stage → subject mapping lives in `js/curriculum.js` and drives:
- the Year dropdown and subject checkboxes shown when the registrar
  confirms a fee payment (Registrar → Enrollments),
- the Year checkboxes on the "Add Teacher" form, and
- the read-only reference table on the Registrar's **Curriculum** tab.

## Project structure

```
sevenministries-ems/
├── index.html          Landing page, login screen, and app shell
├── assets/
│   └── logo.png          School logo (transparent PNG)
├── css/
│   └── styles.css      Full visual design system
├── js/
│   ├── curriculum.js     Year 1–12 / Key Stage / subject reference data
│   ├── data.js          Data layer (seed data + localStorage helpers)
│   └── app.js            Routing, auth, and all dashboard rendering
├── database/
│   ├── schema.sql        Full PostgreSQL schema for the real backend
│   └── README.md          How enrolments → fee payments → student IDs connect,
│                          and how each Data.* function maps to a real API call
└── README.md
```

## Notes on taking this further

This build is a fully working front-end demo suitable for presenting the
concept, running a pilot, or as a foundation to connect to a real backend.
The `database/` folder already has the real, runnable schema for that next
step — see `database/README.md` for exactly how it connects to
sevenministriesint.com's existing enrolment form and how each function in
`js/data.js` maps to a real API call. Beyond that, you'd typically:

- Replace the `localStorage` data layer in `js/data.js` with real API calls
  to a backend (e.g. Node/Express, Django, Laravel) backed by the
  PostgreSQL schema in `database/schema.sql`.
- Add real payment gateway integration (e.g. Paystack, Flutterwave, mobile
  money) so fee payments can be confirmed automatically instead of manually
  by the registrar.
- Add real video conferencing for "Live Classes" (e.g. Zoom SDK, Jitsi, or
  Google Meet links) in place of the placeholder room links.
- Add password hashing, session tokens, and role-based server-side auth in
  place of the client-side demo authentication (the schema already hashes
  auto-generated passwords with pgcrypto as a starting point).
- Add file uploads for assignment submissions (currently text-only).
