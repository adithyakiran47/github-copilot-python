// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let hintCount = 0;
let elapsedSeconds = 0;
let timerInterval = null;
let selectedDigit = null;

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

function setMessage(text, tone = 'info') {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.classList.remove('status-info', 'status-success', 'status-error', 'status-warning');
  msg.classList.add(`status-${tone}`);
}

function renderScores(scores) {
  const body = document.getElementById('scoreboard-body');
  body.textContent = '';
  scores.forEach((score, index) => {
    const row = document.createElement('tr');
    [index + 1, score.name, formatTime(score.seconds), score.difficulty, score.hints]
      .forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
    body.appendChild(row);
  });
}

function showScoreEntry() {
  document.getElementById('score-entry').hidden = false;
  document.getElementById('score-name').focus();
}

function hideScoreEntry() {
  document.getElementById('score-entry').hidden = true;
  document.getElementById('score-name').value = '';
}

function updateScoreboardStatus() {
  const status = document.getElementById('scoreboard-status');
  status.textContent = window.scoreboardStorageError || '';
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
      input.inputMode = 'numeric';
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('aria-label', `Row ${i + 1}, column ${j + 1}`);
      input.className = 'sudoku-cell';
      const boxClass = ((Math.floor(i / 3) + Math.floor(j / 3)) % 2 === 0) ? 'box-a' : 'box-b';
      input.classList.add(boxClass);
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

function renderDigitTracker() {
  const tracker = document.getElementById('digit-tracker');
  const inputs = Array.from(document.querySelectorAll('#sudoku-board input'));
  const counts = Array(SIZE + 1).fill(0);
  const hasConflicts = Array(SIZE + 1).fill(false);

  inputs.forEach((input) => {
    const value = Number(input.value);
    if (value >= 1 && value <= SIZE) {
      counts[value] += 1;
      if (input.classList.contains('conflict')) hasConflicts[value] = true;
      input.classList.toggle('match', selectedDigit === value);
    } else {
      input.classList.remove('match');
    }
  });

  tracker.querySelectorAll('.digit-button').forEach((button) => {
    const digit = Number(button.dataset.digit);
    const remaining = SIZE - counts[digit];
    const complete = remaining === 0 && !hasConflicts[digit];
    button.querySelector('.digit-button-count').textContent = remaining;
    button.classList.toggle('selected', selectedDigit === digit);
    button.classList.toggle('completed', complete);
    button.setAttribute('aria-pressed', selectedDigit === digit ? 'true' : 'false');
    button.setAttribute('aria-label', complete
      ? `${digit}: all placed`
      : `${digit}: ${remaining} missing`);
  });
}

function renderPuzzle(puz) {
  puzzle = puz;
  hintCount = 0;
  selectedDigit = null;
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
  updateConflicts();
  renderDigitTracker();
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
    hideScoreEntry();
    setMessage('', 'info');
  } catch (error) {
    setMessage(`Error: ${error.message || 'Network error. Please try again.'}`, 'error');
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
    setMessage(`Error: ${data.error}`, 'error');
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
    setMessage(`Success: Congratulations! Solved in ${formatTime(elapsedSeconds)} with ${hintCount} hints.`, 'success');
    const scores = loadScores();
    if (isTopTen(elapsedSeconds, scores, hintCount)) showScoreEntry();
    updateScoreboardStatus();
  } else if (incorrect.size === 0) {
    setMessage('Warning: Keep going! The board is incomplete.', 'warning');
  } else {
    setMessage('Error: Some cells are incorrect.', 'error');
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
    setMessage(`Error: ${data.error || 'Unable to get a hint.'}`, 'error');
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
  renderDigitTracker();
  setMessage('Hint: A valid value has been filled in.', 'info');
}

function setTheme(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  const toggle = document.getElementById('theme-toggle');
  const icon = toggle.querySelector('.theme-icon');
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  icon.innerHTML = isDark ? '&#9728;' : '&#9790;';
  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('title', label);
}

function initializeTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('sudoku-theme');
  } catch (error) {
    savedTheme = null;
  }
  const isDark = savedTheme
    ? savedTheme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(isDark);
}

// Wire buttons
window.addEventListener('load', () => {
  initializeTheme();
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark-mode');
    setTheme(isDark);
    try {
      localStorage.setItem('sudoku-theme', isDark ? 'dark' : 'light');
    } catch (error) {
    }
  });
  renderScores(loadScores());
  updateScoreboardStatus();
  // Copilot suggested a custom board keyboard model (arrow-key navigation, Enter/Space activation, selected-cell state). 
  // I did not apply it: the cells are native <input> elements that are already reachable and usable with Tab, 
  // and a custom key handler is a large change that risks breaking this delegated input listener.
  document.getElementById('sudoku-board').addEventListener('input', (event) => {
    if (!event.target.matches('input.sudoku-cell') || event.target.disabled) return;
    event.target.value = event.target.value.replace(/[^1-9]/g, '').slice(0, 1);
    updateConflicts();
    renderDigitTracker();
  });
  document.getElementById('digit-tracker').addEventListener('click', (event) => {
    const button = event.target.closest('.digit-button');
    if (!button) return;
    const digit = Number(button.dataset.digit);
    selectedDigit = selectedDigit === digit ? null : digit;
    renderDigitTracker();
  });
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('difficulty').addEventListener('change', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint').addEventListener('click', requestHint);
  document.getElementById('save-score').addEventListener('click', () => {
    const scores = loadScores();
    const entry = {
      name: document.getElementById('score-name').value.trim() || 'Anonymous',
      seconds: elapsedSeconds,
      difficulty: document.getElementById('difficulty').value,
      hints: hintCount,
      date: new Date().toISOString()
    };
    const updatedScores = addScore(entry, scores);
    if (saveScores(updatedScores)) {
      renderScores(updatedScores);
      hideScoreEntry();
    }
    updateScoreboardStatus();
  });
  // initialize
  newGame();
});