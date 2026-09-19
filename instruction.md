<!-- Mirror of .github/copilot-instructions.md, the copy GitHub Copilot loads automatically. Kept at the root so it is easy to find. -->
# Copilot Instructions: Flask Sudoku

## Project
Flask + vanilla JS Sudoku game. Backend logic lives in `sudoku_logic.py`,
routes in `app.py`, UI in `templates/` and `static/`.

## Code style
- Python 3.10+, PEP 8, type hints and short docstrings on every function.
- Keep game logic (generation, solving, validation) out of `app.py`; routes only call into `sudoku_logic.py`.
- Small single-purpose functions. No global state beyond what is already in `app.py`.
- Consistent error handling: routes return JSON `{"error": "..."}` with a proper HTTP status.
- JavaScript: ES6+, `const`/`let`, async/await, no jQuery. Comment non-obvious logic.

## UI
- Plain CSS with CSS variables for theming. Dark mode is toggled with a `dark-mode` class on `<body>`.
- Alternating colours on the 3x3 boxes, responsive from mobile to desktop, readable text in both themes.

## Testing
- pytest. Every new feature gets tests. Run the tests after every change.

## Behaviour
- Prefer small, reviewable changes. Explain what you changed and why.
- Do not remove existing features when refactoring.