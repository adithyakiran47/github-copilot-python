import pytest

import sudoku_logic


def test_get_index_renders_game_page(client):
    response = client.get('/')

    assert response.status_code == 200
    assert b'Sudoku Game' in response.data


@pytest.mark.parametrize('difficulty, clues', [('easy', 40), ('medium', 32), ('hard', 28)])
def test_get_new_returns_puzzle_for_difficulty(client, difficulty, clues):
    response = client.get(f'/new?difficulty={difficulty}')

    assert response.status_code == 200
    payload = response.get_json()
    assert payload['difficulty'] == difficulty
    puzzle = payload['puzzle']
    assert len(puzzle) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert sum(cell != sudoku_logic.EMPTY for row in puzzle for cell in row) == clues


def test_get_new_defaults_to_medium(client):
    response = client.get('/new')

    assert response.status_code == 200
    payload = response.get_json()
    assert payload['difficulty'] == 'medium'
    assert sum(cell != sudoku_logic.EMPTY for row in payload['puzzle'] for cell in row) == 32


def test_get_new_rejects_unknown_difficulty(client):
    response = client.get('/new?difficulty=impossible')

    assert response.status_code == 400
    assert response.get_json()['error']


def test_post_check_reports_incorrect_cells(client):
    client.get('/new')
    from app import CURRENT

    solution = CURRENT['solution']
    correct_response = client.post('/check', json={'board': solution})

    assert correct_response.status_code == 200
    assert correct_response.get_json() == {'incorrect': [], 'complete': True}

    submitted_board = [row[:] for row in solution]
    submitted_board[0][0] = (submitted_board[0][0] % sudoku_logic.SIZE) + 1
    incorrect_response = client.post('/check', json={'board': submitted_board})

    assert incorrect_response.status_code == 200
    assert incorrect_response.get_json() == {'incorrect': [[0, 0]], 'complete': False}


def test_post_check_does_not_flag_empty_cells(client):
    client.get('/new')
    from app import CURRENT

    response = client.post('/check', json={'board': CURRENT['puzzle']})

    assert response.status_code == 200
    assert response.get_json() == {'incorrect': [], 'complete': False}


def test_post_check_rejects_invalid_board_shape(client):
    client.get('/new')

    response = client.post('/check', json={'board': []})

    assert response.status_code == 400
    assert response.get_json()['error']


def test_post_hint_returns_solution_value_for_empty_cell(client):
    client.get('/new')
    from app import CURRENT

    response = client.post('/hint', json={'board': CURRENT['puzzle']})

    assert response.status_code == 200
    hint = response.get_json()
    assert CURRENT['puzzle'][hint['row']][hint['col']] == sudoku_logic.EMPTY
    assert hint['value'] == CURRENT['solution'][hint['row']][hint['col']]


def test_post_hint_rejects_request_without_game(client):
    response = client.post('/hint', json={'board': sudoku_logic.create_empty_board()})

    assert response.status_code == 400
    assert response.get_json()['error'] == 'No game in progress'