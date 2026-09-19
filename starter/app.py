from flask import Flask, render_template, jsonify, request
import sudoku_logic

app = Flask(__name__)

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', 'medium')
    if difficulty not in sudoku_logic.DIFFICULTY_CLUES:
        return jsonify({'error': f'Unknown difficulty: {difficulty}'}), 400

    clues = sudoku_logic.DIFFICULTY_CLUES[difficulty]
    try:
        puzzle, solution = sudoku_logic.generate_puzzle(clues)
    except ValueError as error:
        return jsonify({'error': str(error)}), 500

    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    return jsonify({'difficulty': difficulty, 'puzzle': puzzle})

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.get_json(silent=True)
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400

    if not isinstance(data, dict) or not isinstance(data.get('board'), list):
        return jsonify({'error': 'Board must be a 9x9 grid.'}), 400

    board = data['board']
    if (
        len(board) != sudoku_logic.SIZE
        or any(
            not isinstance(row, list)
            or len(row) != sudoku_logic.SIZE
            or any(
                isinstance(value, bool)
                or not isinstance(value, int)
                or value < sudoku_logic.EMPTY
                or value > sudoku_logic.SIZE
                for value in row
            )
            for row in board
        )
    ):
        return jsonify({'error': 'Board must be a 9x9 grid of digits from 0 to 9.'}), 400

    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            # Empty cells are incomplete, not incorrect guesses.
            if board[i][j] != sudoku_logic.EMPTY and board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    complete = not any(
        board[i][j] != solution[i][j]
        for i in range(sudoku_logic.SIZE)
        for j in range(sudoku_logic.SIZE)
    )
    return jsonify({'incorrect': incorrect, 'complete': complete})

if __name__ == '__main__':
    app.run(debug=True)