import sudoku_logic


def test_get_index_renders_game_page(client):
    response = client.get('/')

    assert response.status_code == 200
    assert b'Sudoku Game' in response.data


def test_get_new_returns_puzzle(client):
    response = client.get('/new?clues=40')

    assert response.status_code == 200
    payload = response.get_json()
    puzzle = payload['puzzle']
    assert len(puzzle) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert sum(cell != sudoku_logic.EMPTY for row in puzzle for cell in row) == 40


def test_post_check_reports_incorrect_cells(client):
    client.get('/new')
    from app import CURRENT

    solution = CURRENT['solution']
    correct_response = client.post('/check', json={'board': solution})

    assert correct_response.status_code == 200
    assert correct_response.get_json() == {'incorrect': []}

    submitted_board = [row[:] for row in solution]
    submitted_board[0][0] = (submitted_board[0][0] % sudoku_logic.SIZE) + 1
    incorrect_response = client.post('/check', json={'board': submitted_board})

    assert incorrect_response.status_code == 200
    assert incorrect_response.get_json()['incorrect'] == [[0, 0]]