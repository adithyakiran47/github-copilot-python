import pytest

import sudoku_logic


def assert_valid_complete_grid(board):
    expected = set(range(1, sudoku_logic.SIZE + 1))

    assert len(board) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in board)
    assert all(set(row) == expected for row in board)
    assert all(
        {board[row][column] for row in range(sudoku_logic.SIZE)} == expected
        for column in range(sudoku_logic.SIZE)
    )
    assert all(
        {
            board[row][column]
            for row in range(box_row, box_row + 3)
            for column in range(box_column, box_column + 3)
        }
        == expected
        for box_row in range(0, sudoku_logic.SIZE, 3)
        for box_column in range(0, sudoku_logic.SIZE, 3)
    )


def test_is_safe_rejects_row_column_and_box_conflicts():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5

    assert sudoku_logic.is_safe(board, 0, 1, 5) is False
    assert sudoku_logic.is_safe(board, 1, 0, 5) is False
    assert sudoku_logic.is_safe(board, 1, 1, 5) is False
    assert sudoku_logic.is_safe(board, 1, 1, 4) is True


def test_fill_board_produces_a_valid_complete_grid():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.fill_board(board) is True
    assert_valid_complete_grid(board)


def test_generate_puzzle_has_requested_clues_and_matches_solution():
    clues = 35

    puzzle, solution = sudoku_logic.generate_puzzle(clues)

    assert_valid_complete_grid(solution)
    assert sum(cell != sudoku_logic.EMPTY for row in puzzle for cell in row) == clues
    for puzzle_row, solution_row in zip(puzzle, solution):
        for puzzle_cell, solution_cell in zip(puzzle_row, solution_row):
            if puzzle_cell != sudoku_logic.EMPTY:
                assert puzzle_cell == solution_cell


@pytest.mark.parametrize("clues", [35, 28])
def test_generated_puzzles_have_exactly_one_solution(clues):
    for _ in range(3):
        puzzle, _ = sudoku_logic.generate_puzzle(clues)

        assert sudoku_logic.count_solutions(puzzle, 2) == 1


def test_count_solutions_stops_after_multiple_solutions():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.count_solutions(board, limit=2) == 2


@pytest.mark.parametrize("clues", [16, 82])
def test_generate_puzzle_rejects_out_of_range_clues(clues):
    with pytest.raises(ValueError):
        sudoku_logic.generate_puzzle(clues)