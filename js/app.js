/* ============================================================
   Seven Ministries International — Education Management System
   App logic: routing, auth, dashboard rendering
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const SESSION_KEY = "smi_ems_session";
let state = { tab: null };

/* ---------- Utilities ---------- */

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function nl2br(str) {
  return escapeHtml(str).replace(/\n/g, "<br>");
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function formatDateTime(ts) {
  return new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function daysUntil(ts) {
  return Math.ceil((ts - Date.now()) / 86400000);
}
function initials(name) {
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}
function toast(msg) {
  const wrap = $("#toast-wrap");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast("Copied: " + text)).catch(() => {});
  }
}

const svg = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
  live: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  assign: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  grade: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 15a4 4 0 100-8 4 4 0 000 8z"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  cash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>`,
  id: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2.2"/><path d="M5 17c.6-2 2-3 3-3s2.4 1 3 3"/><path d="M14 9h5M14 13h5"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
};

/* ---------- View switching ---------- */

function showView(id) {
  ["view-public", "view-login", "view-app"].forEach(v => {
    $("#" + v).classList.toggle("app-hidden", v !== id);
  });
}

function goPublic() { showView("view-public"); window.scrollTo(0, 0); }

function goLogin(role) {
  showView("view-login");
  if (role) setLoginRole(role);
  $("#login-error").innerHTML = "";
  $("#login-form").reset();
  renderDemoCreds();
}

/* ---------- Login ---------- */

let selectedRole = "student";

function setLoginRole(role) {
  selectedRole = role;
  $all("#role-toggle button").forEach(b => b.classList.toggle("active", b.dataset.role === role));
  $("#login-id").placeholder = role === "student" ? "e.g. SMI-S-1001" : role === "teacher" ? "e.g. SMI-T-101" : "e.g. SMI-ADMIN";
  renderDemoCreds();
}

function renderDemoCreds() {
  const map = {
    student: { id: "SMI-S-1001", pw: "Peace410", label: "Demo Student" },
    teacher: { id: "SMI-T-101", pw: "Grace247", label: "Demo Teacher" },
    admin: { id: "SMI-ADMIN", pw: "admin123", label: "Registrar" },
  };
  const d = map[selectedRole];
  $("#demo-creds").innerHTML = `
    <div>Try the demo — ${d.label}:</div>
    <div class="row"><span>Portal ID</span><b>${d.id}</b></div>
    <div class="row"><span>Password</span><b>${d.pw}</b></div>
  `;
}

function handleLogin(e) {
  e.preventDefault();
  const id = $("#login-id").value.trim();
  const password = $("#login-password").value;
  const user = Data.findUser(id, password);
  if (!user) {
    $("#login-error").innerHTML = `<div class="form-error">We couldn't match that Portal ID and password. Please check your credentials or contact the registrar's office.</div>`;
    return;
  }
  if (user.role !== selectedRole) {
    $("#login-error").innerHTML = `<div class="form-error">That ID belongs to a ${user.role} account. Please switch tabs to "${user.role}" above.</div>`;
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id }));
  enterApp(user);
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  goPublic();
}

/* ---------- App shell ---------- */

function currentUser() {
  const s = sessionStorage.getItem(SESSION_KEY);
  if (!s) return null;
  try {
    const { id } = JSON.parse(s);
    return Data.getUserById(id);
  } catch (e) { return null; }
}

const NAV = {
  admin: [
    { id: "dashboard", label: "Overview", icon: svg.dashboard },
    { id: "enroll", label: "Issue Student ID", icon: svg.id },
    { id: "students", label: "Students", icon: svg.users },
    { id: "teachers", label: "Teachers", icon: svg.profile },
    { id: "payments", label: "Fee Payments", icon: svg.cash },
  ],
  teacher: [
    { id: "dashboard", label: "Overview", icon: svg.dashboard },
    { id: "lessons", label: "Lesson Plans", icon: svg.book },
    { id: "live", label: "Live Classes", icon: svg.live },
    { id: "assignments", label: "Assignments", icon: svg.assign },
    { id: "grading", label: "Grading", icon: svg.grade },
    { id: "profile", label: "My Profile", icon: svg.profile },
  ],
  student: [
    { id: "dashboard", label: "Overview", icon: svg.dashboard },
    { id: "lessons", label: "My Lessons", icon: svg.book },
    { id: "live", label: "Live Classes", icon: svg.live },
    { id: "assignments", label: "Assignments", icon: svg.assign },
    { id: "grades", label: "My Grades", icon: svg.grade },
    { id: "idcard", label: "My ID Card", icon: svg.id },
  ],
};

function enterApp(user) {
  showView("view-app");
  state.tab = "dashboard";

  $("#side-user").innerHTML = `
    <div class="avatar" style="background:${user.avatarColor || "#C9A24B"}">${initials(user.name)}</div>
    <div class="who"><b>${escapeHtml(user.name)}</b><span>${escapeHtml(user.id)}</span></div>
  `;

  const nav = NAV[user.role];
  $("#side-nav").innerHTML = nav.map(item => `
    <button data-tab="${item.id}">${item.icon}<span>${item.label}</span></button>
  `).join("");
  $all("#side-nav button").forEach(btn => btn.addEventListener("click", () => {
    state.tab = btn.dataset.tab;
    renderTab();
  }));

  renderTab();
}

