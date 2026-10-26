// ===== Game settings =====
const TARGET_COUNT = 50; // cards the player must find (1-50)
const ROUND_SECONDS = 30; // countdown for rounds 1-5
const SUSTAIN_LIMIT = 60; // maximum seconds allowed in the Sustain round
const GRID_COLS = 12;
const GRID_ROWS = 8;
const COLORS = [
  "#ffd6d6",
  "#d6e8ff",
  "#fff3c4",
  "#d9f7d9",
  "#ead9ff",
  "#ffe2c7",
];

// ===== Round definitions (edit text here to change the teaching content) =====
const ROUNDS = [
  {
    name: "Baseline",
    maxNumber: 90,
    messy: true,
    layout: "random",
    title: "Round 1: Your current workstation",
    text: "Click the cards in order from 1 to 50. You have 30 seconds. This is how the work area looks today, with no 5S applied.",
  },
  {
    name: "Sort",
    maxNumber: 50,
    messy: true,
    layout: "random",
    title: "Round 2: Sort (Seiri)",
    text: "Remove everything that isn't needed. Cards 51 to 90 are not part of your job, so they have been removed from the workstation.",
  },
  {
    name: "Shine",
    maxNumber: 50,
    messy: false,
    layout: "random",
    title: "Round 3: Shine (Seiso)",
    text: "Clean the workspace. Colors have been removed and every card is straightened and the same size, so nothing distracts from the work.",
  },
  {
    name: "Set in Order",
    maxNumber: 50,
    messy: false,
    layout: "quadrants",
    title: "Round 4: Set in Order (Seiton)",
    text: "A place for everything. Card 1 is in quadrant 1 (top-left), 2 in Q2 (top-right), 3 in Q3 (bottom-left), 4 in Q4 (bottom-right), then 5 back in Q1, and so on.",
  },
  {
    name: "Standardize",
    maxNumber: 50,
    messy: false,
    layout: "standard",
    title: "Round 5: Standardize (Seiketsu)",
    text: "The best layout becomes the standard. Cards are arranged 1 to 50 in order, left to right and top to bottom, so anyone can do the job the same way.",
  },
  {
    name: "Sustain",
    maxNumber: 50,
    messy: false,
    layout: "standard",
    mode: "findMissing",
    missingCount: 2,
    title: "Round 6: Sustain (Shitsuke)",
    text: "Someone didn't follow the standard, and two cards are missing from the workstation. Click the empty spots where the missing cards belong. The clock counts up, so see how fast you can spot the problem.",
  },
];

// ===== Page elements =====
const board = document.getElementById("board");
const timerEl = document.getElementById("timer");
const timerTitleEl = document.getElementById("timer-title");
const nextNumberEl = document.getElementById("next-number");
const nextTitleEl = document.getElementById("next-title");
const foundCountEl = document.getElementById("found-count");
const startBtn = document.getElementById("start-btn");
const instructionsEl = document.getElementById("instructions");
const roundLabelEl = document.getElementById("round-label");

// ===== Game state =====
let nextNumber = 1;
let clock = ROUND_SECONDS; // counts down in rounds 1-5, counts up in Sustain
let timerId = null;
let roundActive = false;
let currentRound = 0;
let buttonMode = "start"; // "start", "next", or "restart"
let missingNumbers = []; // the hidden cards in the Sustain round
let gapsFound = 0;
const scores = [];

// ===== Helpers =====
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function isSustain() {
  return ROUNDS[currentRound].mode === "findMissing";
}

