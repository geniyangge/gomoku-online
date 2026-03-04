import mongoose from 'mongoose'

const MONGODB_USER = process.env.MONGODB_USER
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD
const MONGODB_URI = `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@cluster0.htwjmgm.mongodb.net/?appName=Cluster0`

export async function connectDB(): Promise<typeof mongoose> {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('MongoDB 连接成功')
    return mongoose
  } catch (error) {
    console.error('MongoDB 连接失败:', error)
    process.exit(1)
  }
}

export default mongoose
