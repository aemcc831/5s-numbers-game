// ===== Game settings =====
const TARGET_COUNT = 50; // cards the player must find (1-50)
const ROUND_SECONDS = 30; // length of each round
const GRID_COLS = 12; // invisible grid used to stop cards overlapping
const GRID_ROWS = 8; // 12 x 8 = 96 slots
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
];

// ===== Page elements =====
const board = document.getElementById("board");
const timerEl = document.getElementById("timer");
const nextNumberEl = document.getElementById("next-number");
const foundCountEl = document.getElementById("found-count");
const startBtn = document.getElementById("start-btn");
const instructionsEl = document.getElementById("instructions");
const roundLabelEl = document.getElementById("round-label");

// ===== Game state =====
let nextNumber = 1;
let timeLeft = ROUND_SECONDS;
let timerId = null;
let roundActive = false;
let currentRound = 0; // 0 = Baseline, 4 = Standardize
let buttonMode = "start"; // "start" = begin round, "next" = load next round
const scores = []; // score for each round, used for comparisons

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

// ===== Work out where every card goes (returns left/top in %) =====
function getPositions(layout, count, messy) {
  const cellW = 100 / GRID_COLS;
  const cellH = 100 / GRID_ROWS;

  // Turn a grid slot into a position; messy rounds get a random nudge
  const toPos = (col, row) => ({
    left:
      col * cellW + (messy ? randomBetween(0.5, cellW * 0.35) : cellW * 0.2),
    top:
      row * cellH + (messy ? randomBetween(0.5, cellH * 0.35) : cellH * 0.25),
  });

  // Standardize: 10 columns x 5 rows, in number order
  if (layout === "standard") {
    const cols = 10;
    const rows = 5;
    return Array.from({ length: count }, (_, i) => ({
      left: (i % cols) * (100 / cols) + 2.5,
      top: Math.floor(i / cols) * (100 / rows) + 6,
    }));
  }

  // Set in Order: card 1 -> Q1, 2 -> Q2, 3 -> Q3, 4 -> Q4, 5 -> Q1 ...
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

  // Random: any free slot on the board
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

  const positions = getPositions(round.layout, round.maxNumber, round.messy);

  for (let n = 1; n <= round.maxNumber; n++) {
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = n;
    card.dataset.number = n;
    card.style.left = positions[n - 1].left + "%";
    card.style.top = positions[n - 1].top + "%";

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
  timerEl.textContent = timeLeft;
  nextNumberEl.textContent = nextNumber <= TARGET_COUNT ? nextNumber : "Done";
  foundCountEl.textContent = `${nextNumber - 1} / ${TARGET_COUNT}`;
}

// ===== Load a round (board, text, button) =====
function loadRound(index) {
  currentRound = index;
  const round = ROUNDS[index];

  buildBoard(round);
  nextNumber = 1;
  timeLeft = ROUND_SECONDS;
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
    timeLeft--;
    updateStatus();
    if (timeLeft <= 0) {
      endRound();
    }
  }, 1000);
}

// ===== End the round, save score, set up the next step =====
function endRound() {
  clearInterval(timerId);
  roundActive = false;
  board.classList.add("locked");

  const score = nextNumber - 1;
  scores[currentRound] = score;
  document.getElementById(`score-${currentRound + 1}`).textContent =
    `${score}/${TARGET_COUNT}`;

  // Compare with Baseline (skipped in round 1)
  let comparison = "";
  if (currentRound > 0) {
    const change = score - scores[0];
    comparison = ` That is <strong>${change >= 0 ? "+" : ""}${change} cards</strong> compared with Baseline.`;
  }

  instructionsEl.innerHTML = `
    <h2>${ROUNDS[currentRound].name} complete</h2>
    <p>You found <strong>${score} of ${TARGET_COUNT}</strong> cards in ${ROUND_SECONDS - timeLeft} seconds.${comparison}</p>
  `;

  if (currentRound < ROUNDS.length - 1) {
    buttonMode = "next";
    startBtn.textContent = `Next Round: ${ROUNDS[currentRound + 1].name}`;
    startBtn.disabled = false;
  } else {
    startBtn.textContent = "All Rounds Complete";
    startBtn.disabled = true;
  }
}

// ===== Card clicks =====
board.addEventListener("click", (event) => {
  if (!roundActive) return;

  const card = event.target.closest(".card");
  if (!card) return;

  if (Number(card.dataset.number) === nextNumber) {
    card.classList.add("found");
    nextNumber++;
    updateStatus();
    if (nextNumber > TARGET_COUNT) {
      endRound();
    }
  }
});

// ===== One button: Start Round or Next Round =====
startBtn.addEventListener("click", () => {
  if (buttonMode === "start") {
    startRound();
  } else {
    loadRound(currentRound + 1);
  }
});

// ===== Run on page load =====
loadRound(0);
