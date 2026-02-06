import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { PlayerManager } from '../game/PlayerManager';
import { RoomManager } from '../game/RoomManager';
import { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  InterServerEvents, 
  SocketData,
  ChatMessage,
  Room
} from '../types';

export class SocketHandler {
  private io: SocketServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private playerManager: PlayerManager;
  private roomManager: RoomManager;

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.playerManager = new PlayerManager();
    this.roomManager = new RoomManager();

    this.setupSocketHandlers();
    this.startSettlementCheck();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`用户连接: ${socket.id}`);

      // 创建或恢复玩家
      let player = this.playerManager.createPlayer(socket.id);
      socket.emit('player:assigned', player);

      // 发送房间列表
      socket.emit('lobby:rooms', this.roomManager.getAllRooms());

      // 获取房间列表
      socket.on('lobby:getRooms', () => {
        socket.emit('lobby:rooms', this.roomManager.getAllRooms());
      });

      // 创建房间
      socket.on('lobby:createRoom', (name: string) => {
        const room = this.roomManager.createRoom(name, player.id);
        this.io.emit('lobby:rooms', this.roomManager.getAllRooms());
        
        // 自动进入房间
        this.joinRoom(socket, room.id);
      });

      // 加入房间
      socket.on('lobby:joinRoom', (roomId: string) => {
        this.joinRoom(socket, roomId);
      });

      // 搜索房间
      socket.on('lobby:searchRoom', (keyword: string) => {
        const rooms = this.roomManager.searchRooms(keyword);
        socket.emit('lobby:rooms', rooms);
      });

      // 大厅聊天
      socket.on('lobby:chat', (content: string) => {
        if (!content.trim()) return;
        
        const message: ChatMessage = {
          id: Date.now().toString(),
          playerId: player.id,
          nickname: player.nickname,
          content: content.trim(),
          timestamp: Date.now(),
          type: 'lobby',
        };

        this.io.emit('lobby:chat', message);
      });

      // 离开房间
      socket.on('room:leave', () => {
        this.leaveRoom(socket, player.id);
      });

      // 入座
      socket.on('room:sit', (seatIndex: number) => {
        const room = this.roomManager.getPlayerRoom(player.id);
        if (!room) return;

        const result = this.roomManager.sitDown(room.id, player.id, seatIndex);
        if (result) {
          this.io.to(room.id).emit('room:updated', result.room);
          
          // 检查是否可以开始游戏
          if (result.room.players[0] && result.room.players[1] && result.room.status === 'idle') {
            // 可以开始游戏
          }
        }
      });

      // 起立
      socket.on('room:stand', () => {
        const room = this.roomManager.getPlayerRoom(player.id);
        if (!room) return;

        const updatedRoom = this.roomManager.standUp(room.id, player.id);
        if (updatedRoom) {
          this.io.to(room.id).emit('room:updated', updatedRoom);
        }
      });

      // 房间内聊天
      socket.on('room:chat', (content: string) => {
        if (!content.trim()) return;

        const room = this.roomManager.getPlayerRoom(player.id);
        if (!room) return;

        const message: ChatMessage = {
          id: Date.now().toString(),
          playerId: player.id,
          nickname: player.nickname,
          content: content.trim(),
          timestamp: Date.now(),
          type: 'room',
          roomId: room.id,
        };

        this.roomManager.addChatMessage(room.id, message);
        this.io.to(room.id).emit('room:chat', message);
      });

      // 开始游戏
      socket.on('game:start', () => {
        const room = this.roomManager.getPlayerRoom(player.id);
        if (!room) return;

        // 检查是否是玩家
        const playerIndex = room.players.indexOf(player.id);
        if (playerIndex === -1) return;

        const updatedRoom = this.roomManager.startGame(room.id);
        if (updatedRoom) {
          this.io.to(room.id).emit('game:started', { room: updatedRoom, firstPlayer: 0 });
          this.io.to(room.id).emit('room:updated', updatedRoom);
        }
      });

      // 落子
      socket.on('game:move', (x: number, y: number) => {
        const room = this.roomManager.getPlayerRoom(player.id);
        if (!room) return;

        const result = this.roomManager.makeMove(room.id, player.id, x, y);
        if (result) {
          this.io.to(room.id).emit('game:move', { x, y, player: room.players.indexOf(player.id) });
          
          if (result.win) {
            this.io.to(room.id).emit('game:ended', { winner: player.id, reason: 'win' });
            this.io.to(room.id).emit('game:settlement', { winner: player.id, countdown: 10 });
          } else if (result.draw) {
            this.io.to(room.id).emit('game:ended', { winner: null, reason: 'draw' });
            this.io.to(room.id).emit('game:settlement', { winner: null, countdown: 10 });
          }

          this.io.to(room.id).emit('room:updated', result.room);
        }
      });

      // 请求和局
      socket.on('game:draw:request', () => {
        const room = this.roomManager.getPlayerRoom(player.id);
        if (!room) return;

        const result = this.roomManager.requestDraw(room.id, player.id);
        if (result) {
          if (result.valid) {
            const opponentIndex = room.players.indexOf(player.id) === 0 ? 1 : 0;
            const opponentId = room.players[opponentIndex];
            if (opponentId) {
              const opponentSocket = this.io.sockets.sockets.get(
                this.playerManager.getPlayer(opponentId)?.socketId || ''
              );
              if (opponentSocket) {
                opponentSocket.emit('game:draw:requested', { 
                  playerId: player.id, 
                  playerNickname: player.nickname 
                });
              }
            }
            socket.emit('room:updated', result.room);
          } else {
            socket.emit('error', result.message || '请求和局失败');
          }
        }
      });

      // 同意和局
      socket.on('game:draw:accept', () => {
        const room = this.roomManager.getPlayerRoom(player.id);
        if (!room) return;

        const updatedRoom = this.roomManager.acceptDraw(room.id, player.id);
        if (updatedRoom) {
          this.io.to(room.id).emit('game:ended', { winner: null, reason: 'draw' });
          this.io.to(room.id).emit('game:settlement', { winner: null, countdown: 10 });
          this.io.to(room.id).emit('room:updated', updatedRoom);
        }
      });

      // 拒绝和局
      socket.on('game:draw:reject', () => {
        const room = this.roomManager.getPlayerRoom(player.id);
        if (!room) return;

        const opponentIndex = room.players.indexOf(player.id) === 0 ? 1 : 0;
        const opponentId = room.players[opponentIndex];

        const updatedRoom = this.roomManager.rejectDraw(room.id, player.id);
        if (updatedRoom && opponentId) {
          const opponentSocket = this.io.sockets.sockets.get(
            this.playerManager.getPlayer(opponentId)?.socketId || ''
          );
          if (opponentSocket) {
            opponentSocket.emit('game:draw:rejected', { 
              playerId: player.id, 
              playerNickname: player.nickname 
            });
          }
          this.io.to(room.id).emit('room:updated', updatedRoom);
        }
      });

      // 投降
      socket.on('game:surrender', () => {
        const room = this.roomManager.getPlayerRoom(player.id);
        if (!room) return;

        const playerIndex = room.players.indexOf(player.id);
        if (playerIndex === -1 || room.status !== 'playing') return;

        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponentId = room.players[opponentIndex];

        if (opponentId) {
          room.winner = opponentId;
          room.status = 'finished';
          room.settlementEndTime = Date.now() + 10000;

          this.io.to(room.id).emit('game:ended', { winner: opponentId, reason: 'win' });
          this.io.to(room.id).emit('game:settlement', { winner: opponentId, countdown: 10 });
          this.io.to(room.id).emit('room:updated', room);
        }
      });

      // 断开连接
      socket.on('disconnect', () => {
        console.log(`用户断开连接: ${socket.id}`);
        this.leaveRoom(socket, player.id);
        this.playerManager.removePlayer(player.id);
      });
    });
  }

  private joinRoom(socket: Socket, roomId: string): void {
    const player = this.playerManager.getPlayerBySocketId(socket.id);
    if (!player) return;

    // 离开当前房间
    this.leaveRoom(socket, player.id);

    const room = this.roomManager.joinRoom(roomId, player.id);
    if (room) {
      socket.join(roomId);
      this.playerManager.updatePlayerRoom(player.id, roomId);

      const playerIndex = room.players.indexOf(player.id);
      socket.emit('room:joined', { room, playerIndex: playerIndex !== -1 ? playerIndex : null });
      socket.to(roomId).emit('room:updated', room);
    }
  }

  private leaveRoom(socket: Socket, playerId: string): void {
    const player = this.playerManager.getPlayer(playerId);
    if (!player || !player.currentRoomId) return;

    const roomId = player.currentRoomId;
    const room = this.roomManager.leaveRoom(playerId);
    
    socket.leave(roomId);
    this.playerManager.updatePlayerRoom(playerId, null);

    if (room) {
      socket.to(roomId).emit('room:updated', room);
      
      // 如果游戏结束（有胜者），发送结算信息
      if (room.status === 'finished' && room.winner) {
        this.io.to(roomId).emit('game:ended', { winner: room.winner, reason: 'escape' });
        this.io.to(roomId).emit('game:settlement', { winner: room.winner, countdown: 10 });
      }
    }

    // 更新大厅房间列表
    this.io.emit('lobby:rooms', this.roomManager.getAllRooms());
  }

  // 定期检查结算时间
  private startSettlementCheck(): void {
    setInterval(() => {
      const rooms = this.roomManager.getAllRooms();
      rooms.forEach(room => {
        if (room.status === 'finished' && room.settlementEndTime) {
          if (Date.now() >= room.settlementEndTime) {
            const resetRoom = this.roomManager.resetRoom(room.id);
            if (resetRoom) {
              this.io.to(room.id).emit('room:updated', resetRoom);
              this.io.emit('lobby:rooms', this.roomManager.getAllRooms());
            }
          }
        }
      });
    }, 1000);
  }
}