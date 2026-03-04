import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import { PlayerManager } from '../game/PlayerManager'
import { RoomManager } from '../game/RoomManager'
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  ChatMessage,
  Room,
  Player,
} from '../types'
import { ChatMessage as ChatMessageModel } from '../database/ChatMessage'

export class SocketHandler {
  private io: SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
  private playerManager: PlayerManager
  private roomManager: RoomManager
  private socketPlayerMap: Map<string, Player> = new Map()

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    })

    this.playerManager = new PlayerManager()
    this.roomManager = new RoomManager()

    this.setupSocketHandlers()
    this.startSettlementCheck()
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`用户连接: ${socket.id}`)

      socket.on('session:init', async (sessionId?: string) => {
        const {
          player,
          sessionId: newSessionId,
          isNew,
        } = await this.playerManager.createOrRestorePlayer(socket.id, sessionId)
        this.socketPlayerMap.set(socket.id, player)

        socket.emit('session:established', { sessionId: newSessionId, isNew })
        socket.emit('player:assigned', player)

        if (player.currentRoomId) {
          const gameState = await this.playerManager.getPlayerGameState(player.id)
          const room = this.roomManager.getRoom(player.currentRoomId)
          if (room) {
            const playerIndex = room.players.indexOf(player.id)
            socket.join(room.id)
            socket.emit('room:joined', {
              room,
              playerIndex: playerIndex !== -1 ? playerIndex : null,
              restored: true,
              gameState: gameState || undefined,
            })
          }
        }
      })

      socket.emit('lobby:rooms', this.roomManager.getAllRooms())

      // 获取大厅聊天历史
      socket.on('lobby:getChatHistory', async (limit: number = 100) => {
        const messages = await ChatMessageModel.find({ type: 'lobby' })
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean()
        const chatMessages: ChatMessage[] = messages.map((m) => ({
          id: m._id.toString(),
          playerId: m.playerId,
          nickname: m.nickname,
          content: m.content,
          timestamp: m.timestamp,
          type: m.type,
          roomId: m.roomId,
        }))
        socket.emit('lobby:chatHistory', chatMessages.reverse())
      })

      // 获取房间聊天历史
      socket.on('room:getChatHistory', async (roomId: string, limit: number = 100) => {
        const messages = await ChatMessageModel.find({ type: 'room', roomId })
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean()
        const chatMessages: ChatMessage[] = messages.map((m) => ({
          id: m._id.toString(),
          playerId: m.playerId,
          nickname: m.nickname,
          content: m.content,
          timestamp: m.timestamp,
          type: m.type,
          roomId: m.roomId,
        }))
        socket.emit('room:chatHistory', chatMessages.reverse())
      })

      // 获取房间列表
      socket.on('lobby:getRooms', () => {
        socket.emit('lobby:rooms', this.roomManager.getAllRooms())
      })

      // 创建房间
      socket.on('lobby:createRoom', (name: string) => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return

        const room = this.roomManager.createRoom(name, player.id)
        this.io.emit('lobby:rooms', this.roomManager.getAllRooms())

        // 自动进入房间
        this.joinRoom(socket, room.id)
      })

      // 加入房间
      socket.on('lobby:joinRoom', (roomId: string) => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return
        this.joinRoom(socket, roomId)
      })

      // 搜索房间
      socket.on('lobby:searchRoom', (keyword: string) => {
        const rooms = this.roomManager.searchRooms(keyword)
        socket.emit('lobby:rooms', rooms)
      })

      // 大厅聊天
      socket.on('lobby:chat', async (content: string) => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player || !content.trim()) return

        const message: ChatMessage = {
          id: Date.now().toString(),
          playerId: player.id,
          nickname: player.nickname,
          content: content.trim(),
          timestamp: Date.now(),
          type: 'lobby',
        }

        this.io.emit('lobby:chat', message)

        await ChatMessageModel.create(message)
      })

      // 离开房间
      socket.on('room:leave', () => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return
        this.leaveRoom(socket, player.id)
      })

      // 入座
      socket.on('room:sit', (seatIndex: number) => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return
        const room = this.roomManager.getPlayerRoom(player.id)
        if (!room) return

        const result = this.roomManager.sitDown(room.id, player.id, seatIndex)
        if (result) {
          this.io.to(room.id).emit('room:updated', result.room)
        }
      })

      // 起立
      socket.on('room:stand', () => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return
        const room = this.roomManager.getPlayerRoom(player.id)
        if (!room) return

        const updatedRoom = this.roomManager.standUp(room.id, player.id)
        if (updatedRoom) {
          this.io.to(room.id).emit('room:updated', updatedRoom)
        }
      })

      // 房间内聊天
      socket.on('room:chat', async (content: string) => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player || !content.trim()) return

        const room = this.roomManager.getPlayerRoom(player.id)
        if (!room) return

        const message: ChatMessage = {
          id: Date.now().toString(),
          playerId: player.id,
          nickname: player.nickname,
          content: content.trim(),
          timestamp: Date.now(),
          type: 'room',
          roomId: room.id,
        }

        this.roomManager.addChatMessage(room.id, message)
        this.io.to(room.id).emit('room:chat', message)

        await ChatMessageModel.create(message)
      })

      // 开始游戏
      socket.on('game:start', async () => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return

        const room = this.roomManager.getPlayerRoom(player.id)
        if (!room) return

        const playerIndex = room.players.indexOf(player.id)
        if (playerIndex === -1) return

        const updatedRoom = this.roomManager.startGame(room.id)
        if (updatedRoom) {
          this.io.to(room.id).emit('game:started', { room: updatedRoom, firstPlayer: 0 })
          this.io.to(room.id).emit('room:updated', updatedRoom)

          for (const pId of updatedRoom.players) {
            if (pId) {
              await this.playerManager.updateGameState(
                pId,
                'playing',
                updatedRoom.players.indexOf(pId),
                room.id
              )
            }
          }
        }
      })

      // 落子
      socket.on('game:move', async (x: number, y: number) => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return

        const room = this.roomManager.getPlayerRoom(player.id)
        if (!room) return

        const result = this.roomManager.makeMove(room.id, player.id, x, y)
        if (result) {
          this.io.to(room.id).emit('game:move', { x, y, player: room.players.indexOf(player.id) })

          if (result.win) {
            this.io.to(room.id).emit('game:ended', { winner: player.id, reason: 'win' })
            this.io.to(room.id).emit('game:settlement', { winner: player.id, countdown: 10 })

            for (const pId of result.room.players) {
              if (pId) {
                await this.playerManager.updateGameState(
                  pId,
                  'finished',
                  result.room.players.indexOf(pId),
                  room.id
                )
              }
            }
          } else if (result.draw) {
            this.io.to(room.id).emit('game:ended', { winner: null, reason: 'draw' })
            this.io.to(room.id).emit('game:settlement', { winner: null, countdown: 10 })

            for (const pId of result.room.players) {
              if (pId) {
                await this.playerManager.updateGameState(
                  pId,
                  'finished',
                  result.room.players.indexOf(pId),
                  room.id
                )
              }
            }
          }

          this.io.to(room.id).emit('room:updated', result.room)
        }
      })

      // 请求和局
      socket.on('game:draw:request', () => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return

        const room = this.roomManager.getPlayerRoom(player.id)
        if (!room) return

        const result = this.roomManager.requestDraw(room.id, player.id)
        if (result) {
          if (result.valid) {
            const opponentIndex = room.players.indexOf(player.id) === 0 ? 1 : 0
            const opponentId = room.players[opponentIndex]
            if (opponentId) {
              const opponentSocket = this.io.sockets.sockets.get(
                this.playerManager.getPlayer(opponentId)?.socketId || ''
              )
              if (opponentSocket) {
                opponentSocket.emit('game:draw:requested', {
                  playerId: player.id,
                  playerNickname: player.nickname,
                })
              }
            }
            socket.emit('room:updated', result.room)
          } else {
            socket.emit('error', result.message || '请求和局失败')
          }
        }
      })

      // 同意和局
      socket.on('game:draw:accept', async () => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return

        const room = this.roomManager.getPlayerRoom(player.id)
        if (!room) return

        const updatedRoom = this.roomManager.acceptDraw(room.id, player.id)
        if (updatedRoom) {
          this.io.to(room.id).emit('game:ended', { winner: null, reason: 'draw' })
          this.io.to(room.id).emit('game:settlement', { winner: null, countdown: 10 })
          this.io.to(room.id).emit('room:updated', updatedRoom)

          for (const pId of updatedRoom.players) {
            if (pId) {
              await this.playerManager.updateGameState(
                pId,
                'finished',
                updatedRoom.players.indexOf(pId),
                room.id
              )
            }
          }
        }
      })

      // 拒绝和局
      socket.on('game:draw:reject', () => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return

        const room = this.roomManager.getPlayerRoom(player.id)
        if (!room) return

        const opponentIndex = room.players.indexOf(player.id) === 0 ? 1 : 0
        const opponentId = room.players[opponentIndex]

        const updatedRoom = this.roomManager.rejectDraw(room.id, player.id)
        if (updatedRoom && opponentId) {
          const opponentSocket = this.io.sockets.sockets.get(
            this.playerManager.getPlayer(opponentId)?.socketId || ''
          )
          if (opponentSocket) {
            opponentSocket.emit('game:draw:rejected', {
              playerId: player.id,
              playerNickname: player.nickname,
            })
          }
          this.io.to(room.id).emit('room:updated', updatedRoom)
        }
      })

      // 投降
      socket.on('game:surrender', async () => {
        const player = this.socketPlayerMap.get(socket.id)
        if (!player) return

        const room = this.roomManager.getPlayerRoom(player.id)
        if (!room) return

        const playerIndex = room.players.indexOf(player.id)
        if (playerIndex === -1 || room.status !== 'playing') return

        const opponentIndex = playerIndex === 0 ? 1 : 0
        const opponentId = room.players[opponentIndex]

        if (opponentId) {
          room.winner = opponentId
          room.status = 'finished'
          room.settlementEndTime = Date.now() + 10000

          this.io.to(room.id).emit('game:ended', { winner: opponentId, reason: 'win' })
          this.io.to(room.id).emit('game:settlement', { winner: opponentId, countdown: 10 })
          this.io.to(room.id).emit('room:updated', room)

          for (const pId of room.players) {
            if (pId) {
              await this.playerManager.updateGameState(
                pId,
                'finished',
                room.players.indexOf(pId),
                room.id
              )
            }
          }
        }
      })

      // 断开连接
      socket.on('disconnect', () => {
        console.log(`用户断开连接: ${socket.id}`)
        const player = this.socketPlayerMap.get(socket.id)
        if (player) {
          this.leaveRoom(socket, player.id)
          this.playerManager.removePlayer(player.id)
          this.socketPlayerMap.delete(socket.id)
        }
      })
    })
  }

  private joinRoom(socket: Socket, roomId: string): void {
    const player = this.playerManager.getPlayerBySocketId(socket.id)
    if (!player) return

    // 离开当前房间
    this.leaveRoom(socket, player.id)

    const room = this.roomManager.joinRoom(roomId, player.id)
    if (room) {
      socket.join(roomId)
      this.playerManager.updatePlayerRoom(player.id, roomId)

      const playerIndex = room.players.indexOf(player.id)
      socket.emit('room:joined', { room, playerIndex: playerIndex !== -1 ? playerIndex : null })
      socket.to(roomId).emit('room:updated', room)

      this.playerManager.updateGameState(
        player.id,
        'idle',
        playerIndex !== -1 ? playerIndex : null,
        roomId
      )
    }
  }

  private async leaveRoom(socket: Socket, playerId: string): Promise<void> {
    const player = this.playerManager.getPlayer(playerId)
    const socketPlayer = this.socketPlayerMap.get(socket.id)
    if (!player || !socketPlayer?.currentRoomId) return

    const roomId = socketPlayer.currentRoomId
    const room = this.roomManager.leaveRoom(playerId)

    socket.leave(roomId)
    this.playerManager.updatePlayerRoom(playerId, null)
    this.playerManager.clearGameState(playerId)

    if (room) {
      socket.to(roomId).emit('room:updated', room)

      // 如果游戏结束（有胜者），发送结算信息
      if (room.status === 'finished' && room.winner) {
        this.io.to(roomId).emit('game:ended', { winner: room.winner, reason: 'escape' })
        this.io.to(roomId).emit('game:settlement', { winner: room.winner, countdown: 10 })

        // 更新其他玩家的游戏状态
        for (const pId of room.players) {
          if (pId && pId !== playerId) {
            await this.playerManager.updateGameState(
              pId,
              'finished',
              room.players.indexOf(pId),
              roomId
            )
          }
        }
      }
    }

    // 更新大厅房间列表
    this.io.emit('lobby:rooms', this.roomManager.getAllRooms())
  }

  // 定期检查结算时间
  private startSettlementCheck(): void {
    setInterval(async () => {
      const rooms = this.roomManager.getAllRooms()
      rooms.forEach((room) => {
        if (room.status === 'finished' && room.settlementEndTime) {
          if (Date.now() >= room.settlementEndTime) {
            const resetRoom = this.roomManager.resetRoom(room.id)
            if (resetRoom) {
              this.io.to(room.id).emit('room:updated', resetRoom)

              // 重置后更新所有玩家的游戏状态
              for (const pId of resetRoom.players) {
                if (pId) {
                  this.playerManager.updateGameState(
                    pId,
                    'idle',
                    resetRoom.players.indexOf(pId),
                    null
                  )
                }
              }

              this.io.emit('lobby:rooms', this.roomManager.getAllRooms())
            }
          }
        }
      })
    }, 1000)
  }
}
