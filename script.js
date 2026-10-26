// ===== Game settings =====
const TARGET_COUNT = 50; // cards the player must find (1-50)
const TOTAL_CARDS = 90; // baseline adds 51-90 as clutter
const ROUND_SECONDS = 30; // length of each round
const GRID_COLS = 12; // invisible grid used to stop cards overlapping
const GRID_ROWS = 8; // 12 x 8 = 96 slots, enough for 90 cards
const COLORS = [
  "#ffd6d6",
  "#d6e8ff",
  "#fff3c4",
  "#d9f7d9",
  "#ead9ff",
  "#ffe2c7",
];

// ===== Page elements =====
const board = document.getElementById("board");
const timerEl = document.getElementById("timer");
const nextNumberEl = document.getElementById("next-number");
const foundCountEl = document.getElementById("found-count");
const startBtn = document.getElementById("start-btn");
const instructionsEl = document.getElementById("instructions");

// ===== Game state (values that change while playing) =====
let nextNumber = 1; // the number the player must click next
let timeLeft = ROUND_SECONDS;
let timerId = null; // reference to the running countdown
let roundActive = false; // true only while the clock is running
let currentRound = 1; // used to save the score in the right box

// ===== Helper: shuffle a list into random order =====
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// ===== Helper: random number between min and max =====
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// ===== Build the Baseline (messy) board =====
function buildBaselineBoard() {
  board.innerHTML = "";

  const slots = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      slots.push({ row, col });
    }
  }
  shuffle(slots);

  const cellWidth = 100 / GRID_COLS;
  const cellHeight = 100 / GRID_ROWS;

  for (let n = 1; n <= TOTAL_CARDS; n++) {
    const slot = slots[n - 1];
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = n;
    card.dataset.number = n;

    const left = slot.col * cellWidth + randomBetween(0.5, cellWidth * 0.35);
    const top = slot.row * cellHeight + randomBetween(0.5, cellHeight * 0.35);
    card.style.left = left + "%";
    card.style.top = top + "%";

    card.style.transform = `rotate(${randomBetween(-35, 35)}deg)`;
    card.style.fontSize = randomBetween(0.8, 1.4) + "rem";
    card.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];

    board.appendChild(card);
  }
}

// ===== Update the status bar numbers =====
function updateStatus() {
  timerEl.textContent = timeLeft;
  nextNumberEl.textContent = nextNumber <= TARGET_COUNT ? nextNumber : "Done";
  foundCountEl.textContent = `${nextNumber - 1} / ${TARGET_COUNT}`;
}

// ===== Start a round =====
function startRound() {
  nextNumber = 1;
  timeLeft = ROUND_SECONDS;
  roundActive = true;
  startBtn.disabled = true;
  board.classList.remove("locked");
  updateStatus();

  // Count down once per second
  timerId = setInterval(() => {
    timeLeft--;
    updateStatus();
    if (timeLeft <= 0) {
      endRound();
    }
  }, 1000);
}

// ===== End a round (time up or all 50 found) =====
function endRound() {
  clearInterval(timerId);
  roundActive = false;
  board.classList.add("locked");

  const score = nextNumber - 1;
  document.getElementById(`score-${currentRound}`).textContent =
    `${score}/${TARGET_COUNT}`;

  instructionsEl.innerHTML = `
    <h2>Time's up</h2>
    <p>You found <strong>${score} of ${TARGET_COUNT}</strong> cards in ${ROUND_SECONDS - timeLeft} seconds.</p>
  `;
}

// ===== Handle a click anywhere on the board =====
board.addEventListener("click", (event) => {
  if (!roundActive) return; // ignore clicks before Start / after time up

  const card = event.target.closest(".card");
  if (!card) return; // clicked empty space

  const clicked = Number(card.dataset.number);
  if (clicked === nextNumber) {
    card.classList.add("found");
    nextNumber++;
    updateStatus();

    if (nextNumber > TARGET_COUNT) {
      // all 50 found before time ran out
      endRound();
    }
  }
  // Wrong numbers are ignored, just like the original game
});

// ===== Wire up the Start button =====
startBtn.addEventListener("click", startRound);

// ===== Run on page load =====
buildBaselineBoard();
board.classList.add("locked"); // board stays locked until Start is pressed
updateStatus();
