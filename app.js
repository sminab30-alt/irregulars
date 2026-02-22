/* =========================================================
   Irregular Verbs Quiz • Student Lesson (GitHub Pages)
   app.js (FULL) — Timer + Submit GIF + Sounds + Confetti
========================================================= */

/** 🔧 Paste your Google Apps Script Web App URL here */
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzLilf9B--HCzfWQgDjl0Xzl5MQEgnHhOkptvwNCZGEfemBaI3tbAVTE4L06cyjIs9d/exec";
/** LocalStorage key */
const STORAGE_KEY = "irregular_verbs_lesson_v3";

/* -------------------- QUIZ DATA -------------------- */
const MCQ = [
  // Part 1A: Past Simple (V2)
  { id:"mcq-see",   section:"A", prompt:"see",   options:["saw","seen","see"], correct:"saw" },
  { id:"mcq-take",  section:"A", prompt:"take",  options:["took","taken","take"], correct:"took" },
  { id:"mcq-make",  section:"A", prompt:"make",  options:["made","make","making"], correct:"made" },
  { id:"mcq-give",  section:"A", prompt:"give",  options:["gave","given","give"], correct:"gave" },
  { id:"mcq-come",  section:"A", prompt:"come",  options:["came","come","coming"], correct:"came" },
  { id:"mcq-find",  section:"A", prompt:"find",  options:["found","find","finding"], correct:"found" },
  { id:"mcq-tell",  section:"A", prompt:"tell",  options:["told","tell","telling"], correct:"told" },
  { id:"mcq-think", section:"A", prompt:"think", options:["thought","think","thinking"], correct:"thought" },
  { id:"mcq-bring", section:"A", prompt:"bring", options:["brought","bring","bringing"], correct:"brought" },

  // Part 1B: Past Participle (V3)
  { id:"mcq-be",     section:"B", prompt:"be",     options:["was/were","been","be"], correct:"been" },
  { id:"mcq-do",     section:"B", prompt:"do",     options:["did","do","done"], correct:"done" },
  { id:"mcq-know",   section:"B", prompt:"know",   options:["knew","know","known"], correct:"known" },
  { id:"mcq-get",    section:"B", prompt:"get",    options:["got","gotten/got","get"], correct:"gotten/got" },
  { id:"mcq-have",   section:"B", prompt:"have",   options:["have","had","having"], correct:"had" },
  { id:"mcq-leave",  section:"B", prompt:"leave",  options:["left","leave","leaving"], correct:"left" },
  { id:"mcq-become", section:"B", prompt:"become", options:["became","become","becoming"], correct:"become" },
  { id:"mcq-feel",   section:"B", prompt:"feel",   options:["feel","felt","feeling"], correct:"felt" },
  { id:"mcq-put",    section:"B", prompt:"put",    options:["put","puts","putting"], correct:"put" },
  { id:"mcq-say",    section:"B", prompt:"say",    options:["say","said","saying"], correct:"said" },
];

const BLANKS = [
  { id:"b-give",   left:"give",   mid:"_____",   right:"given",   missing:"mid",   answers:["gave"] },
  { id:"b-go",     left:"go",     mid:"went",    right:"_____",   missing:"right", answers:["gone"] },
  { id:"b-do",     left:"_____",  mid:"did",     right:"done",    missing:"left",  answers:["do"] },
  { id:"b-see",    left:"see",    mid:"_____",   right:"seen",    missing:"mid",   answers:["saw"] },
  { id:"b-take",   left:"take",   mid:"took",    right:"_____",   missing:"right", answers:["taken"] },
  { id:"b-have",   left:"_____",  mid:"had",     right:"had",     missing:"left",  answers:["have"] },
  { id:"b-know",   left:"know",   mid:"knew",    right:"_____",   missing:"right", answers:["known"] },
  { id:"b-make",   left:"make",   mid:"_____",   right:"made",    missing:"mid",   answers:["made"] },
  { id:"b-come",   left:"come",   mid:"came",    right:"_____",   missing:"right", answers:["come"] },
  { id:"b-think",  left:"_____",  mid:"thought", right:"thought", missing:"left",  answers:["think"] },
  { id:"b-get",    left:"get",    mid:"_____",   right:"got",     missing:"mid",   answers:["got"] },
  { id:"b-become", left:"become", mid:"_____",   right:"become",  missing:"mid",   answers:["became"] },
  { id:"b-feel",   left:"feel",   mid:"_____",   right:"felt",    missing:"mid",   answers:["felt"] },
  { id:"b-bring",  left:"bring",  mid:"_____",   right:"brought", missing:"mid",   answers:["brought"] },
  { id:"b-say",    left:"say",    mid:"_____",   right:"said",    missing:"mid",   answers:["said"] },
];