function renderTab() {
  const user = currentUser();
  if (!user) return goPublic();
  $all("#side-nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === state.tab));
  if (user.role === "admin") renderAdmin(state.tab, user);
  if (user.role === "teacher") renderTeacher(state.tab, user);
  if (user.role === "student") renderStudent(state.tab, user);
}

function mainHead(eyebrow, title, sub) {
  return `<div class="main-head"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div></div>`;
}

function emptyState(title, sub) {
  return `<div class="empty-state">${svg.empty}<h4>${title}</h4><p>${sub}</p></div>`;
}

/* ---------- Modal helper ---------- */

function openModal(title, bodyHtml) {
  closeModal();
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.id = "active-modal";
  wrap.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>${title}</h3><button class="modal-close" data-close-modal>&times;</button></div>
      <div class="modal-body">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener("click", (e) => { if (e.target === wrap) closeModal(); });
  $all("[data-close-modal]", wrap).forEach(b => b.addEventListener("click", closeModal));
  return wrap;
}
function closeModal() {
  const m = $("#active-modal");
  if (m) m.remove();
}

/* ============================================================
   ADMIN (Registrar) VIEWS
   ============================================================ */

function renderAdmin(tab, user) {
  const db = Data.db();
  const main = $("#main-content");
  const students = db.users.filter(u => u.role === "student");
  const teachers = db.users.filter(u => u.role === "teacher");

  if (tab === "dashboard") {
    const totalCollected = db.feePayments.reduce((s, p) => s + p.amount, 0);
    main.innerHTML = `
      ${mainHead("Registrar's Office", "Institution Overview", "A snapshot of enrollment, staffing and fee collection across Seven Ministries International.")}
      <div class="stat-grid">
        <div class="stat-card"><div class="n">${students.length}</div><div class="l">Enrolled Students</div></div>
        <div class="stat-card"><div class="n">${teachers.length}</div><div class="l">Active Teachers</div></div>
        <div class="stat-card"><div class="n">GHS ${totalCollected.toLocaleString()}</div><div class="l">Fees Collected</div></div>
        <div class="stat-card"><div class="n">${db.feePayments.length}</div><div class="l">Payments Recorded</div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Recent Fee Payments</h3><p>Latest credentials issued upon payment</p></div>
          <button class="btn btn-gold btn-sm" data-tab-link="enroll">${svg.plus} Record Payment</button></div>
        <div class="list">
          ${db.feePayments.slice().reverse().slice(0, 6).map(p => `
            <div class="list-row">
              <div class="meta"><b>${escapeHtml(p.studentName)}</b><span>${escapeHtml(p.className)} · ${escapeHtml(p.term)} · ${formatDate(p.date)}</span></div>
              <span class="tag gold">GHS ${p.amount.toLocaleString()}</span>
            </div>`).join("") || `<div class="empty-state">${svg.empty}<h4>No payments yet</h4><p>Recorded fee payments will appear here.</p></div>`}
        </div>
      </div>`;
    $("[data-tab-link]")?.addEventListener("click", (e) => { state.tab = e.currentTarget.dataset.tabLink; renderTab(); });
    return;
  }

  if (tab === "enroll") {
    main.innerHTML = `
      ${mainHead("Registrar's Office", "Issue Student ID", "Record a fee payment to automatically generate a new portal ID and password for the student.")}
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><div><h3>New Fee Payment</h3><p>All fields required unless noted</p></div></div>
          <div class="panel-body">
            <form id="enroll-form">
              <div class="field"><label>Student Full Name</label><input required id="ef-name" placeholder="e.g. Abena Kufuor" /></div>
              <div class="field"><label>Class</label>
                <select id="ef-class" required>
                  <option value="">Select class</option>
                  <option>JHS 1</option><option>JHS 2</option><option>JHS 3</option>
                </select>
              </div>
              <div class="field"><label>Subjects Enrolled (comma separated)</label><input id="ef-subjects" placeholder="Mathematics, English Language, Integrated Science" /></div>
              <div class="field"><label>Guardian Name (optional)</label><input id="ef-guardian" placeholder="e.g. Mrs. Adjoa Kufuor" /></div>
              <div class="grid-2">
                <div class="field"><label>Amount Paid (GHS)</label><input type="number" min="0" required id="ef-amount" placeholder="850" /></div>
                <div class="field"><label>Term</label><input required id="ef-term" placeholder="Term 1, 2026" value="Term 1, 2026" /></div>
              </div>
              <button class="btn btn-gold btn-block" type="submit">Record Payment &amp; Issue ID</button>
            </form>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Issued Credentials</h3><p>Share these with the student securely</p></div></div>
          <div class="list" id="issued-list">
            ${emptyState("No new IDs issued this session", "Record a payment to generate a portal ID.")}
          </div>
        </div>
      </div>`;

    $("#enroll-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const studentName = $("#ef-name").value.trim();
      const className = $("#ef-class").value;
      const subjects = $("#ef-subjects").value.trim() || "Mathematics, English Language, Integrated Science";
      const guardian = $("#ef-guardian").value.trim();
      const amount = $("#ef-amount").value;
      const term = $("#ef-term").value.trim();
      if (!studentName || !className || !amount || !term) return;

      const newUser = Data.recordFeePaymentAndIssueId({ studentName, className, amount, term, guardian, subjects });
      toast(`Portal ID issued for ${newUser.name}`);

      const issuedList = $("#issued-list");
      if (issuedList.querySelector(".empty-state")) issuedList.innerHTML = "";
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `
        <div class="meta">
          <b>${escapeHtml(newUser.name)}</b>
          <span>ID: <b style="font-family:var(--mono)">${newUser.id}</b> &nbsp;·&nbsp; Password: <b style="font-family:var(--mono)">${newUser.password}</b></span>
        </div>
        <button class="btn btn-outline-dark btn-sm copy-btn">Copy</button>`;
      row.querySelector(".copy-btn").addEventListener("click", () => copyToClipboard(`Portal ID: ${newUser.id} | Password: ${newUser.password}`));
      issuedList.prepend(row);
      $("#enroll-form").reset();
      $("#ef-term").value = term;
    });
    return;
  }

  if (tab === "students") {
    main.innerHTML = `
      ${mainHead("Registrar's Office", "Enrolled Students", `${students.length} student${students.length === 1 ? "" : "s"} currently enrolled.`)}
      <div class="panel">
        <div class="list">
          ${students.map(s => `
            <div class="list-row">
              <div style="display:flex;align-items:center;gap:14px">
                <div class="avatar" style="width:36px;height:36px;font-size:13px;background:${s.avatarColor}">${initials(s.name)}</div>
                <div class="meta"><b>${escapeHtml(s.name)}</b><span>${escapeHtml(s.id)} · ${escapeHtml(s.className)} · ${(s.subjects || []).join(", ")}</span></div>
              </div>
              <span class="tag emerald">Fees ${escapeHtml(s.feesStatus || "paid")}</span>
            </div>`).join("") || emptyState("No students yet", "Issue a student ID from the Enroll tab.")}
        </div>
      </div>`;
    return;
  }

  if (tab === "teachers") {
    main.innerHTML = `
      ${mainHead("Registrar's Office", "Teaching Staff", "Add teachers and issue their portal credentials.")}
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>Add Teacher</h3></div>
          <div class="panel-body">
            <form id="teacher-form">
              <div class="field"><label>Full Name</label><input required id="tf-name" placeholder="e.g. Mr. Kofi Adjei" /></div>
              <div class="field"><label>Subject</label><input required id="tf-subject" placeholder="e.g. Social Studies" /></div>
              <div class="field"><label>Classes Taught (comma separated)</label><input required id="tf-classes" placeholder="JHS 1, JHS 2" /></div>
              <button class="btn btn-emerald btn-block" type="submit">Add Teacher &amp; Issue ID</button>
            </form>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Current Staff</h3></div>
          <div class="list" id="teacher-list">
            ${teachers.map(t => `
              <div class="list-row">
                <div class="meta"><b>${escapeHtml(t.name)}</b><span>${escapeHtml(t.id)} · ${escapeHtml(t.subject)} · ${(t.classes || []).join(", ")}</span></div>
              </div>`).join("")}
          </div>
        </div>
      </div>`;

    $("#teacher-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#tf-name").value.trim();
      const subject = $("#tf-subject").value.trim();
      const classes = $("#tf-classes").value.trim();
      if (!name || !subject || !classes) return;
      const t = Data.addTeacher({ name, subject, classes });
      toast(`Teacher ID ${t.id} issued for ${t.name}`);
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `<div class="meta"><b>${escapeHtml(t.name)}</b><span>ID: <b style="font-family:var(--mono)">${t.id}</b> · Password: <b style="font-family:var(--mono)">${t.password}</b></span></div>`;
      $("#teacher-list").prepend(row);
      $("#teacher-form").reset();
    });
    return;
  }

  if (tab === "payments") {
    main.innerHTML = `
      ${mainHead("Registrar's Office", "Fee Payment Log", `${db.feePayments.length} payment${db.feePayments.length === 1 ? "" : "s"} on record.`)}
      <div class="panel">
        <div class="list">
          ${db.feePayments.slice().reverse().map(p => `
            <div class="list-row">
              <div class="meta"><b>${escapeHtml(p.studentName)}</b><span>${escapeHtml(p.className)} · ${escapeHtml(p.term)} · ${formatDate(p.date)} · ID ${escapeHtml(p.studentId)}</span></div>
              <span class="tag gold">GHS ${p.amount.toLocaleString()}</span>
            </div>`).join("") || emptyState("No payments recorded", "")}
        </div>
      </div>`;
    return;
  }
}

