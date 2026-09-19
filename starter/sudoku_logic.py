import copy
import random

SIZE = 9
EMPTY = 0
Board = list[list[int]]

# Reviewed Copilot's suggestion: it benchmarked 26 clues at ~0.7s/puzzle, and my own timing
# (10 puzzles: 40 clues 0.83s, 32 clues 1.63s, 28 clues 4.42s, 26 clues 6.48s) showed 26 is
# noticeably slower. Hard uses 28 clues so New Game stays snappy.
DIFFICULTY_CLUES = {"easy": 40, "medium": 32, "hard": 28}


def deep_copy(board: Board) -> Board:
    """Return an independent copy of a Sudoku board."""
    return copy.deepcopy(board)


def create_empty_board() -> Board:
    """Create a blank Sudoku board."""
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def is_safe(board: Board, row: int, col: int, num: int) -> bool:
    """Return whether a number can be placed at a board position."""
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True


def fill_board(board: Board) -> bool:
    """Fill a board with a randomized valid Sudoku solution."""
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def count_solutions(board: Board, limit: int = 2) -> int:
    """Count solutions up to ``limit``, using the most constrained cell first."""
    if limit <= 0:
        return 0

    solutions = 0

    def search() -> None:
        """Search for solutions while restoring every temporary placement."""
        nonlocal solutions
        if solutions >= limit:
            return

        best_position = None
        best_candidates = None
        for row in range(SIZE):
            for col in range(SIZE):
                if board[row][col] != EMPTY:
                    continue
                candidates = [
                    number
                    for number in range(1, SIZE + 1)
                    if is_safe(board, row, col, number)
                ]
                if not candidates:
                    return
                if best_candidates is None or len(candidates) < len(best_candidates):
                    best_position = (row, col)
                    best_candidates = candidates

        if best_position is None:
            solutions += 1
            return

        row, col = best_position
        for candidate in best_candidates:
            board[row][col] = candidate
            search()
            board[row][col] = EMPTY
            if solutions >= limit:
                return

    search()
    return solutions


def remove_cells(board: Board, clues: int) -> None:
    """Remove cells while preserving a unique solution until clue count is met."""
    coordinates = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(coordinates)

    for row, col in coordinates:
        if sum(cell != EMPTY for current_row in board for cell in current_row) <= clues:
            return
        if board[row][col] == EMPTY:
            continue
        value = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(board, 2) != 1:
            board[row][col] = value


def generate_puzzle(clues: int = 35) -> tuple[Board, Board]:
    """Generate a uniquely solvable puzzle and its completed solution."""
    if clues < 17 or clues > SIZE * SIZE:
        raise ValueError("clues must be between 17 and 81")

    for _ in range(20):
        solution = create_empty_board()
        fill_board(solution)
        puzzle = deep_copy(solution)
        remove_cells(puzzle, clues)
        if sum(cell != EMPTY for row in puzzle for cell in row) == clues:
            return puzzle, solution

    raise ValueError(f"could not generate a puzzle with {clues} clues after 20 attempts")


def is_valid_board(board: object) -> bool:
    """Return whether a value is a valid 9x9 board of digits from 0 to 9."""
    return (
        isinstance(board, list)
        and len(board) == SIZE
        and all(
            isinstance(row, list)
            and len(row) == SIZE
            and all(
                isinstance(value, int)
                and not isinstance(value, bool)
                and EMPTY <= value <= SIZE
                for value in row
            )
            for row in board
        )
    )


def find_hint(puzzle: Board, solution: Board, board: Board) -> tuple[int, int, int] | None:
    """Return an editable empty or incorrect cell and its solution value."""
    candidates = [
        (row, col, solution[row][col])
        for row in range(SIZE)
        for col in range(SIZE)
        if puzzle[row][col] == EMPTY and board[row][col] != solution[row][col]
    ]
    return random.choice(candidates) if candidates else None
