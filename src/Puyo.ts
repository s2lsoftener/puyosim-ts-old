export const PuyoType = {
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
}

export class Puyo {
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
  get isGarbage (): boolean {
    if (this.p === PuyoType.Garbage || this.p === PuyoType.Hard) {
      return true;
    } else {
      return false;
    }
  }
}