/* ============================================================
   TEACHER VIEWS
   ============================================================ */

function renderTeacher(tab, user) {
  const db = Data.db();
  const main = $("#main-content");
  const myLessons = db.lessons.filter(l => l.teacherId === user.id);
  const myLive = db.liveClasses.filter(l => l.teacherId === user.id);
  const myAssignments = db.assignments.filter(a => a.teacherId === user.id);
  const mySubs = db.submissions.filter(s => myAssignments.some(a => a.id === s.assignmentId));
  const pendingGrading = mySubs.filter(s => s.grade === null || s.grade === undefined);

  if (tab === "dashboard") {
    main.innerHTML = `
      ${mainHead("Teacher Portal", `Welcome back, ${user.name.split(" ").slice(-1)[0]}`, `${user.subject} · Classes: ${(user.classes || []).join(", ")}`)}
      <div class="stat-grid">
        <div class="stat-card"><div class="n">${myLessons.length}</div><div class="l">Lesson Plans</div></div>
        <div class="stat-card"><div class="n">${myAssignments.length}</div><div class="l">Assignments Set</div></div>
        <div class="stat-card"><div class="n">${myLive.length}</div><div class="l">Live Classes</div></div>
        <div class="stat-card"><div class="n">${pendingGrading.length}</div><div class="l">Pending Grading</div></div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><div><h3>Upcoming Live Classes</h3></div><button class="btn btn-outline-dark btn-sm" data-tab-link="live">Manage</button></div>
          <div class="list">
            ${myLive.filter(l => l.scheduledAt > Date.now()).sort((a,b)=>a.scheduledAt-b.scheduledAt).slice(0,4).map(l => `
              <div class="list-row"><div class="meta"><b>${escapeHtml(l.title)}</b><span>${escapeHtml(l.className)} · ${formatDateTime(l.scheduledAt)}</span></div><span class="tag emerald">${l.durationMins} min</span></div>
            `).join("") || emptyState("Nothing scheduled", "Schedule a live class from the Live Classes tab.")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Needs Grading</h3></div><button class="btn btn-outline-dark btn-sm" data-tab-link="grading">Go to Grading</button></div>
          <div class="list">
            ${pendingGrading.slice(0,4).map(s => {
              const a = myAssignments.find(a => a.id === s.assignmentId);
              const stu = Data.getUserById(s.studentId);
              return `<div class="list-row"><div class="meta"><b>${escapeHtml(stu?.name || "Student")}</b><span>${escapeHtml(a?.title || "")}</span></div><span class="tag gold">Awaiting</span></div>`;
            }).join("") || emptyState("All caught up", "New submissions will appear here for grading.")}
          </div>
        </div>
      </div>`;
    $all("[data-tab-link]").forEach(b => b.addEventListener("click", (e) => { state.tab = e.currentTarget.dataset.tabLink; renderTab(); }));
    return;
  }

  if (tab === "lessons") {
    main.innerHTML = `
      ${mainHead("Teacher Portal", "Lesson Plans", "Build and share lesson plans by subject and class.")}
      <div class="panel">
        <div class="panel-head"><div><h3>${user.subject}</h3><p>${myLessons.length} lesson plan${myLessons.length===1?"":"s"}</p></div>
          <button class="btn btn-gold btn-sm" id="new-lesson-btn">${svg.plus} New Lesson Plan</button></div>
        <div class="panel-body">
          <div class="grid-3" id="lesson-grid">
            ${myLessons.length ? myLessons.map(l => lessonCard(l)).join("") : emptyState("No lesson plans yet", "Create your first lesson plan for a class.")}
          </div>
        </div>
      </div>`;

    $("#new-lesson-btn").addEventListener("click", () => openLessonModal(user));
    return;
  }

  if (tab === "live") {
    main.innerHTML = `
      ${mainHead("Teacher Portal", "Live Classes", "Schedule and manage your online lessons.")}
      <div class="panel">
        <div class="panel-head"><div><h3>Scheduled Sessions</h3></div>
          <button class="btn btn-gold btn-sm" id="new-live-btn">${svg.plus} Schedule Live Class</button></div>
        <div class="list">
          ${myLive.slice().sort((a,b)=>a.scheduledAt-b.scheduledAt).map(l => `
            <div class="list-row">
              <div class="meta"><b>${escapeHtml(l.title)}</b><span>${escapeHtml(l.className)} · ${formatDateTime(l.scheduledAt)} · ${l.durationMins} min</span></div>
              <a href="${l.link}" target="_blank" class="btn btn-outline-dark btn-sm">Room Link</a>
            </div>`).join("") || emptyState("No live classes scheduled", "Schedule one to teach your class online.")}
        </div>
      </div>`;
    $("#new-live-btn").addEventListener("click", () => openLiveModal(user));
    return;
  }

  if (tab === "assignments") {
    main.innerHTML = `
      ${mainHead("Teacher Portal", "Assignments", "Set assignments and see submission progress at a glance.")}
      <div class="panel">
        <div class="panel-head"><div><h3>${user.subject}</h3><p>${myAssignments.length} assignment${myAssignments.length===1?"":"s"}</p></div>
          <button class="btn btn-gold btn-sm" id="new-assign-btn">${svg.plus} New Assignment</button></div>
        <div class="panel-body">
          <div class="grid-3" id="assign-grid">
            ${myAssignments.length ? myAssignments.map(a => teacherAssignCard(a, db)).join("") : emptyState("No assignments yet", "Create your first assignment.")}
          </div>
        </div>
      </div>`;
    $("#new-assign-btn").addEventListener("click", () => openAssignmentModal(user));
    $all(".grade-link").forEach(b => b.addEventListener("click", (e) => {
      state.tab = "grading";
      state._gradingAssignmentId = e.currentTarget.dataset.assignId;
      renderTab();
    }));
    return;
  }

  if (tab === "grading") {
    const focusId = state._gradingAssignmentId;
    main.innerHTML = `
      ${mainHead("Teacher Portal", "Grading", "Review submissions and return feedback to students.")}
      <div class="panel">
        <div class="panel-head"><div><h3>Select Assignment</h3></div></div>
        <div class="panel-body">
          <div class="field" style="max-width:420px">
            <select id="grade-assign-select">
              ${myAssignments.map(a => `<option value="${a.id}" ${a.id===focusId?"selected":""}>${escapeHtml(a.title)} — ${escapeHtml(a.className)}</option>`).join("") || `<option>No assignments yet</option>`}
            </select>
          </div>
        </div>
      </div>
      <div class="panel" id="grading-panel"></div>`;

    function renderGradingList(assignmentId) {
      const assignment = myAssignments.find(a => a.id === assignmentId);
      const subs = db.submissions.filter(s => s.assignmentId === assignmentId);
      const panel = $("#grading-panel");
      if (!assignment) { panel.innerHTML = `<div class="panel-body">${emptyState("No assignment selected", "")}</div>`; return; }
      panel.innerHTML = `
        <div class="panel-head"><div><h3>${escapeHtml(assignment.title)}</h3><p>${subs.length} submission${subs.length===1?"":"s"} · Max score ${assignment.maxScore}</p></div></div>
        <div class="list">
          ${subs.map(s => {
            const stu = Data.getUserById(s.studentId);
            const graded = s.grade !== null && s.grade !== undefined;
            return `<div class="list-row">
              <div class="meta"><b>${escapeHtml(stu?.name || "Student")}</b><span>Submitted ${formatDateTime(s.submittedAt)}</span></div>
              <div style="display:flex;align-items:center;gap:10px">
                <span class="tag ${graded ? "emerald" : "gold"}">${graded ? `${s.grade}/${assignment.maxScore}` : "Awaiting grade"}</span>
                <button class="btn btn-outline-dark btn-sm review-btn" data-sub="${s.id}">${graded ? "Review" : "Grade"}</button>
              </div>
            </div>`;
          }).join("") || emptyState("No submissions yet", "Students who submit this assignment will appear here.")}
        </div>`;
      $all(".review-btn", panel).forEach(b => b.addEventListener("click", () => openGradeModal(b.dataset.sub, assignment)));
    }

    const select = $("#grade-assign-select");
    if (myAssignments.length) {
      const initial = focusId && myAssignments.some(a => a.id === focusId) ? focusId : myAssignments[0].id;
      select.value = initial;
      renderGradingList(initial);
      select.addEventListener("change", () => renderGradingList(select.value));
    } else {
      $("#grading-panel").innerHTML = `<div class="panel-body">${emptyState("No assignments to grade", "Create an assignment first.")}</div>`;
    }
    return;
  }

  if (tab === "profile") {
    main.innerHTML = `
      ${mainHead("Teacher Portal", "My Profile", "")}
      <div class="id-card-full">
        <div class="id-top"><span class="id-org">Seven Ministries International</span>
          <div class="seal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 4-8 4-8-4 8-4z"/><path d="M4 11v5c0 1.5 3.5 4 8 4s8-2.5 8-4v-5"/></svg></div>
        </div>
        <div class="avatar-lg" style="background:${user.avatarColor}">${initials(user.name)}</div>
        <h3>${escapeHtml(user.name)}</h3>
        <div class="role-line">Teacher · ${escapeHtml(user.subject)}</div>
        <div class="id-fields">
          <div>Classes<b>${(user.classes||[]).join(", ")}</b></div>
          <div>Staff Since<b>${formatDate(user.createdAt)}</b></div>
        </div>
        <div class="id-strip"></div>
        <div class="id-idnum">${user.id}</div>
      </div>`;
    return;
  }
}

