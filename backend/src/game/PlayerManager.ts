import { v4 as uuidv4 } from 'uuid';
import { Player } from '../types';

export class PlayerManager {
  private players: Map<string, Player> = new Map();
  private nicknames: string[] = [
    '潇洒剑客', '棋圣', '风云棋手', '棋坛新秀', '五子棋王',
    '智慧之星', '黑白世界', '棋海无涯', '落子无悔', '棋高一着',
    '妙手回春', '神之一手', '棋逢对手', '将遇良才', '棋乐无穷',
    '指尖对弈', '棋开得胜', '棋思妙想', '执子之手', '棋行天下'
  ];

  // 创建玩家
  createPlayer(socketId: string): Player {
    const nickname = this.generateNickname();
    const player: Player = {
      id: uuidv4(),
      nickname,
      socketId,
      currentRoomId: null,
    };

    this.players.set(player.id, player);
    return player;
  }

  // 生成随机昵称
  private generateNickname(): string {
    const randomNickname = this.nicknames[Math.floor(Math.random() * this.nicknames.length)];
    const randomNum = Math.floor(Math.random() * 9999) + 1;
    return `${randomNickname}${randomNum}`;
  }

  // 获取玩家
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  // 通过socketId获取玩家
  getPlayerBySocketId(socketId: string): Player | undefined {
    return Array.from(this.players.values()).find(p => p.socketId === socketId);
  }

  // 更新玩家socketId
  updateSocketId(playerId: string, socketId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;
    player.socketId = socketId;
    return true;
  }

  // 更新玩家房间
  updatePlayerRoom(playerId: string, roomId: string | null): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;
    player.currentRoomId = roomId;
    return true;
  }

  // 移除玩家
  removePlayer(playerId: string): boolean {
    return this.players.delete(playerId);
  }
}