const SENTENCES = ["be","have","do","come","give","find","think","bring"];

/* -------------------- DOM HELPERS -------------------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const toast = $("#toast");

/* -------------------- STATE -------------------- */
let state = loadState();
let submittedOnce = !!state.meta?.submittedAt;
let gradedOnce = !!state.meta?.gradedAt;

/* Word-bank tap-to-insert */
let selectedWord = "";

/* -------------------- AUDIO -------------------- */
let audioReady = false;
let audioCtx = null;

/* -------------------- TIMER -------------------- */
let timerInterval = null;

/* -------------------- CONFETTI -------------------- */
const confettiCanvas = $("#confetti");
const confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;

/* =========================================================
   INIT
========================================================= */
wireGlobalAudioUnlock();
ensureTimerState();
renderAll();
startTimer();
wireOverlayButtons();
updateTeacherModeUI();
updateProgressUI();
resizeConfetti();

window.addEventListener("resize", () => {
  resizeConfetti();
});

if (gradedOnce) applyGradedUIFromState();

/* Buttons */
$("#submitBtn")?.addEventListener("click", onSubmit);
$("#checkBtn")?.addEventListener("click", onCheckScore);
$("#resetBtn")?.addEventListener("click", onReset);
$("#printBtn")?.addEventListener("click", () => { sfxClick(); window.print(); });

/* Student fields */
$("#studentName")?.addEventListener("input", () => { saveStudentInfo(); updateProgressUI(); });
$("#studentClass")?.addEventListener("input", () => { saveStudentInfo(); updateProgressUI(); });

/* =========================================================
   RENDERING
========================================================= */
function renderAll(){
  // Student info
  if ($("#studentName")) $("#studentName").value = state.student?.name ?? "";
  if ($("#studentClass")) $("#studentClass").value = state.student?.class ?? "";

  renderMCQ();
  renderWordBank();
  renderBlanks();
  renderSentences();
  renderTimer();
}

function renderMCQ(){
  const boxA = $("#mcqA");
  const boxB = $("#mcqB");
  if (!boxA || !boxB) return;

  boxA.innerHTML = "";
  boxB.innerHTML = "";

  MCQ.forEach((q, idx) => {
    const chosen = state.answers?.mcq?.[q.id] ?? "";
    const target = q.section === "A" ? boxA : boxB;
    const meta = q.section === "A" ? "Past Simple (V2)" : "Past Participle (V3)";

    const qEl = document.createElement("div");
    qEl.className = "q";
    qEl.dataset.qid = q.id;

    qEl.innerHTML = `
      <div class="q__top">
        <div class="q__verb">${idx + 1}. ${escapeHtml(q.prompt)}</div>
        <div class="q__meta">${meta}</div>
      </div>

      <div class="choices" role="radiogroup" aria-label="Choices for ${escapeHtml(q.prompt)}">
        ${q.options.map((opt, i) => {
          const rid = `${q.id}_${i}`;
          const checked = chosen === opt ? "checked" : "";
          return `
            <label class="choice" for="${rid}">
              <input type="radio" id="${rid}" name="${q.id}" value="${escapeAttr(opt)}" ${checked} />
              <span class="choice__txt">${String.fromCharCode(65+i)}) ${escapeHtml(opt)}</span>
            </label>
          `;
        }).join("")}
      </div>

      <div class="reveal is-hidden" aria-live="polite"></div>
    `;

    $$(`input[name="${q.id}"]`, qEl).forEach(r => {
      r.addEventListener("change", () => {
        sfxClick();
        setMCQ(q.id, r.value);
      });
    });

    target.appendChild(qEl);
  });
}

function renderWordBank(){
  const bank = $("#wordBank");
  if (!bank) return;

  const words = Array.from(new Set(BLANKS.flatMap(b => b.answers)))
    .sort((a,b) => a.localeCompare(b));

  bank.innerHTML = "";
  words.forEach(word => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "word";
    btn.textContent = word;
    btn.setAttribute("draggable", "true");
    btn.setAttribute("aria-label", `Word: ${word}`);

    // Drag (swoosh)
    btn.addEventListener("dragstart", (e) => {
      sfxSwoosh();
      e.dataTransfer.setData("text/plain", word);
      e.dataTransfer.effectAllowed = "copy";
    });

    // Tap/Click select
    btn.addEventListener("click", () => {
      sfxClick();
      toggleSelectedWord(word, btn);
    });

    // Keyboard
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        btn.click();
      }
    });

    bank.appendChild(btn);
  });
}

