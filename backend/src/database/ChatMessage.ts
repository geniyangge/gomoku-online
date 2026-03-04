import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  playerId: string;
  nickname: string;
  content: string;
  timestamp: number;
  type: 'lobby' | 'room';
  roomId?: string;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  playerId: { type: String, required: true },
  nickname: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Number, required: true, index: true },
  type: { type: String, required: true, enum: ['lobby', 'room'] },
  roomId: { type: String },
});

ChatMessageSchema.index({ type: 1, roomId: 1, timestamp: -1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
