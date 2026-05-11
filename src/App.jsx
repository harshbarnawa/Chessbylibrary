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

  const [opponentOffline, setOpponentOffline] =
    useState(false)

  const [abortTimer, setAbortTimer] =
    useState(60)

  const [gameAborted, setGameAborted] =
    useState(false)

  const { roomId } = useParams()

  const isMultiplayer = !!roomId

  useEffect(() => {
    if (!isMultiplayer) return

    socket.emit('joinRoom', roomId)

    socket.on(
      'playerColor',
      (color) => {
        setPlayerColor(color)
      }
    )

    socket.on('players', (data) => {
      setPlayers(data)

      if (data.length === 2) {
        setOpponentOffline(false)

        setAbortTimer(60)
      }
    })

    socket.on(
      'receiveMove',
      (move) => {
        setGame((prevGame) => {
          const gameCopy =
            new Chess(
              prevGame.fen()
            )

          gameCopy.move(move)

          setMoveHistory(
            gameCopy.history()
          )

          return gameCopy
        })
      }
    )

    socket.on(
      'opponentDisconnected',
      () => {
        setOpponentOffline(true)
      }
    )

    return () => {
      socket.off('playerColor')

      socket.off('players')

      socket.off('receiveMove')

      socket.off(
        'opponentDisconnected'
      )
    }
  }, [roomId])

  useEffect(() => {
    if (
      !opponentOffline ||
      gameAborted
    )
      return

    const interval = setInterval(() => {
      setAbortTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)

          setGameAborted(true)

          return 0
        }

        return prev - 1
      })
    }, 1000)

    return () =>
      clearInterval(interval)
  }, [
    opponentOffline,
    gameAborted,
  ])

  const getValidMoves = (square) => {
    return game
      .moves({
        square,
        verbose: true,
      })
      .map((m) => m.to)
  }

  const canMovePiece = (piece) => {
    if (!isMultiplayer)
      return true

    if (!piece) return false

    return (
      (playerColor === 'white' &&
        piece.color === 'w' &&
        game.turn() === 'w') ||
      (playerColor === 'black' &&
        piece.color === 'b' &&
        game.turn() === 'b')
    )
  }

  const movePiece = (from, to) => {
    if (gameAborted) return

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

      if (isMultiplayer) {
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
    if (gameAborted) return

    const piece = game.get(square)

    if (!selectedSquare) {
      if (
        piece &&
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
      canMovePiece(piece)
    ) {
      setSelectedSquare(square)

      return
    }

    setSelectedSquare(null)
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

    const whiteRanks = [
      '8',
      '7',
      '6',
      '5',
      '4',
      '3',
      '2',
      '1',
    ]

    const whiteFiles = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
    ]

    const blackRanks = [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]

    const blackFiles = [
      'h',
      'g',
      'f',
      'e',
      'd',
      'c',
      'b',
      'a',
    ]

    const ranks =
      playerColor === 'black'
        ? blackRanks
        : whiteRanks

    const files =
      playerColor === 'black'
        ? blackFiles
        : whiteFiles

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

  return (
    <div className="chess-app">
      <div className="chess-container">
        <div className="board-wrapper">
          <div className="top-bar">
            <h1 className="game-title">
              ♟ Chess Arena
            </h1>
          </div>

          {!isMultiplayer && (
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

          {isMultiplayer &&
            players.length < 2 &&
            !opponentOffline && (
              <div
                style={{
                  background:
                    '#ffcc00',
                  padding: '12px',
                  borderRadius:
                    '10px',
                  marginBottom:
                    '15px',
                  fontWeight:
                    'bold',
                }}
              >
                Waiting for opponent...
              </div>
            )}

          {opponentOffline &&
            !gameAborted && (
              <div
                style={{
                  background:
                    '#ff4d4d',
                  color: 'white',
                  padding: '12px',
                  borderRadius:
                    '10px',
                  marginBottom:
                    '15px',
                  fontWeight:
                    'bold',
                }}
              >
                Opponent Offline —
                Auto abort in{' '}
                {abortTimer}s
              </div>
            )}

          {gameAborted && (
            <div
              style={{
                background:
                  '#111',
                color: 'white',
                padding: '12px',
                borderRadius:
                  '10px',
                marginBottom:
                  '15px',
                fontWeight:
                  'bold',
              }}
            >
              Game Aborted
            </div>
          )}

          <div className="board">
            {renderBoard()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChessGame