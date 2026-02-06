export class GobangGame {
  private board: number[][];
  private size: number = 15;

  constructor() {
    this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(-1));
  }

  // 获取当前棋盘
  getBoard(): number[][] {
    return this.board.map(row => [...row]);
  }

  // 重置棋盘
  reset(): void {
    this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(-1));
  }

  // 落子
  makeMove(x: number, y: number, player: number): boolean {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      return false;
    }
    if (this.board[y][x] !== -1) {
      return false;
    }
    this.board[y][x] = player;
    return true;
  }

  // 检查是否获胜
  checkWin(x: number, y: number, player: number): boolean {
    const directions = [
      [1, 0],   // 水平
      [0, 1],   // 垂直
      [1, 1],   // 对角线
      [1, -1],  // 反对角线
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      
      // 正方向
      for (let i = 1; i < 5; i++) {
        const nx = x + dx * i;
        const ny = y + dy * i;
        if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.size) break;
        if (this.board[ny][nx] === player) {
          count++;
        } else {
          break;
        }
      }

      // 反方向
      for (let i = 1; i < 5; i++) {
        const nx = x - dx * i;
        const ny = y - dy * i;
        if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.size) break;
        if (this.board[ny][nx] === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 5) {
        return true;
      }
    }

    return false;
  }

  // 检查是否平局（棋盘已满）
  checkDraw(): boolean {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.board[y][x] === -1) {
          return false;
        }
      }
    }
    return true;
  }
}