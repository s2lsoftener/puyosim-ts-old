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
  get isColored (): boolean {
    if (this.p === PuyoType.Red || this.p === PuyoType.Green || this.p === PuyoType.Blue || this.p === PuyoType.Yellow || this.p === PuyoType.Purple) {
      return true;
    } else {
      return false;
    }
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
  public poppingGroups: Puyo[][];
  public poppingColors: string[];

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
    this.poppingGroups = [];
    this.poppingColors = [];
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

  public checkForColorPops(): void {
    // Generate boolean matrix to track which cells have already been checked.
    const checkMatrix: boolean[][] = []
    for (let x: number = 0; x < this.settings.cols; x++) {
      checkMatrix[x] = []
      for (let y: number = 0; y < this.settings.rows; y++) {
        checkMatrix[x][y] = false
      }
    }

    const poppingGroups: Puyo[][] = []
    const colors = []

    // Loop through the matrix. If the loop comes across a Puyo, start a "group search".
    for (let x = 0; x < this.settings.cols; x++) {
      for (let y = this.settings.hiddenRows; y < this.settings.rows; y++) {
        if (this.matrix[x][y].isColored && checkMatrix[x][y] === false) {
          checkMatrix[x][y] = true

          let group: Puyo[] = []
          let puyo: Puyo
          group.push(this.matrix[x][y])
          for (let i = 0; i < group.length; i++) {
            puyo = group[i]
            // Check up
            if (puyo.y > this.settings.hiddenRows && puyo.p === this.matrix[puyo.x][puyo.y - 1].p && checkMatrix[puyo.x][puyo.y - 1] === false) {
              checkMatrix[puyo.x][puyo.y - 1] = true
              group.push(this.matrix[puyo.x][puyo.y - 1])
            }
            // Check down
            if (puyo.y < this.settings.rows - 1 && puyo.p === this.matrix[puyo.x][puyo.y + 1].p && checkMatrix[puyo.x][puyo.y + 1] === false) {
              checkMatrix[puyo.x][puyo.y + 1] = true
              group.push(this.matrix[puyo.x][puyo.y + 1])
            }
            // Check left
            if (puyo.x > 0 && puyo.p === this.matrix[puyo.x - 1][puyo.y].p && checkMatrix[puyo.x - 1][puyo.y] === false) {
              checkMatrix[puyo.x - 1][puyo.y] = true
              group.push(this.matrix[puyo.x - 1][puyo.y])
            }
            // Check right
            if (puyo.x < this.settings.cols - 1 && puyo.p === this.matrix[puyo.x + 1][puyo.y].p && checkMatrix[puyo.x + 1][puyo.y] === false) {
              checkMatrix[puyo.x + 1][puyo.y] = true
              group.push(this.matrix[puyo.x + 1][puyo.y])
            }
          }
          if (group.length >= this.settings.puyoToPop) {
            poppingGroups.push(group)
            colors.push(group[0].p) // Push a color code
          }
        }
      } 
    }

    // Get set of colors popping without duplicates
    const poppingColors: string[] = colors.filter((value, index, self) => {
      return self.indexOf(value) >= index
    })

    this.poppingGroups = poppingGroups;
    this.poppingColors = poppingColors;
  }
}

const test_matrix = new Field([
  ["B", "B", "B", "B", "Y", "Y", "Y", "Y", "G", "G", "G", "G", "G"],
  ["J", "J", "P", "P", "P", "P", "R", "R", "R", "R", "G", "G", "G"],
  ["B", "B", "B", "B", "Y", "Y", "Y", "Y", "G", "G", "G", "G", "G"],
  ["J", "J", "P", "P", "P", "P", "R", "R", "R", "R", "G", "G", "G"],
  ["B", "B", "B", "B", "Y", "Y", "Y", "Y", "G", "G", "G", "G", "G"],
  ["J", "J", "P", "P", "P", "P", "R", "R", "R", "R", "G", "G", "G"]
]);

test_matrix.checkForColorPops();