function renderBlanks(){
  const box = $("#blanks");
  if (!box) return;

  box.innerHTML = "";

  BLANKS.forEach((b) => {
    const current = state.answers?.blanks?.[b.id] ?? "";

    const row = document.createElement("div");
    row.className = "blank";
    row.dataset.bid = b.id;

    const left  = b.missing === "left"  ? renderBlankInput(current) : `<div class="blank__verb">${escapeHtml(b.left)}</div>`;
    const mid   = b.missing === "mid"   ? renderBlankInput(current) : `<div class="blank__verb">${escapeHtml(b.mid)}</div>`;
    const right = b.missing === "right" ? renderBlankInput(current) : `<div class="blank__verb">${escapeHtml(b.right)}</div>`;

    row.innerHTML = `
      ${left}
      <div class="sep">—</div>
      ${mid}
      <div class="sep">—</div>
      ${right}
      <div class="reveal is-hidden" aria-live="polite"></div>
    `;

    const input = $("input", row);
    if (input) {
      // typing
      input.addEventListener("input", () => setBlank(b.id, input.value));

      // tap-to-insert from selected word
      input.addEventListener("focus", () => {
        if (selectedWord) {
          sfxClick();
          input.value = selectedWord;
          setBlank(b.id, selectedWord);
          clearSelectedWord();
        }
      });

      // dragover/drop
      input.addEventListener("dragover", (e) => {
        e.preventDefault();
        input.classList.add("drop-ready");
      });
      input.addEventListener("dragleave", () => input.classList.remove("drop-ready"));

      input.addEventListener("drop", (e) => {
        e.preventDefault();
        input.classList.remove("drop-ready");
        const word = e.dataTransfer.getData("text/plain");
        if (word) {
          sfxSwoosh(); // drag swoosh requirement
          input.value = word;
          setBlank(b.id, word);
        }
      });
    }

    box.appendChild(row);
  });
}

function renderBlankInput(value){
  return `
    <input type="text"
      inputmode="text"
      autocomplete="off"
      spellcheck="false"
      aria-label="Blank answer"
      placeholder="type or drop…"
      value="${escapeAttr(value)}"
    />
  `;
}

function renderSentences(){
  const box = $("#sentences");
  if (!box) return;

  box.innerHTML = "";

  SENTENCES.forEach((verb) => {
    const id = `s-${verb}`;
    const current = state.answers?.sentences?.[id] ?? "";

    const row = document.createElement("div");
    row.className = "sentence";
    row.dataset.sid = id;

    row.innerHTML = `
      <div class="sentence__label">${escapeHtml(verb)}:</div>
      <textarea rows="2" aria-label="Write a sentence using ${escapeHtml(verb)}" placeholder="Write your sentence…">${escapeHtml(current)}</textarea>
    `;

    const ta = $("textarea", row);
    ta?.addEventListener("input", () => setSentence(id, ta.value));

    box.appendChild(row);
  });
}

/* =========================================================
   STATE SETTERS
========================================================= */
function saveStudentInfo(){
  state.student = state.student || {};
  state.student.name = $("#studentName")?.value ?? "";
  state.student.class = $("#studentClass")?.value ?? "";
  saveState();
}

function setMCQ(id, value){
  state.answers = state.answers || {};
  state.answers.mcq = state.answers.mcq || {};
  state.answers.mcq[id] = value;
  saveState();
  updateProgressUI();
}

function setBlank(id, value){
  state.answers = state.answers || {};
  state.answers.blanks = state.answers.blanks || {};
  state.answers.blanks[id] = value;
  saveState();
  updateProgressUI();
}

function setSentence(id, value){
  state.answers = state.answers || {};
  state.answers.sentences = state.answers.sentences || {};
  state.answers.sentences[id] = value;
  saveState();
  updateProgressUI();
}

