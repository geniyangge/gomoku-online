import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  sessionId: string;
  playerId: string;
  nickname: string;
  currentRoomId: string | null;
  gameState: {
    status: 'idle' | 'playing' | 'finished';
    playerIndex: number | null;
    roomId: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>({
  sessionId: { type: String, required: true, unique: true, index: true },
  playerId: { type: String, required: true, index: true },
  nickname: { type: String, required: true },
  currentRoomId: { type: String, default: null },
  gameState: {
    status: { type: String, enum: ['idle', 'playing', 'finished'], default: 'idle' },
    playerIndex: { type: Number, default: null },
    roomId: { type: String, default: null },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Session = mongoose.model<ISession>('Session', SessionSchema);
