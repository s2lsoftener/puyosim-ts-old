const PuyoType = {
  Red: "R",
  Green: "G",
  Blue: "B",
  Yellow: "Y",
  Purple: "P",
  Garbage: "J",
  Hard: "H",
  Point: "N",
  Sun: "S",
  Block: "L",
  None: "0"
};

class Puyo {
  public p: string;
  public x: number;
  public y: number;
  constructor(color: string, x: number, y: number) {
    this.p = color;
    this.x = x;
    this.y = y;
  }
}

interface SimulatorSettings {
  rows: number;
  cols: number;
  hiddenRows: number;
  targetPoint: number;
  puyoToPop: number;
}

class Field {
  public matrix: Puyo[][];
  public inputMatrix: string[][];
  public settings: SimulatorSettings;

  constructor(matrix: string[][], settings?: SimulatorSettings) {
    this.inputMatrix = matrix;
    if (settings !== undefined) {
      this.settings = settings;
    } else {
      this.settings = {
        rows: 13,
        cols: 6,
        hiddenRows: 1,
        targetPoint: 70,
        puyoToPop: 4
      };
    }
    this.matrix = [];
    for (let x: number = 0; x < this.settings.cols; x++) {
      this.matrix[x] = [];
      for (let y: number = 0; y < this.settings.rows; y++) {
        this.matrix[x][y] = new Puyo(PuyoType.None, x, y);
      }
    }
    this.updateFieldMatrix(this.inputMatrix);
  }

  public updateFieldMatrix(newMatrix: string[][]): void {
    // Insert the data from newMatrix.
    if (newMatrix[0].length < this.settings.rows) {
      // If inputMatrix is shorter than the matrix defined by settings,
      // shift the cells down to the new bottom of the matrix
      for (let x: number = 0; x < newMatrix.length; x++) {
        for (let y: number = 0; y < newMatrix[x].length; y++) {
          this.matrix[x][
            y + this.settings.rows - newMatrix[x].length
          ] = new Puyo(
            newMatrix[x][y],
            x,
            y + this.settings.rows - newMatrix[x].length
          );
        }
      }
    } else if (newMatrix[0].length > this.settings.rows) {
      // If newMatrix is larger than the matrix defined by settings,
      // shift the cells up to the new bottom of the matrix.
      for (let x: number = 0; x < this.settings.cols; x++) {
        for (let y: number = 0; y < this.settings.rows; y++) {
          // Check if current column is out of bounds in resultant matrix
          if (newMatrix.length <= this.settings.cols && x < newMatrix.length) {
            this.matrix[x][y] = new Puyo(
              newMatrix[x][y + newMatrix[0].length - this.settings.rows],
              x,
              y
            );
          } else {
            this.matrix[x][y] = new Puyo(PuyoType.None, x, y);
          }
        }
      }
    } else {
      // If the heights are the same, just copy in place.
      for (let x: number = 0; x < this.settings.cols; x++) {
        for (let y: number = 0; y < this.settings.rows; y++) {
          if (newMatrix.length <= this.settings.cols && x < newMatrix.length) {
            this.matrix[x][y] = this.matrix[x][y] = new Puyo(
              newMatrix[x][y],
              x,
              y
            );
          }
        }
      }
    }
  }

  public dropPuyos(): void {
    console.log("Why?");
    for (let x: number = 0; x < this.matrix.length; x++) {
      const slicePoints: number[] = [-1];
      const slices: Puyo[][] = [];
      let newColumn: Puyo[] = [];

      for (let y: number = 0; y < this.matrix[x].length; y++) {
        if (this.matrix[x][y].p === PuyoType.Block) {
          slicePoints.push(y);
        }
      }

      slicePoints.forEach((v, i) => {
        i === slicePoints.length - 1
          ? slices.push(this.matrix[x].slice(v + 1, this.matrix[x].length))
          : slices.push(this.matrix[x].slice(v + 1, slicePoints[i + 1] + 1));
      });

      slices.forEach(slice => {
        const emptyCells: Puyo[] = slice.filter(
          puyo => puyo.p === PuyoType.None
        );
        const PuyoCells: Puyo[] = slice.filter(
          puyo => puyo.p !== PuyoType.None
        );
        newColumn = [...newColumn, ...emptyCells, ...PuyoCells];
      });

      this.matrix[x] = newColumn;
    }
  }
}

const test_matrix = new Field([
  ["B", "0", "L", "R", "R", "0", "L", "L", "0", "G", "0", "L", "0"],
  ["J", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]
]);
