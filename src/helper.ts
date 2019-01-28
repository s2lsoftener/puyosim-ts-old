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
    matrix[x] = []
    for (let y = 0; y < cols; y++) {
      matrix[x][y] = value;
    }
  }
  return matrix
}