// ===== Work out where every card goes (returns left/top in %) =====
function getPositions(layout, count, messy) {
  const cellW = 100 / GRID_COLS;
  const cellH = 100 / GRID_ROWS;

  const toPos = (col, row) => ({
    left:
      col * cellW + (messy ? randomBetween(0.5, cellW * 0.35) : cellW * 0.2),
    top:
      row * cellH + (messy ? randomBetween(0.5, cellH * 0.35) : cellH * 0.25),
  });

  if (layout === "standard") {
    const cols = 10;
    const rows = 5;
    return Array.from({ length: count }, (_, i) => ({
      left: (i % cols) * (100 / cols) + 2.5,
      top: Math.floor(i / cols) * (100 / rows) + 6,
    }));
  }

  if (layout === "quadrants") {
    const halfC = GRID_COLS / 2;
    const halfR = GRID_ROWS / 2;
    const quadSlots = [0, 1, 2, 3].map((q) => {
      const slots = [];
      for (let r = 0; r < halfR; r++) {
        for (let c = 0; c < halfC; c++) {
          slots.push({
            col: c + (q % 2) * halfC,
            row: r + Math.floor(q / 2) * halfR,
          });
        }
      }
      return shuffle(slots);
    });
    return Array.from({ length: count }, (_, i) => {
      const slot = quadSlots[i % 4].pop();
      return toPos(slot.col, slot.row);
    });
  }

  const slots = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      slots.push({ col, row });
    }
  }
  shuffle(slots);
  return slots.slice(0, count).map((s) => toPos(s.col, s.row));
}