function lessonCard(l) {
  return `<div class="lesson-card">
    <div class="top"><span class="badge-subject">${escapeHtml(l.subject)}</span><span class="tag">${escapeHtml(l.className)}</span></div>
    <h4>${escapeHtml(l.title)}</h4>
    <p class="content-preview">${escapeHtml(l.content)}</p>
    <div class="foot"><span>${escapeHtml(l.week || "")}</span><span>${formatDate(l.date)}</span></div>
  </div>`;
}

function teacherAssignCard(a, db) {
  const subs = db.submissions.filter(s => s.assignmentId === a.id);
  const graded = subs.filter(s => s.grade !== null && s.grade !== undefined).length;
  const overdue = a.dueDate < Date.now();
  return `<div class="assign-card">
    <div class="top"><span class="badge-subject">${escapeHtml(a.subject)}</span><span class="tag ${overdue ? "danger" : ""}">${escapeHtml(a.className)}</span></div>
    <h4>${escapeHtml(a.title)}</h4>
    <p class="content-preview">${escapeHtml(a.description)}</p>
    <div class="foot">
      <span>Due ${formatDate(a.dueDate)}</span>
      <span>${subs.length} submitted · ${graded} graded</span>
    </div>
    <button class="btn btn-outline-dark btn-sm grade-link" data-assign-id="${a.id}" style="margin-top:4px">Review Submissions</button>
  </div>`;
}

