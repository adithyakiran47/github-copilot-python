// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let hintCount = 0;
let elapsedSeconds = 0;
let timerInterval = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  elapsedSeconds = 0;
  document.getElementById('timer').innerText = formatTime(elapsedSeconds);
}

function startTimer() {
  resetTimer();
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    document.getElementById('timer').innerText = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function updateConflicts() {
  const inputs = Array.from(document.querySelectorAll('#sudoku-board input'));
  const values = inputs.map((input) => input.value);
  inputs.forEach((input, index) => {
    const value = values[index];
    if (!value) {
      input.classList.remove('conflict');
      return;
    }

    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);
    // A duplicate is conflicting when it shares any Sudoku unit with this cell.
    const hasConflict = inputs.some((other, otherIndex) => {
      if (otherIndex === index || values[otherIndex] !== value) return false;
      const otherRow = Number(other.dataset.row);
      const otherCol = Number(other.dataset.col);
      return (
        otherRow === row
        || otherCol === col
        || (Math.floor(otherRow / 3) === Math.floor(row / 3)
          && Math.floor(otherCol / 3) === Math.floor(col / 3))
      );
    });
    input.classList.toggle('conflict', hasConflict);
  });
}

function renderPuzzle(puz) {
  puzzle = puz;
  hintCount = 0;
  document.getElementById('hint-count').innerText = hintCount;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
  startTimer();
}

async function newGame() {
  const difficulty = document.getElementById('difficulty').value;
  const msg = document.getElementById('message');
  try {
    const res = await fetch(`/new?difficulty=${encodeURIComponent(difficulty)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to start a new game.');
    }
    renderPuzzle(data.puzzle);
    msg.style.color = '';
    msg.innerText = '';
  } catch (error) {
    msg.style.color = '#d32f2f';
    msg.innerText = error.message || 'Network error. Please try again.';
  }
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    inp.classList.remove('incorrect');
    if (inp.disabled) continue;
    if (incorrect.has(idx)) inp.classList.add('incorrect');
  }
  if (data.complete) {
    stopTimer();
    msg.style.color = '#388e3c';
    msg.innerText = `Congratulations! Solved in ${formatTime(elapsedSeconds)} with ${hintCount} hints.`;
  } else if (incorrect.size === 0) {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Keep going! The board is incomplete.';
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

function getBoard() {
  const inputs = document.querySelectorAll('#sudoku-board input');
  const board = [];
  for (let row = 0; row < SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < SIZE; col++) {
      const value = inputs[row * SIZE + col].value;
      board[row][col] = value ? parseInt(value, 10) : 0;
    }
  }
  return board;
}

async function requestHint() {
  const res = await fetch('/hint', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board: getBoard()})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (!res.ok) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error || 'Unable to get a hint.';
    return;
  }

  const input = document.querySelector(
    `#sudoku-board input[data-row="${data.row}"][data-col="${data.col}"]`
  );
  input.value = data.value;
  input.disabled = true;
  input.classList.add('hinted');
  hintCount += 1;
  document.getElementById('hint-count').innerText = hintCount;
  updateConflicts();
  msg.innerText = '';
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('sudoku-board').addEventListener('input', (event) => {
    if (!event.target.matches('input.sudoku-cell') || event.target.disabled) return;
    event.target.value = event.target.value.replace(/[^1-9]/g, '').slice(0, 1);
    updateConflicts();
  });
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('difficulty').addEventListener('change', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint').addEventListener('click', requestHint);
  // initialize
  newGame();
});