/* =========================================================
   PROGRESS
========================================================= */
function computeProgress(){
  const mcqDone = MCQ.filter(q => norm(state.answers?.mcq?.[q.id])).length;
  const blankDone = BLANKS.filter(b => norm(state.answers?.blanks?.[b.id])).length;
  const sentDone = SENTENCES.filter(v => norm(state.answers?.sentences?.[`s-${v}`])).length;

  const total = MCQ.length + BLANKS.length + SENTENCES.length;
  const done = mcqDone + blankDone + sentDone;

  return { done, total, mcqDone, blankDone, sentDone };
}

function updateProgressUI(){
  const p = computeProgress();

  $("#progressMeta") && ($("#progressMeta").textContent = `Progress: ${p.done}/${p.total}`);
  $("#chipMcq") && ($("#chipMcq").textContent = `MCQ: ${p.mcqDone}/${MCQ.length}`);
  $("#chipBlanks") && ($("#chipBlanks").textContent = `Blanks: ${p.blankDone}/${BLANKS.length}`);
  $("#chipSent") && ($("#chipSent").textContent = `Sentences: ${p.sentDone}/${SENTENCES.length}`);

  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  $("#progressFill") && ($("#progressFill").style.width = `${pct}%`);

  const bar = $(".progress__bar");
  if (bar) {
    bar.setAttribute("aria-valuemax", String(p.total));
    bar.setAttribute("aria-valuenow", String(p.done));
  }

  renderTimer();
}

/* =========================================================
   TEACHER MODE FLOW
========================================================= */
function updateTeacherModeUI(){
  const checkBtn = $("#checkBtn");
  if (!checkBtn) return;
  checkBtn.classList.toggle("is-hidden", !submittedOnce);
}

/* =========================================================
   SUBMIT (Google Sheets)
========================================================= */
async function onSubmit(){
  sfxClick();

  if (!validateStudentInfo()) {
    showToast("Please enter your name and class first.", "bad");
    return;
  }

  // Freeze timer when submitting
  stopTimer();

  // Save submitted state (unlock Check Score regardless)
  state.meta = state.meta || {};
  state.meta.submittedAt = new Date().toISOString();
  submittedOnce = true;
  saveState();
  updateTeacherModeUI();

  // Build payload (includes timeSpentSec + score for teacher sheet)
  const grading = gradeQuiz();
  const payload = buildPayload(grading);

  // If not set, still show overlay so you can test
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("PASTE_")) {
    showToast("⚠️ Google Sheets URL not set. Paste your Apps Script URL in app.js.", "warn");
    showSubmitOverlay();
    return;
  }

  try{
    showToast("Submitting…", "warn");
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    showToast("✅ Submitted! Now you can tap “Check Score”.", "ok");
    showSubmitOverlay();
  }catch(err){
    console.error(err);
    showToast("⚠️ Submit failed. Check Apps Script deployment & URL.", "bad");
    // Still show overlay (your choice). If you prefer NOT, remove next line.
    showSubmitOverlay();
  }
}

function buildPayload(grading){
  const timeSpentSec = Math.floor(getElapsedMs() / 1000);

  return {
    timestamp: new Date().toISOString(),
    studentName: (state.student?.name ?? "").trim(),
    studentClass: (state.student?.class ?? "").trim(),
    timeSpentSec,

    mcq: state.answers?.mcq ?? {},
    blanks: state.answers?.blanks ?? {},
    sentences: state.answers?.sentences ?? {},

    score: {
      part1Correct: grading.p1Correct,
      part1Total: grading.p1Total,
      part2Correct: grading.p2Correct,
      part2Total: grading.p2Total,
      totalCorrect: grading.totalCorrect,
      totalAuto: grading.totalAuto,
      percent: grading.percent
    },

    meta: {
      userAgent: navigator.userAgent,
      page: location.href
    }
  };
}

/* =========================================================
   CHECK SCORE (Teacher Mode)
========================================================= */
function onCheckScore(){
  sfxClick();

  if (!submittedOnce) {
    showToast("Submit first to unlock score checking.", "warn");
    return;
  }

  if (!validateStudentInfo()) {
    showToast("Please enter your name and class.", "bad");
    return;
  }

  const result = gradeQuiz();
  applyGradingUI(result);
  updateScoreCard(result);

  state.meta = state.meta || {};
  state.meta.gradedAt = new Date().toISOString();
  state.meta.lastScore = result;
  gradedOnce = true;
  saveState();

  if (result.percent >= 70){
    sfxSuccess();
    launchConfetti();
  }

  showToast("Score checked. Review highlights and correct answers.", "ok");
}

