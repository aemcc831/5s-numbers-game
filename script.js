// ===== Game settings =====
const TARGET_COUNT = 50; // cards the player must find (1-50)
const TOTAL_CARDS = 90; // baseline adds 51-90 as clutter
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
  board.innerHTML = ""; // clear anything already on the board

  // 1. List every grid slot, then shuffle so each card gets a random slot
  const slots = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      slots.push({ row, col });
    }
  }
  shuffle(slots);

  const cellWidth = 100 / GRID_COLS; // in % of board width
  const cellHeight = 100 / GRID_ROWS; // in % of board height

  // 2. Create one card per number
  for (let n = 1; n <= TOTAL_CARDS; n++) {
    const slot = slots[n - 1];
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = n;
    card.dataset.number = n;

    // Position: inside its slot, nudged a little so it looks messy
    const left = slot.col * cellWidth + randomBetween(0.5, cellWidth * 0.35);
    const top = slot.row * cellHeight + randomBetween(0.5, cellHeight * 0.35);
    card.style.left = left + "%";
    card.style.top = top + "%";

    // Messiness: random tilt, size, and color
    card.style.transform = `rotate(${randomBetween(-35, 35)}deg)`;
    card.style.fontSize = randomBetween(0.8, 1.4) + "rem";
    card.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];

    board.appendChild(card);
  }
}

// ===== Run on page load =====
buildBaselineBoard();
