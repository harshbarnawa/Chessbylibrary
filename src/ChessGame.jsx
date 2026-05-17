import React, {
  useState,
  useEffect,
} from 'react'

import { Chess } from 'chess.js'

import { useParams } from 'react-router-dom'

import { socket } from './socket'

import './index.css'

const ChessGame = () => {

  const [game, setGame] =
    useState(new Chess())

  const [selectedSquare, setSelectedSquare] =
    useState(null)

  const [moveHistory, setMoveHistory] =
    useState([])

  const [capturedPieces, setCapturedPieces] =
    useState({
      white: [],
      black: [],
    })

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

      socket.emit(
        'joinRoom',
        roomId
      )

      socket.on(
        'playerColor',
        (color) => {
          setPlayerColor(color)
        }
      )

      socket.on(
        'players',
        (data) => {

          setPlayers(data)

          if (data.length === 2) {
            setOpponentOffline(false)
            setAbortTimer(60)
          }

        }
      )

      socket.on(
        'roomFull',
        () => {
          alert('Room is full')
        }
      )

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

        setGame(
          (currentGame) => {

            const gameCopy =
              new Chess(
                currentGame.fen()
              )

            const playedMove =
              gameCopy.move(move)

            if (
              playedMove?.captured
            ) {

              const victimColor =
                playedMove.color === 'w'
                  ? 'b'
                  : 'w'

              const capturedSymbol =
                pieceSymbols[
                  victimColor
                ][
                  playedMove.captured
                ]

              setCapturedPieces(
                (prev) => ({
                  ...prev,

                  [
                    playedMove.color ===
                    'w'
                      ? 'white'
                      : 'black'
                  ]:[
                    ...prev[
                      playedMove.color ===
                      'w'
                        ? 'white'
                        : 'black'
                    ],
                    capturedSymbol
                  ]
                })
              )
            }

            setMoveHistory(
              gameCopy.history({
                verbose:true
              })
            )

            return gameCopy
          }
        )

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
    ) return

    const interval =
      setInterval(() => {

        setAbortTimer((prev) => {

          if (prev <= 1) {

            clearInterval(interval)

            setGameAborted(true)

            return 0
          }

          return prev - 1
        })

      },1000)

    return () =>
      clearInterval(interval)

  },[
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
    ) return

    const interval =
      setInterval(() => {

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

      },1000)

    return () =>
      clearInterval(interval)

  },[
    game,
    winner,
    gameStarted,
    players,
    roomId,
  ])

  const formatTime = (time) => {

    const minutes =
      Math.floor(time / 60)

    const seconds =
      time % 60

    return `${minutes}:${
      seconds < 10
        ? '0'
        : ''
    }${seconds}`
  }

  const getValidMoves =
    (square) => {

    return game
      .moves({
        square,
        verbose:true,
      })
      .map((m) => m.to)
  }

  const canMovePiece =
    (piece) => {

    if (!roomId)
      return true

    if (!piece)
      return false

    return (
      (
        playerColor === 'white' &&
        piece.color === 'w'
      ) ||
      (
        playerColor === 'black' &&
        piece.color === 'b'
      )
    )
  }

  const pieceSymbols = {

    w:{
      k:'♔',
      q:'♕',
      r:'♖',
      b:'♗',
      n:'♘',
      p:'♙',
    },

    b:{
      k:'♚',
      q:'♛',
      r:'♜',
      b:'♝',
      n:'♞',
      p:'♟',
    },
  }

  const getCaptureDisplay = (
    color
  ) => {

    return capturedPieces[
      color === 'w'
        ? 'white'
        : 'black'
    ].map((piece,index) => (

      <span
        key={index}
        className="capture-piece"
      >
        {piece}
      </span>
    ))
  }

  const movePiece =
    (from,to) => {

    if (
      winner ||
      gameAborted
    ) return

    const gameCopy =
      new Chess(game.fen())

    const move =
      gameCopy.move({
        from,
        to,
        promotion:'q',
      })

    if (move) {

      if (move.captured) {

        const victimColor =
          move.color === 'w'
            ? 'b'
            : 'w'

        const capturedSymbol =
          pieceSymbols[
            victimColor
          ][move.captured]

        setCapturedPieces(
          (prev) => ({
            ...prev,

            [
              move.color === 'w'
                ? 'white'
                : 'black'
            ]:[
              ...prev[
                move.color === 'w'
                  ? 'white'
                  : 'black'
              ],
              capturedSymbol
            ]
          })
        )
      }

      setGame(gameCopy)

      setMoveHistory(
        gameCopy.history({
          verbose:true
        })
      )

      setGameStarted(true)

      if (roomId) {

        socket.emit(
          'move',
          {
            roomId,
            move:{
              from,
              to,
              promotion:'q',
            },
          }
        )
      }
    }

    setSelectedSquare(null)
  }

  const onSquareClick =
    (square) => {

    if (
      winner ||
      gameAborted
    ) return

    const piece =
      game.get(square)

    if (!selectedSquare) {

      if (
        piece &&
        piece.color ===
          game.turn() &&
        canMovePiece(piece)
      ) {
        setSelectedSquare(square)
      }

      return
    }

    const validMoves =
      getValidMoves(
        selectedSquare
      )

    if (
      validMoves.includes(square)
    ) {

      movePiece(
        selectedSquare,
        square
      )

      return
    }

    if (
      piece &&
      piece.color ===
        game.turn() &&
      canMovePiece(piece)
    ) {

      setSelectedSquare(square)

      return
    }

    setSelectedSquare(null)
  }

  const renderBoard = () => {

    const board = []

    const normalRanks = [
      '8','7','6','5',
      '4','3','2','1',
    ]

    const normalFiles = [
      'a','b','c','d',
      'e','f','g','h',
    ]

    const flippedRanks = [
      '1','2','3','4',
      '5','6','7','8',
    ]

    const flippedFiles = [
      'h','g','f','e',
      'd','c','b','a',
    ]

    const ranks =
      playerColor === 'black'
        ? flippedRanks
        : normalRanks

    const files =
      playerColor === 'black'
        ? flippedFiles
        : normalFiles

    ranks.forEach(
      (rank,rIdx) => {

      files.forEach(
        (file,cIdx) => {

        const square =
          `${file}${rank}`

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
                  piece.color === 'w'
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
      })
    })

    return board
  }

  const getStatus = () => {

    if (gameAborted)
      return 'Game Aborted'

    if (opponentOffline)
      return 'Opponent Offline'

    if (winner)
      return `${winner} wins on time!`

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

            <div className="logo-section">

              <img
                src="/bee-logo.png"
                alt="Chess Bee"
                className="logo-img"
              />

              <h1 className="game-title">
                Chess Bee
              </h1>

            </div>

            <div className="top-buttons">

              {!roomId && (

                <button
                  className="main-btn"
                  onClick={() => {

                    const id =
                      crypto.randomUUID()

                    window.location.href =
                      `/room/${id}`
                  }}
                >
                  Create Room
                </button>
              )}

              {roomId && (

                <button
                  className="leave-btn"
                  onClick={() => {
                    window.location.href =
                      '/'
                  }}
                >

                  <img
                    src="/leave.svg"
                    alt="Leave"
                    className="leave-icon"
                  />

                </button>
              )}

            </div>

          </div>

          {roomId && (
            <>
              <div className="room-box">

                <input
                  value={
                    window.location.href
                  }
                  readOnly
                />

                <button
                  className="copy-btn"
                  onClick={() => {

                    navigator.clipboard.writeText(
                      window.location.href
                    )

                    setCopied(true)

                    setTimeout(() => {
                      setCopied(false)
                    },2000)
                  }}
                >
                  {copied
                    ? 'Copied'
                    : 'Copy'}
                </button>

              </div>

              {players.length < 2 &&
                !gameAborted && (

                <div className="waiting-box">

                  <span>
                    Waiting for opponent...
                  </span>

                  <span>
                    {abortTimer}s
                  </span>

                </div>
              )}
            </>
          )}

          <div className="game-info">

            <div>
              White ⏱{' '}
              {formatTime(
                whiteTime
              )}
            </div>

            <div>
              {getStatus()}
            </div>

            <div>
              Black ⏱{' '}
              {formatTime(
                blackTime
              )}
            </div>

          </div>

          <div className="captures-mini">

            <div className="mini-capture-row">
              {getCaptureDisplay('w')}
            </div>

            <div className="mini-capture-row">
              {getCaptureDisplay('b')}
            </div>

          </div>

          <div className="board-container">

            <div className="board">
              {renderBoard()}
            </div>

          </div>

        </div>

        <div className="sidebar">

          <div className="sidebar-title">
            Game Status
          </div>

          <div className="status-box">
            {getStatus()}
          </div>

          <div className="moves-box">

            {moveHistory.length === 0
              ? (
                <p>
                  No moves yet
                </p>
              ) : (
                moveHistory.map(
                  (
                    move,
                    index
                  ) => (

                    <div
                      key={index}
                      className="move"
                    >
                      {index + 1}.{' '}
                      {move.san}
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