/* =========================================================
   GRADING
========================================================= */
function gradeQuiz(){
  const p1Total = MCQ.length;
  let p1Correct = 0;

  MCQ.forEach(q => {
    const user = state.answers?.mcq?.[q.id] ?? "";
    if (user === q.correct) p1Correct++;
  });

  const p2Total = BLANKS.length;
  let p2Correct = 0;

  const blankDetail = BLANKS.map(b => {
    const user = state.answers?.blanks?.[b.id] ?? "";
    const ok = b.answers.some(a => norm(a) === norm(user));
    if (ok) p2Correct++;
    return { id: b.id, user, expected: b.answers.join(" / "), ok };
  });

  const totalAuto = p1Total + p2Total;
  const totalCorrect = p1Correct + p2Correct;
  const percent = totalAuto ? Math.round((totalCorrect / totalAuto) * 100) : 0;

  return { p1Correct, p1Total, p2Correct, p2Total, totalCorrect, totalAuto, percent, blankDetail };
}

function applyGradingUI(result){
  // MCQ highlight + reveal
  MCQ.forEach(q => {
    const el = document.querySelector(`.q[data-qid="${q.id}"]`);
    if (!el) return;

    const user = state.answers?.mcq?.[q.id] ?? "";
    const ok = user === q.correct;

    el.classList.remove("correct","incorrect");
    el.classList.add(ok ? "correct" : "incorrect");

    const reveal = $(".reveal", el);
    if (!reveal) return;
    reveal.classList.remove("is-hidden");
    reveal.innerHTML = ok
      ? `<span class="reveal__ok">✔ Correct</span> • Your answer: <code>${escapeHtml(user || "—")}</code>`
      : `<span class="reveal__bad">✘ Incorrect</span> • Your answer: <code>${escapeHtml(user || "—")}</code> • Correct: <code>${escapeHtml(q.correct)}</code>`;
  });

  // Blanks highlight + reveal
  result.blankDetail.forEach(d => {
    const row = document.querySelector(`.blank[data-bid="${d.id}"]`);
    if (!row) return;

    row.classList.remove("correct","incorrect");
    row.classList.add(d.ok ? "correct" : "incorrect");

    const reveal = $(".reveal", row);
    if (!reveal) return;
    reveal.classList.remove("is-hidden");
    reveal.innerHTML = d.ok
      ? `<span class="reveal__ok">✔ Correct</span> • Your answer: <code>${escapeHtml(d.user || "—")}</code>`
      : `<span class="reveal__bad">✘ Incorrect</span> • Your answer: <code>${escapeHtml(d.user || "—")}</code> • Correct: <code>${escapeHtml(d.expected)}</code>`;
  });
}

function updateScoreCard(result){
  $("#scoreBig") && ($("#scoreBig").textContent = `${result.percent}%`);
  $("#scoreP1") && ($("#scoreP1").textContent = `Part 1: ${result.p1Correct}/${result.p1Total}`);
  $("#scoreP2") && ($("#scoreP2").textContent = `Part 2: ${result.p2Correct}/${result.p2Total}`);

  const msg = feedbackMessage(result.percent);
  $("#scoreMsg") && ($("#scoreMsg").textContent = msg);
}

function feedbackMessage(percent){
  if (percent >= 90) return "🌟 Excellent work! You really know these irregular verbs.";
  if (percent >= 70) return "✅ Great job! Keep practicing to reach 90%+.";
  if (percent >= 50) return "💡 Good try! Review the wrong answers and try again.";
  return "🧠 Keep going! Practice a little more and try again.";
}

function applyGradedUIFromState(){
  const last = state.meta?.lastScore;
  if (!last) return;
  applyGradingUI(last);
  updateScoreCard(last);
  updateTeacherModeUI();
}

/* =========================================================
   VALIDATION
========================================================= */
function validateStudentInfo(){
  const name = ($("#studentName")?.value ?? "").trim();
  const cls  = ($("#studentClass")?.value ?? "").trim();

  $("#errName") && ($("#errName").textContent = "");
  $("#errClass") && ($("#errClass").textContent = "");

  let ok = true;
  if (!name) { $("#errName") && ($("#errName").textContent = "Name is required."); ok = false; }
  if (!cls)  { $("#errClass") && ($("#errClass").textContent = "Class is required."); ok = false; }

  saveStudentInfo();
  return ok;
}

