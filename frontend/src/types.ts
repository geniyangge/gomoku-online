// 玩家信息
export interface Player {
  id: string;
  nickname: string;
  socketId: string;
  currentRoomId: string | null;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  content: string;
  timestamp: number;
  type: 'lobby' | 'room';
  roomId?: string;
}

// 游戏状态
export type GameStatus = 'idle' | 'playing' | 'finished';

// 和局请求
export interface DrawRequest {
  playerId: string;
  timestamp: number;
}

// 房间信息
export interface Room {
  id: string;
  name: string;
  players: [string | null, string | null];
  spectators: string[];
  status: GameStatus;
  board: number[][];
  currentPlayer: number;
  winner: string | null;
  drawRequests: DrawRequest[];
  drawCount: Record<string, number>;
  settlementEndTime: number | null;
  chatMessages: ChatMessage[];
  createdAt: number;
}

// WebSocket事件类型
export interface ServerToClientEvents {
  'player:assigned': (player: Player) => void;
  'lobby:rooms': (rooms: Room[]) => void;
  'lobby:chat': (message: ChatMessage) => void;
  'room:joined': (data: { room: Room; playerIndex: number | null }) => void;
  'room:updated': (room: Room) => void;
  'room:chat': (message: ChatMessage) => void;
  'game:started': (data: { room: Room; firstPlayer: number }) => void;
  'game:move': (data: { x: number; y: number; player: number }) => void;
  'game:ended': (data: { winner: string | null; reason: 'win' | 'draw' | 'escape' }) => void;
  'game:draw:requested': (data: { playerId: string; playerNickname: string }) => void;
  'game:draw:rejected': (data: { playerId: string; playerNickname: string }) => void;
  'game:settlement': (data: { winner: string | null; countdown: number }) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'lobby:getRooms': () => void;
  'lobby:createRoom': (name: string) => void;
  'lobby:joinRoom': (roomId: string) => void;
  'lobby:searchRoom': (keyword: string) => void;
  'lobby:chat': (content: string) => void;
  'room:leave': () => void;
  'room:sit': (seatIndex: number) => void;
  'room:stand': () => void;
  'room:chat': (content: string) => void;
  'game:start': () => void;
  'game:move': (x: number, y: number) => void;
  'game:draw:request': () => void;
  'game:draw:accept': () => void;
  'game:draw:reject': () => void;
  'game:surrender': () => void;
}