/* ---------- Teacher modals ---------- */

function openLessonModal(user) {
  const classes = user.classes || [];
  const body = `
    <form id="lesson-form">
      <div class="field"><label>Title</label><input required id="lf-title" placeholder="e.g. Fractions and Decimals" /></div>
      <div class="grid-2">
        <div class="field"><label>Class</label><select id="lf-class" required>${classes.map(c => `<option>${c}</option>`).join("")}</select></div>
        <div class="field"><label>Week / Label</label><input id="lf-week" placeholder="e.g. Week 8" /></div>
      </div>
      <div class="field"><label>Learning Objectives</label><textarea id="lf-objectives" placeholder="What should students be able to do after this lesson?" required></textarea></div>
      <div class="field"><label>Lesson Content</label><textarea id="lf-content" placeholder="Notes, explanations, worked examples..." required style="min-height:130px"></textarea></div>
      <button class="btn btn-gold btn-block" type="submit">Publish Lesson Plan</button>
    </form>`;
  openModal("New Lesson Plan", body);
  $("#lesson-form").addEventListener("submit", (e) => {
    e.preventDefault();
    Data.addLesson({
      teacherId: user.id, subject: user.subject,
      className: $("#lf-class").value, title: $("#lf-title").value.trim(),
      week: $("#lf-week").value.trim(), objectives: $("#lf-objectives").value.trim(),
      content: $("#lf-content").value.trim(),
    });
    toast("Lesson plan published");
    closeModal();
    renderTab();
  });
}

