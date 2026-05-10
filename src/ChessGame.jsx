import React, {
  useState,
  useEffect,
} from 'react'

import { Chess } from 'chess.js'

import { useParams } from 'react-router-dom'

import { socket } from './socket'

import './index.css'

const ChessGame = () => {
  const [game, setGame] = useState(
    new Chess()
  )

  const [selectedSquare, setSelectedSquare] =
    useState(null)

  const [moveHistory, setMoveHistory] =
    useState([])

  const [playerColor, setPlayerColor] =
    useState(null)

  const [players, setPlayers] =
    useState([])

  const { roomId } = useParams()

  useEffect(() => {
    if (roomId) {
      socket.emit('joinRoom', roomId)

      socket.on(
        'playerColor',
        (color) => {
          setPlayerColor(color)
        }
      )

      socket.on('players', (data) => {
        setPlayers(data)
      })

      socket.on('roomFull', () => {
        alert('Room is full')
      })
    }

    return () => {
      socket.off('playerColor')
      socket.off('players')
      socket.off('roomFull')
    }
  }, [roomId])

  useEffect(() => {
    socket.on(
      'receiveMove',
      (move) => {
        setGame((currentGame) => {
          const gameCopy =
            new Chess(
              currentGame.fen()
            )

          gameCopy.move(move)

          setMoveHistory(
            gameCopy.history()
          )

          return gameCopy
        })
      }
    )

    return () => {
      socket.off('receiveMove')
    }
  }, [])

  const getValidMoves = (square) => {
    return game
      .moves({
        square,
        verbose: true,
      })
      .map((m) => m.to)
  }

  const canMovePiece = (piece) => {
    if (!roomId) return true

    if (!piece) return false

    return (
      (playerColor === 'white' &&
        piece.color === 'w') ||
      (playerColor === 'black' &&
        piece.color === 'b')
    )
  }

  const movePiece = (from, to) => {
    const gameCopy = new Chess(
      game.fen()
    )

    const move = gameCopy.move({
      from,
      to,
      promotion: 'q',
    })

    if (move) {
      setGame(gameCopy)

      setMoveHistory(
        gameCopy.history()
      )

      if (roomId) {
        socket.emit('move', {
          roomId,
          move: {
            from,
            to,
            promotion: 'q',
          },
        })
      }
    }

    setSelectedSquare(null)
  }

  const onSquareClick = (square) => {
    const piece = game.get(square)

    if (!selectedSquare) {
      if (
        piece &&
        piece.color === game.turn() &&
        canMovePiece(piece)
      ) {
        setSelectedSquare(square)
      }

      return
    }

    const validMoves =
      getValidMoves(selectedSquare)

    if (validMoves.includes(square)) {
      movePiece(
        selectedSquare,
        square
      )

      return
    }

    if (
      piece &&
      piece.color === game.turn() &&
      canMovePiece(piece)
    ) {
      setSelectedSquare(square)

      return
    }

    setSelectedSquare(null)
  }

  const resetGame = () => {
    setGame(new Chess())

    setSelectedSquare(null)

    setMoveHistory([])
  }

  const pieceSymbols = {
    w: {
      k: '♔',
      q: '♕',
      r: '♖',
      b: '♗',
      n: '♘',
      p: '♙',
    },

    b: {
      k: '♚',
      q: '♛',
      r: '♜',
      b: '♝',
      n: '♞',
      p: '♟',
    },
  }

  const renderBoard = () => {
    const board = []

    const ranks = [
      '8',
      '7',
      '6',
      '5',
      '4',
      '3',
      '2',
      '1',
    ]

    const files = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
    ]

    ranks.forEach((rank, rIdx) => {
      files.forEach(
        (file, cIdx) => {
          const square = `${file}${rank}`

          const piece =
            game.get(square)

          const isDark =
            (rIdx + cIdx) % 2 === 1

          const isSelected =
            square ===
            selectedSquare

          const isValidMove =
            selectedSquare &&
            getValidMoves(
              selectedSquare
            ).includes(square)

          const kingInCheck =
            piece &&
            piece.type === 'k' &&
            piece.color ===
              game.turn() &&
            game.isCheck()

          board.push(
            <div
              key={square}
              onClick={() =>
                onSquareClick(square)
              }
              className={`
              square
              ${
                isDark
                  ? 'dark'
                  : 'light'
              }
              ${
                isSelected
                  ? 'selected'
                  : ''
              }
              ${
                isValidMove
                  ? 'valid'
                  : ''
              }
              ${
                kingInCheck
                  ? 'check'
                  : ''
              }
            `}
            >
              {piece && (
                <span
                  className={`piece ${
                    piece.color ===
                    'w'
                      ? 'white-piece'
                      : 'black-piece'
                  }`}
                >
                  {
                    pieceSymbols[
                      piece.color
                    ][piece.type]
                  }
                </span>
              )}
            </div>
          )
        }
      )
    })

    return board
  }

  const getStatus = () => {
    if (game.isCheckmate()) {
      return game.turn() === 'w'
        ? 'Checkmate! Black Wins!'
        : 'Checkmate! White Wins!'
    }

    if (game.isDraw())
      return 'Draw!'

    if (game.isCheck()) {
      return game.turn() === 'w'
        ? 'White King in Check!'
        : 'Black King in Check!'
    }

    return game.turn() === 'w'
      ? "White's Turn"
      : "Black's Turn"
  }

  return (
    <div className="chess-app">
      <div className="chess-container">
        <div className="board-wrapper">
          <div className="top-bar">
            <h1 className="game-title">
              ♟ Chess Arena
            </h1>

            <button
              className="new-game-btn"
              onClick={resetGame}
            >
              New Game
            </button>
          </div>

          {!roomId && (
            <button
              className="new-game-btn"
              style={{
                marginBottom: '15px',
              }}
              onClick={() => {
                const id =
                  crypto.randomUUID()

                window.location.href = `/room/${id}`
              }}
            >
              Create Multiplayer Room
            </button>
          )}

          {roomId && (
            <div
              style={{
                marginBottom: '15px',
                fontWeight: 'bold',
              }}
            >
              You are playing as:{' '}
              {playerColor || '...'}
            </div>
          )}

          {roomId &&
            players.length < 2 && (
              <div
                style={{
                  marginBottom: '15px',
                  color: 'red',
                  fontWeight: 'bold',
                }}
              >
                Waiting for opponent...
              </div>
            )}

          <div className="board">
            {renderBoard()}
          </div>
        </div>

        <div className="sidebar">
          <h2>Game Status</h2>

          <div className="status-box">
            {getStatus()}
          </div>

          <div className="moves-box">
            <h3>Move History</h3>

            {moveHistory.length ===
            0 ? (
              <p>No moves yet</p>
            ) : (
              moveHistory.map(
                (move, index) => (
                  <div
                    key={index}
                    className="move"
                  >
                    {index + 1}.{' '}
                    {move}
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChessGame