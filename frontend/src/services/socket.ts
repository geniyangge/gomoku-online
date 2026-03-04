import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents, Player, Room, ChatMessage } from '@/types'

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  public player = ref<Player | null>(null)
  public rooms = ref<Room[]>([])
  public currentRoom = ref<Room | null>(null)
  public playerIndex = ref<number | null>(null)
  public lobbyMessages = ref<ChatMessage[]>([])
  public roomMessages = ref<ChatMessage[]>([])
  public settlementData = ref<{ winner: string | null; countdown: number } | null>(null)
  public drawRequest = ref<{ playerId: string; playerNickname: string } | null>(null)

  connect() {
    // Docker环境下使用相对路径，让nginx代理WebSocket
    const socketUrl = window.location.origin
    this.socket = io(socketUrl, {
      transports: ['websocket'],
      path: '/socket.io/',
    })

    this.socket.on('connect', () => {
      console.log('Connected to server')

      // 初始化 session，恢复用户状态
      const savedSessionId = localStorage.getItem('sessionId')
      this.socket?.emit('session:init', savedSessionId)
    })

    this.socket.on('session:established', ({ sessionId, isNew }) => {
      localStorage.setItem('sessionId', sessionId)
      console.log(isNew ? '新用户' : '老用户，状态已恢复')

      // 获取大厅聊天历史
      this.socket?.emit('lobby:getChatHistory', 100)
    })

    this.socket.on('lobby:chatHistory', (messages: ChatMessage[]) => {
      this.lobbyMessages.value = messages
    })

    this.socket.on('room:chatHistory', (messages: ChatMessage[]) => {
      this.roomMessages.value = messages
    })

    this.socket.on('player:assigned', (player: Player) => {
      this.player.value = player
      localStorage.setItem('playerId', player.id)
    })

    this.socket.on('lobby:rooms', (rooms: Room[]) => {
      this.rooms.value = rooms
    })

    this.socket.on('lobby:chat', (message: ChatMessage) => {
      this.lobbyMessages.value.push(message)
      if (this.lobbyMessages.value.length > 100) {
        this.lobbyMessages.value.shift()
      }
    })

    this.socket.on(
      'room:joined',
      (data: { room: Room; playerIndex: number | null; restored?: boolean; gameState?: any }) => {
        this.currentRoom.value = data.room
        this.playerIndex.value = data.playerIndex

        // 获取房间聊天历史
        if (data.room && !data.restored) {
          this.socket?.emit('room:getChatHistory', data.room.id, 100)
        } else if (data.room.chatMessages) {
          this.roomMessages.value = data.room.chatMessages
        }
      }
    )

    this.socket.on('room:updated', (room: Room) => {
      this.currentRoom.value = room
      // 重新计算 playerIndex
      if (this.player.value) {
        const index = room.players.indexOf(this.player.value.id)
        this.playerIndex.value = index !== -1 ? index : null
      }
      if (room.status === 'idle') {
        this.settlementData.value = null
      }
    })

    this.socket.on('room:chat', (message: ChatMessage) => {
      this.roomMessages.value.push(message)
      if (this.roomMessages.value.length > 100) {
        this.roomMessages.value.shift()
      }
    })

    this.socket.on('game:started', (data: { room: Room; firstPlayer: number }) => {
      this.currentRoom.value = data.room
      console.log('Game started, first player:', data.firstPlayer)
    })

    this.socket.on('game:move', (data: { x: number; y: number; player: number }) => {
      console.log('Move received:', data)
      // 棋盘更新会由 room:updated 事件处理，这里不需要额外操作
    })

    this.socket.on(
      'game:ended',
      (data: { winner: string | null; reason: 'win' | 'draw' | 'escape' }) => {
        console.log('Game ended:', data)
      }
    )

    this.socket.on('game:settlement', (data: { winner: string | null; countdown: number }) => {
      this.settlementData.value = data
    })

    this.socket.on('game:draw:requested', (data: { playerId: string; playerNickname: string }) => {
      this.drawRequest.value = data
    })

    this.socket.on('game:draw:rejected', () => {
      this.drawRequest.value = null
    })

    this.socket.on('error', (message: string) => {
      alert(message)
    })
  }

  // 大厅操作
  getRooms() {
    this.socket?.emit('lobby:getRooms')
  }

  createRoom(name: string) {
    this.socket?.emit('lobby:createRoom', name)
  }

  joinRoom(roomId: string) {
    this.socket?.emit('lobby:joinRoom', roomId)
  }

  searchRoom(keyword: string) {
    this.socket?.emit('lobby:searchRoom', keyword)
  }

  sendLobbyChat(content: string) {
    this.socket?.emit('lobby:chat', content)
  }

  // 房间操作
  leaveRoom() {
    this.socket?.emit('room:leave')
    this.currentRoom.value = null
    this.playerIndex.value = null
    this.roomMessages.value = []
    this.settlementData.value = null
    this.drawRequest.value = null
  }

  sitDown(seatIndex: number) {
    this.socket?.emit('room:sit', seatIndex)
  }

  standUp() {
    this.socket?.emit('room:stand')
  }

  sendRoomChat(content: string) {
    this.socket?.emit('room:chat', content)
  }

  // 游戏操作
  startGame() {
    this.socket?.emit('game:start')
  }

  makeMove(x: number, y: number) {
    this.socket?.emit('game:move', x, y)
  }

  requestDraw() {
    this.socket?.emit('game:draw:request')
  }

  acceptDraw() {
    this.socket?.emit('game:draw:accept')
    this.drawRequest.value = null
  }

  rejectDraw() {
    this.socket?.emit('game:draw:reject')
    this.drawRequest.value = null
  }

  surrender() {
    this.socket?.emit('game:surrender')
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }
}

export const socketService = new SocketService()