/* =========================================================
   RESET
========================================================= */
function onReset(){
  sfxClick();
  if (!confirm("Reset all answers? This clears saved answers in this browser.")) return;

  localStorage.removeItem(STORAGE_KEY);
  state = freshState();
  submittedOnce = false;
  gradedOnce = false;
  selectedWord = "";

  hideSubmitOverlay();
  resetTimer();

  renderAll();
  updateTeacherModeUI();
  updateProgressUI();
  showToast("Reset complete.", "ok");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   TOAST
========================================================= */
function showToast(msg, type="ok"){
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("ok","bad","warn","show");
  toast.classList.add("show", type);

  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 4200);
}

/* =========================================================
   SUBMIT GIF OVERLAY (matches your HTML ids)
   HTML ids expected:
   - submitOverlay
   - overlayOkBtn
   - closeOverlayBtn
========================================================= */
function showSubmitOverlay(){
  const overlay = $("#submitOverlay");
  if (!overlay) return;

  overlay.classList.remove("is-hidden");

  // accessibility: focus OK button
  $("#overlayOkBtn")?.focus();

  // auto close after 3 sec (optional)
  clearTimeout(showSubmitOverlay._t);
  showSubmitOverlay._t = setTimeout(hideSubmitOverlay, 3000);
}

function hideSubmitOverlay(){
  const overlay = $("#submitOverlay");
  if (!overlay) return;
  overlay.classList.add("is-hidden");
  $("#submitBtn")?.focus();
}

function wireOverlayButtons(){
  $("#overlayOkBtn")?.addEventListener("click", () => {
    sfxClick();
    hideSubmitOverlay();
  });

  $("#closeOverlayBtn")?.addEventListener("click", () => {
    sfxClick();
    hideSubmitOverlay();
  });

  // click outside card closes
  $("#submitOverlay")?.addEventListener("click", (e) => {
    if (e.target && e.target.id === "submitOverlay") hideSubmitOverlay();
  });

  // ESC closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideSubmitOverlay();
  });
}

/* =========================================================
   WORD BANK (tap-to-insert)
========================================================= */
function toggleSelectedWord(word, btn){
  const all = $$(".word");
  const hint = $("#bankHint");

  if (selectedWord === word) {
    selectedWord = "";
    all.forEach(x => x.classList.remove("is-selected"));
    hint && (hint.textContent = "Tip: Drag or tap a word to fill blanks.");
    return;
  }

  selectedWord = word;
  all.forEach(x => x.classList.toggle("is-selected", x === btn));
  hint && (hint.textContent = `Selected: "${word}". Tap a blank to insert.`);
}

function clearSelectedWord(){
  selectedWord = "";
  $$(".word").forEach(x => x.classList.remove("is-selected"));
  $("#bankHint") && ($("#bankHint").textContent = "Tip: Drag or tap a word to fill blanks.");
}

/* =========================================================
   LOCAL STORAGE
========================================================= */
function freshState(){
  return {
    student: { name:"", class:"" },
    answers: { mcq:{}, blanks:{}, sentences:{} },
    meta: {
      timer: { startedAt: null, elapsedMs: 0, running: true }
    }
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);

    const s = {
      student: parsed.student ?? { name:"", class:"" },
      answers: parsed.answers ?? { mcq:{}, blanks:{}, sentences:{} },
      meta: parsed.meta ?? {}
    };

    s.meta.timer = s.meta.timer ?? { startedAt: null, elapsedMs: 0, running: true };
    return s;
  }catch{
    return freshState();
  }
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch{}
}

/* =========================================================
   HELPERS
========================================================= */
function norm(v){
  return (v ?? "").toString().trim().toLowerCase();
}
function escapeHtml(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){
  return escapeHtml(str).replaceAll("\n"," ");
}

/* =========================================================
   SOUNDS (Web Audio): click, swoosh, success
========================================================= */
function wireGlobalAudioUnlock(){
  const unlock = () => {
    if (audioReady) return;
    try{
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioReady = true;
    }catch{
      audioReady = false;
    }
  };
  window.addEventListener("pointerdown", unlock, { once:true });
  window.addEventListener("keydown", unlock, { once:true });
}

function sfxClick(){
  if (!audioReady || !audioCtx) return;
  const t = audioCtx.currentTime;

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  o.type = "square";
  o.frequency.setValueAtTime(1000, t);
  o.frequency.exponentialRampToValueAtTime(720, t + 0.03);

  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.10, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  o.stop(t + 0.06);
}