function openLiveModal(user) {
  const classes = user.classes || [];
  const body = `
    <form id="live-form">
      <div class="field"><label>Session Title</label><input required id="lvf-title" placeholder="e.g. Live: Revision Session" /></div>
      <div class="field"><label>Class</label><select id="lvf-class" required>${classes.map(c => `<option>${c}</option>`).join("")}</select></div>
      <div class="grid-2">
        <div class="field"><label>Date &amp; Time</label><input type="datetime-local" id="lvf-when" required /></div>
        <div class="field"><label>Duration (minutes)</label><input type="number" min="10" value="40" id="lvf-duration" required /></div>
      </div>
      <button class="btn btn-gold btn-block" type="submit">Schedule Class</button>
    </form>`;
  openModal("Schedule Live Class", body);
  $("#live-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const when = $("#lvf-when").value;
    if (!when) return;
    Data.addLiveClass({
      teacherId: user.id, subject: user.subject, className: $("#lvf-class").value,
      title: $("#lvf-title").value.trim(), scheduledAt: new Date(when).getTime(),
      durationMins: Number($("#lvf-duration").value),
    });
    toast("Live class scheduled");
    closeModal();
    renderTab();
  });
}

function openAssignmentModal(user) {
  const classes = user.classes || [];
  const body = `
    <form id="assign-form">
      <div class="field"><label>Title</label><input required id="af-title" placeholder="e.g. Chapter 4 Review Questions" /></div>
      <div class="grid-2">
        <div class="field"><label>Class</label><select id="af-class" required>${classes.map(c => `<option>${c}</option>`).join("")}</select></div>
        <div class="field"><label>Max Score</label><input type="number" min="1" value="10" id="af-max" required /></div>
      </div>
      <div class="field"><label>Instructions</label><textarea required id="af-desc" placeholder="What should students do?" style="min-height:110px"></textarea></div>
      <div class="field"><label>Due Date</label><input type="date" id="af-due" required /></div>
      <button class="btn btn-gold btn-block" type="submit">Post Assignment</button>
    </form>`;
  openModal("New Assignment", body);
  $("#assign-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const due = $("#af-due").value;
    if (!due) return;
    Data.addAssignment({
      teacherId: user.id, subject: user.subject, className: $("#af-class").value,
      title: $("#af-title").value.trim(), description: $("#af-desc").value.trim(),
      dueDate: new Date(due + "T23:59:00").getTime(), maxScore: Number($("#af-max").value),
    });
    toast("Assignment posted");
    closeModal();
    renderTab();
  });
}

function openGradeModal(submissionId, assignment) {
  const db = Data.db();
  const sub = db.submissions.find(s => s.id === submissionId);
  const stu = Data.getUserById(sub.studentId);
  const body = `
    <p class="eyebrow" style="margin-bottom:10px">${escapeHtml(stu?.name || "")}</p>
    <div class="panel-body" style="background:var(--ivory-dim);border-radius:8px;padding:16px;margin-bottom:18px;font-size:14px;line-height:1.6">${nl2br(sub.content)}</div>
    <form id="grade-form">
      <div class="grid-2">
        <div class="field"><label>Score (out of ${assignment.maxScore})</label><input type="number" min="0" max="${assignment.maxScore}" id="gf-score" value="${sub.grade ?? ""}" required /></div>
      </div>
      <div class="field"><label>Feedback</label><textarea id="gf-feedback" placeholder="Encouraging, specific feedback...">${escapeHtml(sub.feedback || "")}</textarea></div>
      <button class="btn btn-gold btn-block" type="submit">Save Grade</button>
    </form>`;
  openModal("Grade Submission", body);
  $("#grade-form").addEventListener("submit", (e) => {
    e.preventDefault();
    Data.gradeSubmission(submissionId, $("#gf-score").value, $("#gf-feedback").value.trim());
    toast("Grade saved");
    closeModal();
    renderTab();
  });
}

