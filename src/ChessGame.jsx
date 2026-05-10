import React, { useState } from 'react'
import { Chess } from 'chess.js'
import './index.css'

const ChessGame = () => {
  const [game, setGame] = useState(new Chess())
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [moveHistory, setMoveHistory] = useState([])

  const getValidMoves = (square) => {
    return game.moves({ square, verbose: true }).map((m) => m.to)
  }

  const movePiece = (from, to) => {
    const gameCopy = new Chess(game.fen())

    const move = gameCopy.move({
      from,
      to,
      promotion: 'q',
    })

    if (move) {
      setGame(gameCopy)
      setMoveHistory(gameCopy.history())
    }

    setSelectedSquare(null)
  }

  const onSquareClick = (square) => {
    const piece = game.get(square)

    if (!selectedSquare) {
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square)
      }
      return
    }

    const validMoves = getValidMoves(selectedSquare)

    if (validMoves.includes(square)) {
      movePiece(selectedSquare, square)
      return
    }

    if (piece && piece.color === game.turn()) {
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
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  }

  const renderBoard = () => {
    const board = []
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

    ranks.forEach((rank, rIdx) => {
      files.forEach((file, cIdx) => {
        const square = `${file}${rank}`
        const piece = game.get(square)

        const isDark = (rIdx + cIdx) % 2 === 1
        const isSelected = square === selectedSquare

        const isValidMove =
          selectedSquare &&
          getValidMoves(selectedSquare).includes(square)

        const kingInCheck =
          piece &&
          piece.type === 'k' &&
          piece.color === game.turn() &&
          game.isCheck()

        board.push(
          <div
            key={square}
            onClick={() => onSquareClick(square)}
            className={`
              square
              ${isDark ? 'dark' : 'light'}
              ${isSelected ? 'selected' : ''}
              ${isValidMove ? 'valid' : ''}
              ${kingInCheck ? 'check' : ''}
            `}
          >
            {piece && (
              <span
                className={`piece ${
                  piece.color === 'w'
                    ? 'white-piece'
                    : 'black-piece'
                }`}
              >
                {pieceSymbols[piece.color][piece.type]}
              </span>
            )}
          </div>
        )
      })
    })

    return board
  }

  const getStatus = () => {
    if (game.isCheckmate()) {
      return game.turn() === 'w'
        ? 'Checkmate! Black wins!'
        : 'Checkmate! White wins!'
    }

    if (game.isDraw()) return 'Draw!'

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
            <h1 className="game-title">♟ Chess Arena</h1>

            <button
              className="new-game-btn"
              onClick={resetGame}
            >
              New Game
            </button>
          </div>

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

            {moveHistory.length === 0 ? (
              <p>No moves yet</p>
            ) : (
              moveHistory.map((move, index) => (
                <div
                  key={index}
                  className="move"
                >
                  {index + 1}. {move}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChessGame;