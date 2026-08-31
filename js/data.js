/* ============================================================
   Seven Ministries International — Education Management System
   Data Layer (localStorage-backed, no server required)
   ============================================================ */

const DB_KEY = "smi_ems_db_v4";

function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString().slice(-4);
}

function genId(role) {
  const pool = loadDB();
  const prefix = role === "teacher" ? "SMI-T" : "SMI-S";
  let n = role === "teacher" ? 100 + pool.users.filter(u => u.role === "teacher").length : 1000 + pool.users.filter(u => u.role === "student").length;
  let candidate;
  do {
    n++;
    candidate = `${prefix}-${n}`;
  } while (pool.users.some(u => u.id === candidate));
  return candidate;
}

function genEnrollmentId() {
  return "ENR-" + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString().slice(-4);
}

function genPassword() {
  const words = ["Grace", "Faith", "Wisdom", "Hope", "Truth", "Light", "Peace", "Honor"];
  const w = words[Math.floor(Math.random() * words.length)];
  return w + Math.floor(100 + Math.random() * 900);
}

function seedDB() {
  const now = Date.now();
  const day = 86400000;

  const db = {
    institution: {
      name: "Seven Ministries International",
      tagline: "Academic Excellence in the Light of Purpose",
      termsOfPayment: "Full term fees required before portal ID issuance.",
    },
    users: [
      { id: "SMI-ADMIN", role: "admin", name: "Registrar's Office", password: "admin123", createdAt: now },

      { id: "SMI-T-101", role: "teacher", name: "Mrs. Abena Owusu", password: "Grace247",
        subjects: ["Mathematics"], classes: ["Year 8", "Year 9"], bio: "12 years teaching secondary mathematics.",
        avatarColor: "#0E4D3C", createdAt: now },
      { id: "SMI-T-102", role: "teacher", name: "Mr. Daniel Boateng", password: "Faith583",
        subjects: ["English"], classes: ["Year 7", "Year 8"], bio: "Loves literature and public speaking.",
        avatarColor: "#7A4B21", createdAt: now },
      { id: "SMI-T-103", role: "teacher", name: "Ms. Linda Asante", password: "Hope931",
        subjects: ["Science"], classes: ["Year 8", "Year 9"], bio: "Science fair coordinator, 8 years experience.",
        avatarColor: "#1F3A5F", createdAt: now },

      { id: "SMI-S-1001", role: "student", name: "Kwame Mensah", password: "Peace410",
        className: "Year 8", guardian: "Mr. Samuel Mensah", feesStatus: "paid",
        subjects: ["Mathematics", "English", "Science", "Religious Education"], avatarColor: "#C9A24B", createdAt: now },
      { id: "SMI-S-1002", role: "student", name: "Ama Serwaa", password: "Light662",
        className: "Year 8", guardian: "Mrs. Grace Serwaa", feesStatus: "paid",
        subjects: ["Mathematics", "English", "Science", "Religious Education"], avatarColor: "#8E3B46", createdAt: now },
      { id: "SMI-S-1003", role: "student", name: "Yaw Owusu", password: "Truth205",
        className: "Year 7", guardian: "Mr. Isaac Owusu", feesStatus: "paid",
        subjects: ["English", "Religious Education"], avatarColor: "#3C5A78", createdAt: now },
    ],

    // Submissions from the enrolment form on sevenministriesint.com.
    // In production, a small API endpoint on that site inserts rows here
    // directly when a family submits the form — see database/README.md.
    enrollments: [
      { id: genEnrollmentId(), status: "pending", programType: "general",
        submittedAt: now - 4 * day,
        email: "adjoa.kufuor@example.com", guardianName: "Mrs. Adjoa Kufuor",
        phone: "+233 24 555 0142", address: "12 Ridge Avenue, Accra", country: "Ghana",
        childName: "Abena Kufuor", childDob: "2013-03-14", childAge: 13, suggestedYear: "Year 8",
        programOfInterest: "Online School", currentSchool: "", notes: "" },
      { id: genEnrollmentId(), status: "pending", programType: "general",
        submittedAt: now - 2 * day,
        email: "s.owusu@example.com", guardianName: "Mr. Samuel Owusu",
        phone: "+233 20 555 0198", address: "45 Liberation Road, Kumasi", country: "Ghana",
        childName: "Kojo Owusu", childDob: "2012-09-02", childAge: 13, suggestedYear: "Year 9",
        programOfInterest: "Online School", currentSchool: "", notes: "" },
      { id: genEnrollmentId(), status: "pending", programType: "after_school",
        submittedAt: now - 1 * day,
        email: "grace.mensah@example.com", guardianName: "Mrs. Grace Mensah",
        phone: "+233 27 555 0173", address: "8 Spintex Road, Accra", country: "Ghana",
        childName: "Nana Mensah", childDob: "2014-11-20", childAge: 11, suggestedYear: "Year 6",
        programOfInterest: "Coding Club", currentSchool: "Living Word Academy", notes: "" },
    ],

    feePayments: [
      { id: uid("PAY"), studentName: "Kwame Mensah", className: "Year 8", amount: 850, term: "Term 1, 2026", date: now - 20 * day, studentId: "SMI-S-1001" },
      { id: uid("PAY"), studentName: "Ama Serwaa", className: "Year 8", amount: 850, term: "Term 1, 2026", date: now - 18 * day, studentId: "SMI-S-1002" },
      { id: uid("PAY"), studentName: "Yaw Owusu", className: "Year 7", amount: 800, term: "Term 1, 2026", date: now - 10 * day, studentId: "SMI-S-1003" },
    ],

    lessons: [
      { id: uid("LSN"), teacherId: "SMI-T-101", subject: "Mathematics", className: "Year 8",
        title: "Introduction to Linear Equations", objectives: "Students will solve simple linear equations in one variable.",
        content: "A linear equation takes the form ax + b = c. Today we cover isolating the variable, balancing both sides, and checking solutions by substitution. Worked examples: 2x + 5 = 15;  3x - 4 = 11.",
        date: now - 6 * day, week: "Week 6" },
      { id: uid("LSN"), teacherId: "SMI-T-101", subject: "Mathematics", className: "Year 8",
        title: "Word Problems with Linear Equations", objectives: "Translate real-life scenarios into equations and solve them.",
        content: "We will practise converting statements like 'a number increased by 7 is 20' into 3n + 7 = 20 style equations, then solving for the unknown.",
        date: now - 1 * day, week: "Week 7" },
      { id: uid("LSN"), teacherId: "SMI-T-102", subject: "English", className: "Year 8",
        title: "Comprehension: Inferential Reading", objectives: "Identify implied meaning within a passage.",
        content: "Reading passage on 'The Village Well'. Students identify tone, implied cause-effect relationships, and infer character motivation from context clues.",
        date: now - 3 * day, week: "Week 7" },
      { id: uid("LSN"), teacherId: "SMI-T-103", subject: "Science", className: "Year 8",
        title: "States of Matter and Particle Theory", objectives: "Explain solid, liquid and gas behaviour using the particle model.",
        content: "Particles in solids are tightly packed and vibrate in place. In liquids they slide past each other. In gases they move freely with large spaces between them. Diagram provided in class.",
        date: now - 2 * day, week: "Week 7" },
    ],

    liveClasses: [
      { id: uid("LIVE"), teacherId: "SMI-T-101", subject: "Mathematics", className: "Year 8",
        title: "Live: Solving Word Problems Together", link: "https://meet.smi-ems.edu/room/mth-yr8-07",
        scheduledAt: now + 1 * day + 3 * 3600000, durationMins: 45 },
      { id: uid("LIVE"), teacherId: "SMI-T-103", subject: "Science", className: "Year 8",
        title: "Live: Particle Theory Q&A", link: "https://meet.smi-ems.edu/room/sci-yr8-07",
        scheduledAt: now + 2 * day + 2 * 3600000, durationMins: 30 },
    ],

    assignments: [
      { id: uid("ASG"), teacherId: "SMI-T-101", subject: "Mathematics", className: "Year 8",
        title: "Linear Equations Practice Set", description: "Solve questions 1-10 on page 44 of the workbook. Show all working steps.",
        dueDate: now + 3 * day, maxScore: 20, createdAt: now - 1 * day },
      { id: uid("ASG"), teacherId: "SMI-T-102", subject: "English", className: "Year 8",
        title: "Inferential Reading Response", description: "Write a half-page response inferring the narrator's feelings in 'The Village Well', citing two clues from the text.",
        dueDate: now + 5 * day, maxScore: 15, createdAt: now - 2 * day },
      { id: uid("ASG"), teacherId: "SMI-T-103", subject: "Science", className: "Year 8",
        title: "Particle Theory Diagram", description: "Draw and label particle arrangement for solid, liquid and gas. Add one sentence per state explaining particle movement.",
        dueDate: now - 1 * day, maxScore: 10, createdAt: now - 6 * day },
    ],

    submissions: [
      { id: uid("SUB"), assignmentId: null, studentId: "SMI-S-1001",
        content: "Solid: particles vibrate in fixed positions, tightly packed.\nLiquid: particles slide past each other, close together.\nGas: particles move freely, far apart.",
        submittedAt: now - 2 * day, grade: 9, feedback: "Well explained — clear and concise. Add a small diagram next time for full marks." },
    ],
  };

  // Link the seeded submission to the science assignment
  db.submissions[0].assignmentId = db.assignments[2].id;

  localStorage.setItem(DB_KEY, JSON.stringify(db));
  return db;
}

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return seedDB();
  try {
    return JSON.parse(raw);
  } catch (e) {
    return seedDB();
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function resetDB() {
  localStorage.removeItem(DB_KEY);
  return seedDB();
}

/* ---------- Convenience data accessors ---------- */

const Data = {
  db: () => loadDB(),
  save: (db) => saveDB(db),
  reset: () => resetDB(),

  findUser: (id, password) => {
    const db = loadDB();
    return db.users.find(u => u.id.toLowerCase() === String(id).trim().toLowerCase() && u.password === password) || null;
  },

  getUserById: (id) => loadDB().users.find(u => u.id === id) || null,

  addTeacher: ({ name, subjects, classes }) => {
    const db = loadDB();
    const id = genId("teacher");
    const password = genPassword();
    const colors = ["#0E4D3C", "#7A4B21", "#1F3A5F", "#8E3B46", "#3C5A78"];
    const user = {
      id, role: "teacher", name, password,
      subjects: (Array.isArray(subjects) ? subjects : subjects.split(",")).map(s => s.trim()).filter(Boolean),
      classes: (Array.isArray(classes) ? classes : classes.split(",")).map(s => s.trim()).filter(Boolean),
      bio: "", avatarColor: colors[Math.floor(Math.random() * colors.length)], createdAt: Date.now(),
    };
    db.users.push(user);
    saveDB(db);
    return user;
  },

  // Registrar-side edit of an existing teacher's profile: name, subjects
  // taught, classes taught, and bio. Does not touch id/password/avatar.
  updateTeacher: (teacherId, { name, subjects, classes, bio }) => {
    const db = loadDB();
    const t = db.users.find(u => u.id === teacherId && u.role === "teacher");
    if (!t) return null;
    if (name !== undefined) t.name = name.trim();
    if (subjects !== undefined) {
      t.subjects = (Array.isArray(subjects) ? subjects : subjects.split(",")).map(s => s.trim()).filter(Boolean);
    }
    if (classes !== undefined) {
      t.classes = (Array.isArray(classes) ? classes : classes.split(",")).map(s => s.trim()).filter(Boolean);
    }
    if (bio !== undefined) t.bio = bio.trim();
    saveDB(db);
    return t;
  },

  getPendingEnrollments: () => loadDB().enrollments.filter(e => e.status === "pending"),

  getEnrollmentById: (id) => loadDB().enrollments.find(e => e.id === id) || null,

  // Confirms a fee payment against an EXISTING enrollment (submitted via the
  // sevenministriesint.com form) and, in the same step, issues the student's
  // portal ID. The registrar assigns the class/subjects here since the
  // website form doesn't collect that — placement happens after review.
  recordFeePaymentForEnrollment: (enrollmentId, { className, subjects, amount, term }) => {
    const db = loadDB();
    const enrollment = db.enrollments.find(e => e.id === enrollmentId);
    if (!enrollment) return null;

    const id = genId("student");
    const password = genPassword();
    const colors = ["#C9A24B", "#8E3B46", "#3C5A78", "#0E4D3C", "#7A4B21"];
    const user = {
      id, role: "student", name: enrollment.childName, password, className,
      guardian: enrollment.guardianName, feesStatus: "paid",
      subjects: (Array.isArray(subjects) ? subjects : subjects.split(",")).map(s => s.trim()).filter(Boolean),
      avatarColor: colors[Math.floor(Math.random() * colors.length)], createdAt: Date.now(),
    };
    db.users.push(user);

    db.feePayments.push({
      id: uid("PAY"), studentName: user.name, className, amount: Number(amount), term,
      date: Date.now(), studentId: id, enrollmentId: enrollment.id,
    });

    enrollment.status = "converted";
    enrollment.convertedStudentId = id;

    saveDB(db);
    return user;
  },

  addLesson: (lesson) => {
    const db = loadDB();
    const rec = { id: uid("LSN"), date: Date.now(), ...lesson };
    db.lessons.unshift(rec);
    saveDB(db);
    return rec;
  },

  addLiveClass: (live) => {
    const db = loadDB();
    const rec = { id: uid("LIVE"), link: `https://meet.smi-ems.edu/room/${uid("room").toLowerCase()}`, ...live };
    db.liveClasses.unshift(rec);
    saveDB(db);
    return rec;
  },

  addAssignment: (a) => {
    const db = loadDB();
    const rec = { id: uid("ASG"), createdAt: Date.now(), ...a };
    db.assignments.unshift(rec);
    saveDB(db);
    return rec;
  },

  submitAssignment: (assignmentId, studentId, content) => {
    const db = loadDB();
    let sub = db.submissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
    if (sub) {
      sub.content = content;
      sub.submittedAt = Date.now();
      sub.grade = null;
      sub.feedback = "";
    } else {
      sub = { id: uid("SUB"), assignmentId, studentId, content, submittedAt: Date.now(), grade: null, feedback: "" };
      db.submissions.push(sub);
    }
    saveDB(db);
    return sub;
  },

  gradeSubmission: (submissionId, grade, feedback) => {
    const db = loadDB();
    const sub = db.submissions.find(s => s.id === submissionId);
    if (sub) {
      sub.grade = Number(grade);
      sub.feedback = feedback;
      saveDB(db);
    }
    return sub;
  },
};