/* ============================================================
   STUDENT VIEWS
   ============================================================ */

function renderStudent(tab, user) {
  const db = Data.db();
  const main = $("#main-content");
  const mySubjects = user.subjects || [];
  const myLessons = db.lessons.filter(l => l.className === user.className && mySubjects.includes(l.subject));
  const myLive = db.liveClasses.filter(l => l.className === user.className && mySubjects.includes(l.subject));
  const myAssignments = db.assignments.filter(a => a.className === user.className && mySubjects.includes(a.subject));
  const mySubs = db.submissions.filter(s => s.studentId === user.id);
  const pending = myAssignments.filter(a => !mySubs.some(s => s.assignmentId === a.id));
  const graded = mySubs.filter(s => s.grade !== null && s.grade !== undefined);

  if (tab === "dashboard") {
    main.innerHTML = `
      ${mainHead("Student Portal", `Welcome back, ${user.name.split(" ")[0]}`, `${user.className} · ${mySubjects.join(", ")}`)}
      <div class="stat-grid">
        <div class="stat-card"><div class="n">${myLessons.length}</div><div class="l">Lessons Available</div></div>
        <div class="stat-card"><div class="n">${pending.length}</div><div class="l">Assignments Pending</div></div>
        <div class="stat-card"><div class="n">${myLive.filter(l=>l.scheduledAt>Date.now()).length}</div><div class="l">Upcoming Live Classes</div></div>
        <div class="stat-card"><div class="n" style="color:var(--emerald)">${escapeHtml(user.feesStatus || "paid")}</div><div class="l">Fees Status</div></div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><div><h3>Recent Lessons</h3></div><button class="btn btn-outline-dark btn-sm" data-tab-link="lessons">View all</button></div>
          <div class="list">
            ${myLessons.slice(0,4).map(l => `<div class="list-row"><div class="meta"><b>${escapeHtml(l.title)}</b><span>${escapeHtml(l.subject)} · ${formatDate(l.date)}</span></div></div>`).join("") || emptyState("No lessons yet", "Your teachers haven't posted lessons yet.")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Assignments Due Soon</h3></div><button class="btn btn-outline-dark btn-sm" data-tab-link="assignments">View all</button></div>
          <div class="list">
            ${pending.slice(0,4).map(a => `<div class="list-row"><div class="meta"><b>${escapeHtml(a.title)}</b><span>${escapeHtml(a.subject)}</span></div><span class="tag ${daysUntil(a.dueDate)<0?'danger':'gold'}">${daysUntil(a.dueDate)<0?"Overdue":"Due "+formatDate(a.dueDate)}</span></div>`).join("") || emptyState("All caught up", "No pending assignments right now.")}
          </div>
        </div>
      </div>`;
    $all("[data-tab-link]").forEach(b => b.addEventListener("click", (e) => { state.tab = e.currentTarget.dataset.tabLink; renderTab(); }));
    return;
  }

  if (tab === "lessons") {
    main.innerHTML = `
      ${mainHead("Student Portal", "My Lessons", `${user.className} · ${mySubjects.join(", ")}`)}
      <div class="grid-3">
        ${myLessons.length ? myLessons.map(l => `
          <div class="lesson-card">
            <div class="top"><span class="badge-subject">${escapeHtml(l.subject)}</span><span class="tag">${escapeHtml(l.week||"")}</span></div>
            <h4>${escapeHtml(l.title)}</h4>
            <p class="content-preview" style="-webkit-line-clamp: unset; max-height:none">${escapeHtml(l.objectives)}</p>
            <p class="content-preview" style="max-height:none">${escapeHtml(l.content)}</p>
            <div class="foot"><span>Posted</span><span>${formatDate(l.date)}</span></div>
          </div>`).join("") : emptyState("No lessons yet", "Check back once your teachers post lesson plans.")}
      </div>`;
    return;
  }

  if (tab === "live") {
    main.innerHTML = `
      ${mainHead("Student Portal", "Live Classes", "Join scheduled online lessons from your teachers.")}
      <div class="panel"><div class="list">
        ${myLive.slice().sort((a,b)=>a.scheduledAt-b.scheduledAt).map(l => {
          const upcoming = l.scheduledAt > Date.now();
          return `<div class="list-row">
            <div class="meta"><b>${escapeHtml(l.title)}</b><span>${escapeHtml(l.subject)} · ${formatDateTime(l.scheduledAt)} · ${l.durationMins} min</span></div>
            ${upcoming ? `<a href="${l.link}" target="_blank" class="btn btn-gold btn-sm">Join Class</a>` : `<span class="tag">Ended</span>`}
          </div>`;
        }).join("") || emptyState("No live classes scheduled", "Your teachers haven't scheduled any online lessons yet.")}
      </div></div>`;
    return;
  }

  if (tab === "assignments") {
    main.innerHTML = `
      ${mainHead("Student Portal", "Assignments", "Submit your work directly to your teacher for grading.")}
      <div class="grid-3">
        ${myAssignments.length ? myAssignments.map(a => {
          const sub = mySubs.find(s => s.assignmentId === a.id);
          const overdue = a.dueDate < Date.now() && !sub;
          const gradedNow = sub && sub.grade !== null && sub.grade !== undefined;
          return `<div class="assign-card">
            <div class="top"><span class="badge-subject">${escapeHtml(a.subject)}</span><span class="tag ${overdue?'danger':''}">${overdue?'Overdue':'Due '+formatDate(a.dueDate)}</span></div>
            <h4>${escapeHtml(a.title)}</h4>
            <p class="content-preview">${escapeHtml(a.description)}</p>
            <div class="foot">
              <span>${gradedNow ? `Grade: ${sub.grade}/${a.maxScore}` : sub ? "Submitted — awaiting grade" : "Not submitted"}</span>
              <span>Max ${a.maxScore}</span>
            </div>
            <button class="btn ${sub ? 'btn-outline-dark' : 'btn-gold'} btn-sm submit-btn" data-assign-id="${a.id}" style="margin-top:4px">${sub ? "View / Resubmit" : "Submit Work"}</button>
          </div>`;
        }).join("") : emptyState("No assignments yet", "Your teachers haven't posted assignments yet.")}
      </div>`;
    $all(".submit-btn").forEach(b => b.addEventListener("click", () => openSubmitModal(b.dataset.assignId, user)));
    return;
  }

  if (tab === "grades") {
    main.innerHTML = `
      ${mainHead("Student Portal", "My Grades", "Feedback and scores from your teachers.")}
      <div class="panel"><div class="list">
        ${graded.length ? graded.map(s => {
          const a = db.assignments.find(a => a.id === s.assignmentId);
          return `<div class="list-row">
            <div class="meta"><b>${escapeHtml(a?.title || "Assignment")}</b><span>${escapeHtml(a?.subject||"")} · ${escapeHtml(s.feedback || "No feedback given")}</span></div>
            <span class="tag emerald">${s.grade}/${a?.maxScore ?? "-"}</span>
          </div>`;
        }).join("") : emptyState("No grades yet", "Grades will appear here once your teachers mark your work.")}
      </div></div>`;
    return;
  }

  if (tab === "idcard") {
    main.innerHTML = `
      ${mainHead("Student Portal", "My ID Card", "Your official Seven Ministries International portal credential.")}
      <div class="id-card-full">
        <div class="id-top"><span class="id-org">Seven Ministries International</span>
          <div class="seal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 4-8 4-8-4 8-4z"/><path d="M4 11v5c0 1.5 3.5 4 8 4s8-2.5 8-4v-5"/></svg></div>
        </div>
        <div class="avatar-lg" style="background:${user.avatarColor}">${initials(user.name)}</div>
        <h3>${escapeHtml(user.name)}</h3>
        <div class="role-line">${escapeHtml(user.className)} · Enrolled Student</div>
        <div class="id-fields">
          <div>Guardian<b>${escapeHtml(user.guardian || "—")}</b></div>
          <div>Fees Status<b style="color:#8fd6b8">${escapeHtml(user.feesStatus || "paid")}</b></div>
          <div>Subjects<b>${(user.subjects||[]).join(", ")}</b></div>
          <div>Issued<b>${formatDate(user.createdAt)}</b></div>
        </div>
        <div class="id-strip"></div>
        <div class="id-idnum">${user.id}</div>
      </div>`;
    return;
  }
}