function sfxSwoosh(){
  if (!audioReady || !audioCtx) return;
  const t = audioCtx.currentTime;

  const bufferSize = Math.floor(audioCtx.sampleRate * 0.18);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++){
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1400, t);
  filter.frequency.exponentialRampToValueAtTime(380, t + 0.18);

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

  src.connect(filter).connect(g).connect(audioCtx.destination);
  src.start(t);
  src.stop(t + 0.19);
}

function sfxSuccess(){
  if (!audioReady || !audioCtx) return;
  const t = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6

  notes.forEach((freq, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    o.type = "sine";
    o.frequency.setValueAtTime(freq, t + i * 0.045);

    g.gain.setValueAtTime(0.0001, t + i * 0.045);
    g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.045 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.045 + 0.22);

    o.connect(g).connect(audioCtx.destination);
    o.start(t + i * 0.045);
    o.stop(t + i * 0.045 + 0.24);
  });
}

/* =========================================================
   TIMER (display id: chipTimer)
========================================================= */
function ensureTimerState(){
  state.meta = state.meta || {};
  state.meta.timer = state.meta.timer || { startedAt: null, elapsedMs: 0, running: true };

  const t = state.meta.timer;

  // If already submitted earlier, keep stopped
  if (state.meta.submittedAt) {
    if (t.running) stopTimer();
    return;
  }

  if (!t.startedAt) {
    t.startedAt = Date.now();
    t.running = true;
    saveState();
  }
}

function getElapsedMs(){
  const t = state.meta?.timer;
  if (!t) return 0;
  if (!t.running) return t.elapsedMs;
  return t.elapsedMs + (Date.now() - t.startedAt);
}

function formatTime(ms){
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function renderTimer(){
  const el = $("#chipTimer");
  if (!el) return;
  el.textContent = `Time: ${formatTime(getElapsedMs())}`;
}

function startTimer(){
  ensureTimerState();
  const t = state.meta.timer;

  if (!t.running) {
    renderTimer();
    return;
  }

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    renderTimer();

    // save every 10 seconds
    if (Math.floor(getElapsedMs() / 1000) % 10 === 0) saveState();
  }, 1000);

  renderTimer();
}

function stopTimer(){
  ensureTimerState();
  const t = state.meta.timer;

  if (t.running) {
    t.elapsedMs = getElapsedMs();
    t.running = false;
    t.startedAt = Date.now();
    saveState();
  }

  clearInterval(timerInterval);
  timerInterval = null;
  renderTimer();
}

function resetTimer(){
  state.meta = state.meta || {};
  state.meta.timer = { startedAt: Date.now(), elapsedMs: 0, running: true };
  saveState();
  startTimer();
}

/* =========================================================
   CONFETTI (70%+)
========================================================= */
function resizeConfetti(){
  if (!confettiCanvas || !confettiCtx) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  confettiCanvas.width = Math.floor(window.innerWidth * dpr);
  confettiCanvas.height = Math.floor(window.innerHeight * dpr);
  confettiCanvas.style.width = `${window.innerWidth}px`;
  confettiCanvas.style.height = `${window.innerHeight}px`;
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function launchConfetti(){
  if (!confettiCanvas || !confettiCtx) return;
  resizeConfetti();

  const colors = ["#3a6ff7","#33b8ff","#21b57a","#f2b84b","#e54763"];
  const W = window.innerWidth;
  const H = window.innerHeight;

  const pieces = Array.from({ length: 160 }, () => ({
    x: W * 0.2 + Math.random() * W * 0.6,
    y: -20 - Math.random() * H * 0.2,
    vx: (Math.random() * 2 - 1) * 2.6,
    vy: 2 + Math.random() * 4.2,
    r: 4 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() * 2 - 1) * 0.18,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 0,
    max: 160 + Math.random() * 60
  }));

  let raf = 0;

  function tick(){
    confettiCtx.clearRect(0, 0, W, H);

    for (const p of pieces) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.vx *= 0.995;
      p.rot += p.vr;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      confettiCtx.restore();
    }

    for (let i = pieces.length - 1; i >= 0; i--) {
      if (pieces[i].life > pieces[i].max || pieces[i].y > H + 40) pieces.splice(i, 1);
    }

    if (pieces.length) raf = requestAnimationFrame(tick);
    else confettiCtx.clearRect(0, 0, W, H);
  }

  cancelAnimationFrame(raf);
  tick();

}
