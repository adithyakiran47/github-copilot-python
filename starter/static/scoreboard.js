// Local top-ten scoreboard helpers.
const SCORE_STORAGE_KEY = 'sudokuTop10';
const MAX_SCORES = 10;

function scoreSort(a, b) {
  return a.seconds - b.seconds || a.hints - b.hints;
}

function validScore(score) {
  return score
    && typeof score.name === 'string'
    && Number.isFinite(score.seconds)
    && typeof score.difficulty === 'string'
    && Number.isFinite(score.hints)
    && typeof score.date === 'string';
}

/** Load valid scores from localStorage, returning an empty list on failure. */
function loadScores() {
  try {
    const stored = localStorage.getItem(SCORE_STORAGE_KEY);
    if (!stored) {
      window.scoreboardStorageError = '';
      return [];
    }
    const scores = JSON.parse(stored);
    if (!Array.isArray(scores) || !scores.every(validScore)) {
      throw new Error('Invalid scoreboard data');
    }
    window.scoreboardStorageError = '';
    return scores.sort(scoreSort).slice(0, MAX_SCORES);
  } catch (error) {
    window.scoreboardStorageError = 'Scoreboard storage is unavailable. Scores will not persist.';
    return [];
  }
}

/** Save scores to localStorage, returning false when storage is unavailable. */
function saveScores(scores) {
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores));
    window.scoreboardStorageError = '';
    return true;
  } catch (error) {
    window.scoreboardStorageError = 'Scoreboard storage is unavailable. Scores will not persist.';
    return false;
  }
}

/** Return whether a time and hint count would place in the current top ten. */
function isTopTen(seconds, scores, hints = 0) {
  if (!Number.isFinite(seconds) || !Number.isFinite(hints)) return false;
  if (scores.length < MAX_SCORES) return true;
  return scoreSort({seconds, hints}, scores[MAX_SCORES - 1]) < 0;
}

/** Add an entry, sort it by time and hints, and cap the result at ten scores. */
function addScore(entry, scores) {
  return scores.concat(entry).sort(scoreSort).slice(0, MAX_SCORES);
}

window.loadScores = loadScores;
window.saveScores = saveScores;
window.isTopTen = isTopTen;
window.addScore = addScore;