function openSubmitModal(assignmentId, user) {
  const db = Data.db();
  const assignment = db.assignments.find(a => a.id === assignmentId);
  const existing = db.submissions.find(s => s.assignmentId === assignmentId && s.studentId === user.id);
  const graded = existing && existing.grade !== null && existing.grade !== undefined;

  const body = `
    <p style="font-size:13.5px;color:var(--slate);margin-bottom:16px">${escapeHtml(assignment.description)}</p>
    ${graded ? `<div class="form-note">Graded: ${existing.grade}/${assignment.maxScore}${existing.feedback ? " — " + escapeHtml(existing.feedback) : ""}</div>` : ""}
    <form id="submit-form">
      <div class="field"><label>Your Answer</label><textarea id="sf-content" required style="min-height:160px" placeholder="Type your answer here...">${escapeHtml(existing?.content || "")}</textarea></div>
      <button class="btn btn-gold btn-block" type="submit">${existing ? "Resubmit" : "Submit"} Assignment</button>
    </form>`;
  openModal(assignment.title, body);
  $("#submit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    Data.submitAssignment(assignmentId, user.id, $("#sf-content").value.trim());
    toast("Assignment submitted");
    closeModal();
    renderTab();
  });
}

/* ============================================================
   INIT
   ============================================================ */

function init() {
  Data.db(); // ensure seeded

  $all("[data-goto-login]").forEach(b => b.addEventListener("click", () => goLogin(b.dataset.role)));
  $("[data-goto-public]").addEventListener("click", (e) => { e.preventDefault(); goPublic(); });
  $all("#role-toggle button").forEach(b => b.addEventListener("click", () => setLoginRole(b.dataset.role)));
  $("#login-form").addEventListener("submit", handleLogin);
  $("#logout-btn").addEventListener("click", logout);

  renderDemoCreds();

  const existing = currentUser();
  if (existing) enterApp(existing);
  else goPublic();
}

document.addEventListener("DOMContentLoaded", init);
