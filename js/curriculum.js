/* ============================================================
   Seven Ministries International — Education Management System
   Curriculum reference data
   Structured on the National Curriculum in England (DfE framework
   document, Figure 1 & 2), extended with a Year 12 (Sixth Form)
   pathway since the statutory framework itself only runs Key Stage
   1 through 4 (Years 1–11).
   ============================================================ */

const YEAR_GROUPS = [
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12",
];

// Mirrors Figure 1 — Structure of the national curriculum
const KEY_STAGES = [
  {
    id: "ks1", label: "Key Stage 1", ageRange: "5–7", years: ["Year 1", "Year 2"],
    core: ["English", "Mathematics", "Science"],
    foundation: ["Art and Design", "Computing", "Design and Technology", "Geography", "History", "Music", "Physical Education"],
    statutory: ["Religious Education"],
  },
  {
    id: "ks2", label: "Key Stage 2", ageRange: "7–11", years: ["Year 3", "Year 4", "Year 5", "Year 6"],
    core: ["English", "Mathematics", "Science"],
    foundation: ["Art and Design", "Computing", "Design and Technology", "Foreign Language", "Geography", "History", "Music", "Physical Education"],
    statutory: ["Religious Education"],
  },
  {
    id: "ks3", label: "Key Stage 3", ageRange: "11–14", years: ["Year 7", "Year 8", "Year 9"],
    core: ["English", "Mathematics", "Science"],
    foundation: ["Art and Design", "Citizenship", "Computing", "Design and Technology", "Modern Foreign Language", "Geography", "History", "Music", "Physical Education"],
    statutory: ["Religious Education"],
  },
  {
    id: "ks4", label: "Key Stage 4", ageRange: "14–16", years: ["Year 10", "Year 11"],
    core: ["English", "Mathematics", "Science"],
    foundation: ["Citizenship", "Computing", "Physical Education"],
    statutory: ["Religious Education", "Sex and Relationship Education"],
  },
  {
    id: "sixth", label: "Sixth Form", ageRange: "16–18", years: ["Year 12"],
    core: [],
    // Not part of the statutory National Curriculum — an A-Level style
    // pathway of individually chosen subjects, offered here as a default set.
    foundation: ["Mathematics", "English Literature", "Biology", "Chemistry", "Physics", "Economics", "Business Studies", "Computer Science", "History", "Geography"],
    statutory: ["Religious Education"],
    note: "Post-16 study is not part of the statutory National Curriculum. Students typically choose 3–4 subjects from this list.",
  },
];

function keyStageForYear(yearLabel) {
  return KEY_STAGES.find(ks => ks.years.includes(yearLabel)) || null;
}

// All subjects a student in this year group could reasonably be enrolled in
function subjectsForYear(yearLabel) {
  const ks = keyStageForYear(yearLabel);
  if (!ks) return [];
  return [...ks.core, ...ks.foundation, ...ks.statutory];
}

// A sensible default subject set to pre-check when enrolling a student
// (core + statutory religious education; foundation subjects are optional
// picks the registrar/family can add)
function defaultSubjectsForYear(yearLabel) {
  const ks = keyStageForYear(yearLabel);
  if (!ks) return [];
  return [...ks.core, "Religious Education"];
}

// Every subject taught anywhere in the school, deduplicated — used to
// populate the Subject dropdown when adding a teacher.
const ALL_SUBJECTS = Array.from(new Set(
  KEY_STAGES.flatMap(ks => [...ks.core, ...ks.foundation, ...ks.statutory])
)).sort();
