import { v4 as uuidv4 } from 'uuid'
import { Player } from '../types'
import { Session } from '../database/Session'

export class PlayerManager {
  private players: Map<string, Player> = new Map()
  private socketToSession: Map<string, string> = new Map()
  private nicknames: string[] = [
    '潇洒剑客',
    '棋圣',
    '风云棋手',
    '棋坛新秀',
    '五子棋王',
    '智慧之星',
    '黑白世界',
    '棋海无涯',
    '落子无悔',
    '棋高一着',
    '妙手回春',
    '神之一手',
    '棋逢对手',
    '将遇良才',
    '棋乐无穷',
    '指尖对弈',
    '棋开得胜',
    '棋思妙想',
    '执子之手',
    '棋行天下',
  ]

  // 通过 sessionId 创建或恢复玩家
  async createOrRestorePlayer(
    socketId: string,
    sessionId?: string
  ): Promise<{ player: Player; sessionId: string; isNew: boolean }> {
    // 如果提供了 sessionId，尝试恢复
    if (sessionId) {
      const session = await Session.findOne({ sessionId })
      if (session) {
        const player: Player = {
          id: session.playerId,
          nickname: session.nickname,
          socketId,
          currentRoomId: session.currentRoomId,
        }
        this.players.set(player.id, player)
        this.socketToSession.set(socketId, sessionId)

        await Session.updateOne({ sessionId }, { updatedAt: new Date() })

        return { player, sessionId, isNew: false }
      }
    }

    // 创建新玩家
    const nickname = this.generateNickname()
    const playerId = uuidv4()
    const newSessionId = uuidv4()

    const player: Player = {
      id: playerId,
      nickname,
      socketId,
      currentRoomId: null,
    }

    this.players.set(player.id, player)
    this.socketToSession.set(socketId, newSessionId)

    await Session.create({
      sessionId: newSessionId,
      playerId,
      nickname,
      currentRoomId: null,
      gameState: {
        status: 'idle',
        playerIndex: null,
        roomId: null,
      },
    })

    return { player, sessionId: newSessionId, isNew: true }
  }

  // 获取 socket 对应的 sessionId
  getSessionId(socketId: string): string | undefined {
    return this.socketToSession.get(socketId)
  }

  // 生成随机昵称
  private generateNickname(): string {
    const randomNickname = this.nicknames[Math.floor(Math.random() * this.nicknames.length)]
    const randomNum = Math.floor(Math.random() * 9999) + 1
    return `${randomNickname}${randomNum}`
  }

  // 获取玩家
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId)
  }

  // 通过socketId获取玩家
  getPlayerBySocketId(socketId: string): Player | undefined {
    return Array.from(this.players.values()).find((p) => p.socketId === socketId)
  }

  // 更新玩家socketId
  updateSocketId(playerId: string, socketId: string): boolean {
    const player = this.players.get(playerId)
    if (!player) return false
    player.socketId = socketId
    return true
  }

  // 更新玩家房间
  updatePlayerRoom(playerId: string, roomId: string | null): boolean {
    const player = this.players.get(playerId)
    if (!player) return false
    player.currentRoomId = roomId
    return true
  }

  // 更新玩家游戏状态
  async updateGameState(
    playerId: string,
    status: 'idle' | 'playing' | 'finished',
    playerIndex: number | null,
    roomId: string | null
  ): Promise<void> {
    const player = this.players.get(playerId)
    if (!player) return

    player.currentRoomId = roomId

    const sessionId = this.getSessionId(player.socketId)
    if (!sessionId) return

    await Session.updateOne(
      { sessionId },
      {
        currentRoomId: roomId,
        gameState: {
          status,
          playerIndex,
          roomId,
        },
        updatedAt: new Date(),
      }
    )
  }

  // 清除玩家游戏状态
  async clearGameState(playerId: string): Promise<void> {
    const player = this.players.get(playerId)
    if (!player) return

    const sessionId = this.getSessionId(player.socketId)
    if (!sessionId) return

    await Session.updateOne(
      { sessionId },
      {
        currentRoomId: null,
        gameState: {
          status: 'idle',
          playerIndex: null,
          roomId: null,
        },
        updatedAt: new Date(),
      }
    )
  }

  // 获取玩家游戏状态
  async getPlayerGameState(playerId: string): Promise<{
    status: 'idle' | 'playing' | 'finished'
    playerIndex: number | null
    roomId: string | null
  } | null> {
    const session = await Session.findOne({ playerId })
    if (!session) return null
    return session.gameState
  }

  // 移除玩家
  removePlayer(playerId: string): boolean {
    return this.players.delete(playerId)
  }
}
