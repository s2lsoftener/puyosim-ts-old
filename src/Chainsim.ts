import { Puyo, PuyoType } from "./Puyo";

interface SimulatorSettings {
  rows: number;
  cols: number;
  hiddenRows: number;
  targetPoint: number;
  puyoToPop: number;
  garbageInHiddenRowBehavior: string; // "SEGA" or "COMPILE";
  chainPower: number[];
  colorBonus: number[];
  groupBonus: number[];
  pointPuyo: number;
}

export default class Chainsim {
  public matrix: Puyo[][];
  public inputMatrix: string[][];
  public settings: SimulatorSettings;
  public poppingGroups: Puyo[][];
  public poppingColors: string[];
  public garbageClearCountMatrix: number[][];
  public chainLength: number;
  public linkScore: number;
  public totalScore: number;
  public linkPuyoMultiplier: number;
  public linkBonusMultiplier: number;
  public leftoverNuisancePoints: number;
  public totalGarbage: number;
  public linkGarbage: number;
  public dropDistances: number[][];
  public hasPops: boolean;
  public chainHistory: object[];

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
        puyoToPop: 4,
        garbageInHiddenRowBehavior: "SEGA",
        chainPower: [
          0,
          8,
          16,
          32,
          64,
          96,
          128,
          160,
          192,
          224,
          256,
          288,
          320,
          352,
          384,
          416,
          448,
          480,
          512,
          544,
          576,
          608,
          640,
          672
        ],
        colorBonus: [0, 3, 6, 12, 24],
        groupBonus: [0, 2, 3, 4, 5, 6, 7, 10],
        pointPuyo: 50
      };
    }

    this.poppingGroups = [];
    this.poppingColors = [];
    this.garbageClearCountMatrix = [];
    this.chainLength = 0;
    this.linkScore = 0;
    this.totalScore = 0;
    this.linkBonusMultiplier = 0;
    this.linkPuyoMultiplier = 0;
    this.leftoverNuisancePoints = 0;
    this.totalGarbage = 0;
    this.linkGarbage = 0;
    this.hasPops = false;
    this.chainHistory = [];
    
    this.matrix = [];
    this.dropDistances = [];
    for (let x: number = 0; x < this.settings.cols; x++) {
      this.matrix[x] = [];
      this.dropDistances[x] = [];
      for (let y: number = 0; y < this.settings.rows; y++) {
        this.matrix[x][y] = new Puyo(PuyoType.None, x, y);
        this.dropDistances[x][y] = 0;
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
    // Drop the puyos in each column.
    // Either they fall all the way to the ground,
    // or they fall on top of the nearest Block Puyo.
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

  public calculateDropDistances(): void {
    for (let x = 0; x < this.settings.cols; x++) {
      for (let y = 0; y < this.settings.rows; y++) {
        this.dropDistances[x][y] = y - this.matrix[x][y].y
      }
    }
  }

  public checkForColorPops(): void {
    // Generate boolean matrix to track which cells have already been checked.
    const checkMatrix: boolean[][] = [];
    for (let x: number = 0; x < this.settings.cols; x++) {
      checkMatrix[x] = [];
      for (let y: number = 0; y < this.settings.rows; y++) {
        checkMatrix[x][y] = false;
      }
    }

    const poppingGroups: Puyo[][] = [];
    const colors = [];

    // Loop through the matrix. If the loop comes across a Puyo, start a "group search".
    for (let x = 0; x < this.settings.cols; x++) {
      for (let y = this.settings.hiddenRows; y < this.settings.rows; y++) {
        if (this.matrix[x][y].isColored && checkMatrix[x][y] === false) {
          checkMatrix[x][y] = true;

          const group: Puyo[] = [];
          group.push(this.matrix[x][y]);
          for (const puyo of group) {
            // Check up
            if (
              puyo.y > this.settings.hiddenRows &&
              puyo.p === this.matrix[puyo.x][puyo.y - 1].p &&
              checkMatrix[puyo.x][puyo.y - 1] === false
            ) {
              checkMatrix[puyo.x][puyo.y - 1] = true;
              group.push(this.matrix[puyo.x][puyo.y - 1]);
            }
            // Check down
            if (
              puyo.y < this.settings.rows - 1 &&
              puyo.p === this.matrix[puyo.x][puyo.y + 1].p &&
              checkMatrix[puyo.x][puyo.y + 1] === false
            ) {
              checkMatrix[puyo.x][puyo.y + 1] = true;
              group.push(this.matrix[puyo.x][puyo.y + 1]);
            }
            // Check left
            if (
              puyo.x > 0 &&
              puyo.p === this.matrix[puyo.x - 1][puyo.y].p &&
              checkMatrix[puyo.x - 1][puyo.y] === false
            ) {
              checkMatrix[puyo.x - 1][puyo.y] = true;
              group.push(this.matrix[puyo.x - 1][puyo.y]);
            }
            // Check right
            if (
              puyo.x < this.settings.cols - 1 &&
              puyo.p === this.matrix[puyo.x + 1][puyo.y].p &&
              checkMatrix[puyo.x + 1][puyo.y] === false
            ) {
              checkMatrix[puyo.x + 1][puyo.y] = true;
              group.push(this.matrix[puyo.x + 1][puyo.y]);
            }
          }
          if (group.length >= this.settings.puyoToPop) {
            poppingGroups.push(group);
            colors.push(group[0].p); // Push a color code
          }
        }
      }
    }

    // Get set of colors popping without duplicates
    const poppingColors: string[] = colors.filter((value, index, self) => {
      return self.indexOf(value) >= index;
    });

    this.poppingGroups = poppingGroups;
    this.poppingColors = poppingColors;

    if (poppingGroups.length === 0) {
      this.hasPops = false;
    } else {
      this.hasPops = true;
    }
  }

  public checkForGarbagePops(): void {
    const garbageClearCountMatrix: number[][] = [];
    for (let x = 0; x < this.settings.cols; x++) {
      garbageClearCountMatrix[x] = [];
      for (let y = 0; y < this.settings.rows; y++) {
        garbageClearCountMatrix[x][y] = 0;
      }
    }

    for (const group of this.poppingGroups) {
      for (const puyo of group) {
        // Check up.
        // SEGA behavior: garbage can be cleared while they're still in the hidden rows if Puyos pop underneath
        // COMPILE behavior: garbage can't be cleared while they're in the hidden rows
        if (this.settings.garbageInHiddenRowBehavior === "SEGA") {
          if (
            puyo.y > this.settings.hiddenRows - 1 &&
            this.matrix[puyo.x][puyo.y - 1].isGarbage
          ) {
            garbageClearCountMatrix[puyo.x][puyo.y - 1] += 1;
          }
        } else if (this.settings.garbageInHiddenRowBehavior === "COMPILE") {
          if (
            puyo.y > this.settings.hiddenRows &&
            this.matrix[puyo.x][puyo.y - 1].isGarbage
          ) {
            garbageClearCountMatrix[puyo.x][puyo.y - 1] += 1;
          }
        }

        // Check down
        if (
          puyo.y < this.settings.rows - 1 &&
          this.matrix[puyo.x][puyo.y + 1].isGarbage
        ) {
          garbageClearCountMatrix[puyo.x][puyo.y + 1] += 1;
        }

        // Check left
        if (puyo.x > 0 && this.matrix[puyo.x - 1][puyo.y].isGarbage) {
          garbageClearCountMatrix[puyo.x - 1][puyo.y] += 1;
        }

        // Check right
        if (
          puyo.x < this.settings.cols - 1 &&
          this.matrix[puyo.x + 1][puyo.y].isGarbage
        ) {
          garbageClearCountMatrix[puyo.x + 1][puyo.y] += 1;
        }
      }
    }

    this.garbageClearCountMatrix = garbageClearCountMatrix;
  }

  public calculateLinkScore(): void {
    let linkGroupBonus: number = 0;
    for (const group of this.poppingGroups) {
      if (this.settings.puyoToPop < 4) {
        if (group.length >= 11 - (4 - this.settings.puyoToPop)) {
          linkGroupBonus += this.settings.groupBonus[
            this.settings.groupBonus.length - 1
          ];
        } else {
          linkGroupBonus += this.settings.groupBonus[
            group.length - this.settings.puyoToPop
          ];
        }
      } else {
        if (group.length >= 11) {
          linkGroupBonus += this.settings.groupBonus[
            this.settings.groupBonus.length - 1
          ];
        } else {
          linkGroupBonus += this.settings.groupBonus[group.length - 4];
        }
      }
    }

    const linkColorBonus: number = this.settings.colorBonus[
      this.poppingColors.length - 1
    ];

    const linkChainPower: number = this.settings.chainPower[
      this.chainLength - 1
    ];

    let linkPuyoCleared: number = 0;
    for (const group of this.poppingGroups) {
      linkPuyoCleared += group.length;
    }

    let linkTotalBonus = linkGroupBonus + linkColorBonus + linkChainPower;
    if (linkTotalBonus < 1) {
      linkTotalBonus = 1;
    } else if (linkTotalBonus > 999) {
      linkTotalBonus = 999;
    }

    const linkScore = 10 * linkPuyoCleared * linkTotalBonus;
    this.linkScore = linkScore;
    this.linkPuyoMultiplier = 10 * linkPuyoCleared;
    this.linkBonusMultiplier = linkTotalBonus;
    this.totalScore += this.linkScore;
  }

  public calculateGarbage(): void {
    const nuisancePoints: number =
      this.linkScore / this.settings.targetPoint + this.leftoverNuisancePoints;
    const nuisanceCount: number = Math.floor(nuisancePoints);
    this.leftoverNuisancePoints = nuisancePoints - nuisanceCount;
    this.totalGarbage += nuisanceCount;
    this.linkGarbage = nuisanceCount;
  }

  public popPuyos(): void {
    for (const group of this.poppingGroups) {
      for (const puyo of group) {
        this.matrix[puyo.x][puyo.y].p = "0";
      }
    }
  }

  public popGarbage(): void {
    for (let x = 0; x < this.settings.cols; x++) {
      for (let y = 0; y < this.settings.rows; y++) {
        if (this.garbageClearCountMatrix[x][y] === 1) {
          if (this.matrix[x][y].p === PuyoType.Garbage) {
            this.matrix[x][y].p = "0";
          } else if (this.matrix[x][y].p === PuyoType.Hard) {
            this.matrix[x][y].p = "J";
          }
        } else if (this.garbageClearCountMatrix[x][y] >= 2) {
          this.matrix[x][y].p = "0";
        }
      }
    }
  }

  public simulateLink(): boolean {
    this.dropPuyos();
    this.calculateDropDistances();
    this.checkForColorPops();
    this.checkForGarbagePops();

    if (this.hasPops === true) {
      this.chainLength += 1;
      this.calculateLinkScore();
      this.calculateGarbage();
      this.popPuyos();
      this.popGarbage();
      this.hasPops = false;
      return true;
    }
    return false;
  }

  public simulateChain(): void {
    let result = true
    while (result) {
      result = this.simulateLink();
    }
  }

  public readableMatrix(): string[][] {
    const transposeMatrix: string[][] = []
    for (let y = 0; y < this.settings.rows; y++) {
      transposeMatrix[y] = []
      for (let x = 0; x < this.settings.cols; x++) {
        transposeMatrix[y][x] = this.matrix[x][y].p
      }
    }
    return transposeMatrix
  }
}