// ===== Build the board for a round =====
function buildBoard(round) {
  board.innerHTML = "";
  board.classList.toggle("quadrants", round.layout === "quadrants");
  board.classList.toggle("sustain", round.mode === "findMissing");

  // Sustain: secretly pick which cards are missing
  missingNumbers = [];
  if (round.mode === "findMissing") {
    const pool = shuffle(
      Array.from({ length: round.maxNumber }, (_, i) => i + 1),
    );
    missingNumbers = pool.slice(0, round.missingCount);
  }

  const positions = getPositions(round.layout, round.maxNumber, round.messy);

  for (let n = 1; n <= round.maxNumber; n++) {
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = n;
    card.dataset.number = n;
    card.style.left = positions[n - 1].left + "%";
    card.style.top = positions[n - 1].top + "%";

    if (missingNumbers.includes(n)) {
      card.classList.add("gap"); // invisible, but still clickable
    }

    if (round.messy) {
      card.style.transform = `rotate(${randomBetween(-35, 35)}deg)`;
      card.style.fontSize = randomBetween(0.8, 1.4) + "rem";
      card.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    board.appendChild(card);
  }
}

// ===== Update the status bar =====
function updateStatus() {
  timerEl.textContent = clock;
  if (isSustain()) {
    timerTitleEl.textContent = "Elapsed";
    nextTitleEl.textContent = "Find";
    nextNumberEl.textContent = "Gaps";
    foundCountEl.textContent = `${gapsFound} / ${missingNumbers.length}`;
  } else {
    timerTitleEl.textContent = "Time left";
    nextTitleEl.textContent = "Find next";
    nextNumberEl.textContent = nextNumber <= TARGET_COUNT ? nextNumber : "Done";
    foundCountEl.textContent = `${nextNumber - 1} / ${TARGET_COUNT}`;
  }
}

// ===== Load a round =====
function loadRound(index) {
  currentRound = index;
  const round = ROUNDS[index];

  buildBoard(round);
  nextNumber = 1;
  gapsFound = 0;
  clock = isSustain() ? 0 : ROUND_SECONDS;
  board.classList.add("locked");

  roundLabelEl.textContent = `Round ${index + 1} of ${ROUNDS.length}: ${round.name}`;
  instructionsEl.innerHTML = `<h2>${round.title}</h2><p>${round.text}</p>`;

  buttonMode = "start";
  startBtn.textContent = "Start Round";
  startBtn.disabled = false;
  updateStatus();
}

// ===== Start the clock =====
function startRound() {
  roundActive = true;
  startBtn.disabled = true;
  board.classList.remove("locked");
  updateStatus();

  timerId = setInterval(() => {
    if (isSustain()) {
      clock++;
      updateStatus();
      if (clock >= SUSTAIN_LIMIT) endRound();
    } else {
      clock--;
      updateStatus();
      if (clock <= 0) endRound();
    }
  }, 1000);
}

// ===== End the round =====
function endRound() {
  clearInterval(timerId);
  roundActive = false;
  board.classList.add("locked");

  // --- Sustain round: record time, reveal gaps, show final summary ---
  if (isSustain()) {
    const solved = gapsFound === missingNumbers.length;
    scores[currentRound] = solved ? clock : null;
    document.getElementById(`score-${currentRound + 1}`).textContent = solved
      ? `${clock}s`
      : "Not found";
    board
      .querySelectorAll(".card.gap")
      .forEach((c) => c.classList.add("revealed"));
    showSummary(solved);

    buttonMode = "restart";
    startBtn.textContent = "Play Again";
    startBtn.disabled = false;
    return;
  }

  // --- Rounds 1-5 ---
  const score = nextNumber - 1;
  scores[currentRound] = score;
  document.getElementById(`score-${currentRound + 1}`).textContent =
    `${score}/${TARGET_COUNT}`;

  let comparison = "";
  if (currentRound > 0) {
    const change = score - scores[0];
    comparison = ` That is <strong>${change >= 0 ? "+" : ""}${change} cards</strong> compared with Baseline.`;
  }

  instructionsEl.innerHTML = `
    <h2>${ROUNDS[currentRound].name} complete</h2>
    <p>You found <strong>${score} of ${TARGET_COUNT}</strong> cards in ${ROUND_SECONDS - clock} seconds.${comparison}</p>
  `;

  buttonMode = "next";
  startBtn.textContent = `Next Round: ${ROUNDS[currentRound + 1].name}`;
  startBtn.disabled = false;
}

// ===== Final results and debrief =====
function showSummary(solved) {
  const base = scores[0];
  const std = scores[4];

  const rows = ROUNDS.slice(0, 5)
    .map((r, i) => {
      const change = scores[i] - base;
      const vsBase = i === 0 ? "–" : `${change >= 0 ? "+" : ""}${change}`;
      return `<tr><td>${r.name}</td><td>${scores[i]}/${TARGET_COUNT}</td><td>${vsBase}</td></tr>`;
    })
    .join("");

  const multiple =
    base > 0 ? `${(std / base).toFixed(1)}x` : "n/a (Baseline was 0)";
  const missingList = [...missingNumbers].sort((a, b) => a - b).join(" and ");
  const sustainText = solved
    ? `You spotted both missing cards in <strong>${scores[5]} seconds</strong>.`
    : `The missing cards were not found within ${SUSTAIN_LIMIT} seconds.`;

  instructionsEl.innerHTML = `
    <h2>Game complete: results</h2>
    <p>${sustainText} The missing cards were <strong>${missingList}</strong>.</p>
    <table class="summary-table">
      <thead><tr><th>Round</th><th>Cards found</th><th>vs Baseline</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Productivity, Baseline to Standardize: <strong>${multiple}</strong> with the same person, the same task and the same time.</p>
    <h3>Debrief questions</h3>
    <ol>
      <li>Which 5S step gave the biggest improvement, and why?</li>
      <li>How long would it take to find the two missing cards on the Baseline board?</li>
      <li>Where in your own work area is the "clutter" (cards 51 to 90)?</li>
      <li>What would it take to sustain the standard in your area: audits, visual controls, ownership?</li>
    </ol>
  `;
}

// ===== Card clicks =====
board.addEventListener("click", (event) => {
  if (!roundActive) return;

  const card = event.target.closest(".card");
  if (!card) return;

  // Sustain: only clicks on hidden gaps count
  if (isSustain()) {
    if (
      card.classList.contains("gap") &&
      !card.classList.contains("revealed")
    ) {
      card.classList.add("revealed");
      gapsFound++;
      updateStatus();
      if (gapsFound === missingNumbers.length) endRound();
    }
    return;
  }

  // Rounds 1-5: click in sequence
  if (Number(card.dataset.number) === nextNumber) {
    card.classList.add("found");
    nextNumber++;
    updateStatus();
    if (nextNumber > TARGET_COUNT) endRound();
  }
});

// ===== Reset for a new group =====
function resetGame() {
  scores.length = 0;
  for (let i = 1; i <= ROUNDS.length; i++) {
    document.getElementById(`score-${i}`).textContent = "–";
  }
  loadRound(0);
}

// ===== One button: Start, Next, or Play Again =====
startBtn.addEventListener("click", () => {
  if (buttonMode === "start") startRound();
  else if (buttonMode === "next") loadRound(currentRound + 1);
  else resetGame();
});

// ===== Run on page load =====
loadRound(0);
