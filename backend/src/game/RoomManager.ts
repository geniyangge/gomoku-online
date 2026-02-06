import { v4 as uuidv4 } from 'uuid';
import { Room, Player, GameStatus, ChatMessage, DrawRequest } from '../types';
import { GobangGame } from './GobangGame';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId -> roomId

  // 创建房间
  createRoom(name: string, creatorId: string): Room {
    const room: Room = {
      id: uuidv4(),
      name: name || `房间${Math.floor(Math.random() * 9999) + 1}`,
      players: [null, null],
      spectators: [],
      status: 'idle',
      board: Array(15).fill(null).map(() => Array(15).fill(-1)),
      currentPlayer: 0,
      winner: null,
      drawRequests: [],
      drawCount: {},
      settlementEndTime: null,
      chatMessages: [],
      createdAt: Date.now(),
    };

    this.rooms.set(room.id, room);
    return room;
  }

  // 获取所有房间
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  // 搜索房间
  searchRooms(keyword: string): Room[] {
    return this.getAllRooms().filter(room => 
      room.name.toLowerCase().includes(keyword.toLowerCase()) ||
      room.id.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // 获取房间
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // 玩家进入房间
  joinRoom(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // 如果已经在房间中，不重复添加
    if (room.spectators.includes(playerId) || room.players.includes(playerId)) {
      return room;
    }

    room.spectators.push(playerId);
    this.playerRooms.set(playerId, roomId);
    return room;
  }

  // 玩家离开房间
  leaveRoom(playerId: string): Room | null {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    // 从座位移除
    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex !== -1) {
      room.players[playerIndex] = null;
      
      // 如果游戏正在进行，对手获胜
      if (room.status === 'playing') {
        const otherPlayerIndex = playerIndex === 0 ? 1 : 0;
        const otherPlayerId = room.players[otherPlayerIndex];
        if (otherPlayerId) {
          room.winner = otherPlayerId;
          room.status = 'finished';
          room.settlementEndTime = Date.now() + 10000; // 10秒结算时间
        }
      }
    }

    // 从观众移除
    room.spectators = room.spectators.filter(id => id !== playerId);
    this.playerRooms.delete(playerId);

    // 如果房间空了，删除房间
    if (room.players.every(p => p === null) && room.spectators.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    return room;
  }

  // 玩家入座
  sitDown(roomId: string, playerId: string, seatIndex: number): { room: Room; playerIndex: number } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (seatIndex !== 0 && seatIndex !== 1) return null;
    if (room.players[seatIndex] !== null) return null;

    room.players[seatIndex] = playerId;
    return { room, playerIndex: seatIndex };
  }

  // 玩家起立
  standUp(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex === -1) return null;

    // 如果游戏正在进行，对手获胜
    if (room.status === 'playing') {
      const otherPlayerIndex = playerIndex === 0 ? 1 : 0;
      const otherPlayerId = room.players[otherPlayerIndex];
      if (otherPlayerId) {
        room.winner = otherPlayerId;
        room.status = 'finished';
        room.settlementEndTime = Date.now() + 10000;
      }
    }

    room.players[playerIndex] = null;
    return room;
  }

  // 开始游戏
  startGame(roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.players[0] === null || room.players[1] === null) return null;
    if (room.status !== 'idle') return null;

    room.status = 'playing';
    room.board = Array(15).fill(null).map(() => Array(15).fill(-1));
    room.currentPlayer = 0;
    room.winner = null;
    room.drawRequests = [];
    room.drawCount = { [room.players[0]!]: 0, [room.players[1]!]: 0 };
    room.settlementEndTime = null;

    return room;
  }

  // 落子
  makeMove(roomId: string, playerId: string, x: number, y: number): { room: Room; win: boolean; draw: boolean } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.status !== 'playing') return null;

    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex === -1) return null;
    if (room.currentPlayer !== playerIndex) return null;

    // 创建游戏实例检查落子
    const game = new GobangGame();
    room.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== -1) {
          game.makeMove(x, y, cell);
        }
      });
    });

    if (!game.makeMove(x, y, playerIndex)) {
      return null;
    }

    room.board[y][x] = playerIndex;

    // 检查胜负
    const win = game.checkWin(x, y, playerIndex);
    const draw = !win && game.checkDraw();

    if (win) {
      room.winner = playerId;
      room.status = 'finished';
      room.settlementEndTime = Date.now() + 10000;
    } else if (draw) {
      room.winner = null;
      room.status = 'finished';
      room.settlementEndTime = Date.now() + 10000;
    } else {
      room.currentPlayer = room.currentPlayer === 0 ? 1 : 0;
    }

    return { room, win, draw };
  }

  // 请求和局
  requestDraw(roomId: string, playerId: string): { room: Room; valid: boolean; message?: string } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.status !== 'playing') return { room, valid: false, message: '游戏未开始' };

    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex === -1) return { room, valid: false, message: '你不是玩家' };

    // 检查请求次数
    const currentCount = room.drawCount[playerId] || 0;
    if (currentCount >= 3) {
      return { room, valid: false, message: '你和局请求次数已用完' };
    }

    // 检查是否已有未处理的请求
    const existingRequest = room.drawRequests.find(r => r.playerId === playerId);
    if (existingRequest) {
      return { room, valid: false, message: '你已经发起过和局请求' };
    }

    room.drawCount[playerId] = currentCount + 1;
    room.drawRequests.push({ playerId, timestamp: Date.now() });

    return { room, valid: true };
  }

  // 同意和局
  acceptDraw(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex === -1) return null;

    // 检查是否有对手的和局请求
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponentId = room.players[opponentIndex];
    if (!opponentId) return null;

    const requestIndex = room.drawRequests.findIndex(r => r.playerId === opponentId);
    if (requestIndex === -1) return null;

    // 同意和局，游戏结束
    room.winner = null;
    room.status = 'finished';
    room.settlementEndTime = Date.now() + 10000;
    room.drawRequests = [];

    return room;
  }

  // 拒绝和局
  rejectDraw(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex === -1) return null;

    // 移除对手的和局请求
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponentId = room.players[opponentIndex];
    if (!opponentId) return null;

    room.drawRequests = room.drawRequests.filter(r => r.playerId !== opponentId);

    return room;
  }

  // 重置房间（结算完成后）
  resetRoom(roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.status = 'idle';
    room.board = Array(15).fill(null).map(() => Array(15).fill(-1));
    room.currentPlayer = 0;
    room.winner = null;
    room.drawRequests = [];
    room.settlementEndTime = null;

    return room;
  }

  // 添加聊天消息
  addChatMessage(roomId: string | null, message: ChatMessage): void {
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.chatMessages.push(message);
        // 只保留最近100条消息
        if (room.chatMessages.length > 100) {
          room.chatMessages = room.chatMessages.slice(-100);
        }
      }
    }
  }

  // 获取玩家所在房间
  getPlayerRoom(playerId: string): Room | undefined {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }
}