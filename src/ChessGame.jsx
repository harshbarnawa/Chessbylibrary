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

  const [whiteTime, setWhiteTime] =
    useState(600)

  const [blackTime, setBlackTime] =
    useState(600)

  const [winner, setWinner] =
    useState(null)

  const [gameStarted, setGameStarted] =
    useState(false)

  const [opponentOffline, setOpponentOffline] =
    useState(false)

  const [abortTimer, setAbortTimer] =
    useState(60)

  const [gameAborted, setGameAborted] =
    useState(false)

  const [copied, setCopied] =
    useState(false)

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

        if (data.length === 2) {
          setOpponentOffline(false)

          setAbortTimer(60)
        }
      })

      socket.on('roomFull', () => {
        alert('Room is full')
      })

      socket.on(
        'opponentDisconnected',
        () => {
          setOpponentOffline(true)
        }
      )
    }

    return () => {
      socket.off('playerColor')

      socket.off('players')

      socket.off('roomFull')

      socket.off(
        'opponentDisconnected'
      )
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

        setGameStarted(true)
      }
    )

    return () => {
      socket.off('receiveMove')
    }
  }, [])

  useEffect(() => {
    if (
      !roomId ||
      players.length >= 2 ||
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
    roomId,
    players,
    gameAborted,
  ])

  useEffect(() => {
    if (
      winner ||
      !gameStarted ||
      (
        roomId &&
        players.length < 2
      )
    )
      return

    const interval = setInterval(() => {
      if (game.turn() === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setWinner('Black')

            clearInterval(interval)

            return 0
          }

          return prev - 1
        })
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setWinner('White')

            clearInterval(interval)

            return 0
          }

          return prev - 1
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [
    game,
    winner,
    gameStarted,
    players,
    roomId,
  ])

  const formatTime = (time) => {
    const minutes = Math.floor(
      time / 60
    )

    const seconds = time % 60

    return `${minutes}:${
      seconds < 10
        ? '0'
        : ''
    }${seconds}`
  }

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
    if (
      winner ||
      gameAborted
    )
      return

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

      setGameStarted(true)

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
    if (
      winner ||
      gameAborted
    )
      return

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

    setWhiteTime(600)

    setBlackTime(600)

    setWinner(null)

    setGameStarted(false)

    setOpponentOffline(false)

    setAbortTimer(60)

    setGameAborted(false)
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

    const normalRanks = [
      '8',
      '7',
      '6',
      '5',
      '4',
      '3',
      '2',
      '1',
    ]

    const normalFiles = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
    ]

    const flippedRanks = [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]

    const flippedFiles = [
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
        ? flippedRanks
        : normalRanks

    const files =
      playerColor === 'black'
        ? flippedFiles
        : normalFiles

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
    if (gameAborted) {
      return 'Game Aborted'
    }

    if (opponentOffline) {
      return 'Opponent Offline'
    }

    if (winner) {
      return `${winner} wins on time!`
    }

    if (
      roomId &&
      players.length < 2
    ) {
      return 'Waiting for opponent...'
    }

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

          {!roomId ? (
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
          ) : (
            <div
              style={{
                marginBottom: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <input
                  value={
                    window.location.href
                  }
                  readOnly
                  style={{
                    padding: '10px',
                    borderRadius:
                      '10px',
                    border:
                      '1px solid #ccc',
                    flex: 1,
                    minWidth: '220px',
                  }}
                />

                <button
                  className="new-game-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      window.location
                        .href
                    )

                    setCopied(true)

                    setTimeout(() => {
                      setCopied(false)
                    }, 2000)
                  }}
                >
                  {copied
                    ? 'Copied!'
                    : 'Share Link'}
                </button>
              </div>

              {players.length < 2 &&
                !gameAborted && (
                  <div
                    style={{
                      background:
                        '#ffcc00',
                      padding: '12px',
                      borderRadius:
                        '10px',
                      fontWeight:
                        'bold',
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      Waiting for
                      opponent...
                    </span>

                    <span>
                      Auto Abort in:{' '}
                      {abortTimer}s
                    </span>
                  </div>
                )}
            </div>
          )}

          {roomId && (
            <div
              style={{
                marginBottom: '15px',
                fontWeight: 'bold',
                fontSize: '18px',
              }}
            >
              You are playing as:{' '}
              {playerColor || '...'}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              marginBottom: '15px',
              fontWeight: 'bold',
              fontSize: '20px',
            }}
          >
            <div>
              White ⏱{' '}
              {formatTime(
                whiteTime
              )}
            </div>

            <div>
              Black ⏱{' '}
              {formatTime(
                blackTime
              )}
            </div>
          </div>

          {opponentOffline &&
            !gameAborted && (
              <div
                style={{
                  marginBottom: '15px',
                  background:
                    '#ff4d4d',
                  color: 'white',
                  padding: '12px',
                  borderRadius:
                    '10px',
                  fontWeight:
                    'bold',
                  textAlign: 'center',
                }}
              >
                Opponent Offline
              </div>
            )}

          {gameAborted && (
            <div
              style={{
                marginBottom: '15px',
                background: '#111',
                color: 'white',
                padding: '12px',
                borderRadius:
                  '10px',
                fontWeight:
                  'bold',
                textAlign: 'center',
              }}
            >
              Game Aborted
            </div>
          )}

          {winner && (
            <div
              style={{
                marginBottom: '15px',
                background:
                  '#ff4d4d',
                color: 'white',
                padding: '12px',
                borderRadius:
                  '10px',
                fontWeight:
                  'bold',
                textAlign: 'center',
                fontSize: '20px',
              }}
            >
              {winner} wins on
              time!
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