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
})

const rooms = {}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId)

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

    socket.emit('playerColor', color)

    io.to(roomId).emit(
      'players',
      rooms[roomId]
    )

    console.log(
      `${socket.id} joined room ${roomId} as ${color}`
    )
  })

  socket.on('move', ({ roomId, move }) => {
    socket.to(roomId).emit(
      'receiveMove',
      move
    )
  })

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[
        roomId
      ].filter(
        (player) =>
          player.id !== socket.id
      )

      if (rooms[roomId].length === 0) {
        delete rooms[roomId]
      }
    }

    console.log('User disconnected')
  })
})

server.listen(3001, () => {
  console.log(
    'Server running on port 3001'
  )
})