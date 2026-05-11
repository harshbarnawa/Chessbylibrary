const express = require('express')

const http = require('http')

const { Server } = require('socket.io')

const cors = require('cors')

const app = express()

app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
  },

  pingTimeout: 5000,
  pingInterval: 2000,
})

const rooms = {}

io.on('connection', (socket) => {
  console.log(
    'User connected:',
    socket.id
  )

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId)

    socket.roomId = roomId

    if (!rooms[roomId]) {
      rooms[roomId] = []
    }

    if (rooms[roomId].length >= 2) {
      socket.emit('roomFull')

      return
    }

    const color =
      rooms[roomId].length === 0
        ? 'white'
        : 'black'

    rooms[roomId].push({
      id: socket.id,
      color,
    })

    socket.emit(
      'playerColor',
      color
    )

    io.to(roomId).emit(
      'players',
      rooms[roomId]
    )

    console.log(
      `${socket.id} joined ${roomId}`
    )
  })

  socket.on(
    'move',
    ({ roomId, move }) => {
      socket.to(roomId).emit(
        'receiveMove',
        move
      )
    }
  )

  socket.on('disconnect', () => {
    console.log(
      'Disconnected:',
      socket.id
    )

    const roomId = socket.roomId

    if (
      roomId &&
      rooms[roomId]
    ) {
      rooms[roomId] =
        rooms[roomId].filter(
          (player) =>
            player.id !== socket.id
        )

      socket
        .to(roomId)
        .emit(
          'opponentDisconnected'
        )

      io.to(roomId).emit(
        'players',
        rooms[roomId]
      )

      if (
        rooms[roomId]
          .length === 0
      ) {
        delete rooms[roomId]
      }
    }
  })
})

server.listen(3001, () => {
  console.log(
    'Server running on port 3001'
  )
})