export function transposeMatrix(inputMatrix: string[][]): string[][] {
  const transpose: string[][] = [];
  for (let y = 0; y < inputMatrix[0].length; y++) {
    transpose[y] = [];
    for (let x = 0; x < inputMatrix.length; x++) {
      transpose[y][x] = inputMatrix[x][y];
    }
  }
  return transpose;
}

export function createUniformArray(value: any, cols: number, rows: number) {
  const matrix: any[][] = [];
  for (let x = 0; x < cols; x++) {
    matrix[x] = [];
    for (let y = 0; y < rows; y++) {
      matrix[x][y] = value;
    }
  }
  return matrix;
}

export function convertStringTo2DArray(value: string, cols: number, rows: number) {
  const matrix: any[][] = createUniformArray("0", cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      matrix[x][y] = value[y * 6 + x];
    }
  }
  return matrix;
}

export class Keyboard {
  public value: string;
  public isDown: boolean;
  public isUp: boolean;
  public press: () => any;
  public release: () => any;

  constructor(value: string, downFunction: () => any, upFunction: () => any) {
    this.value = value;
    this.isDown = false;
    this.isUp = true;
    this.press = downFunction;
    this.release = upFunction;

    const downListener = this.downHandler.bind(this);
    const upListener = this.upHandler.bind(this);
    window.addEventListener("keydown", downListener, false);
    window.addEventListener("keyup", upListener, false);
  }

  private downHandler(event: any): void {
    if (event.key === this.value) {
      if (this.isUp && this.press) {
        this.press();
      }
      this.isDown = true;
      this.isUp = false;
      event.preventDefault();
    }
  }

  private upHandler(event: any): void {
    if (event.key === this.value) {
      if (this.isDown && this.release) {
        this.release();
      }
      this.isDown = false;
      this.isUp = true;
      event.preventDefault();
    }
  }
}
