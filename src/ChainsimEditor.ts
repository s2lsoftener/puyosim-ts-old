import * as PIXI from "pixi.js";
import Field from "./Field";
import { createUniformArray, transposeMatrix } from "./helper";
import { Puyo } from "./Puyo";

const Sprite = PIXI.Sprite;

interface GameSettings {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
}

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

const defaultSimulatorSettings: SimulatorSettings = {
  rows: 13,
  cols: 6,
  hiddenRows: 1,
  targetPoint: 70,
  puyoToPop: 4,
  garbageInHiddenRowBehavior: "SEGA",
  chainPower: [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512, 544, 576, 608, 640, 672], 
  colorBonus: [0, 3, 6, 12, 24],
  groupBonus: [0, 2, 3, 4, 5, 6, 7, 10],
  pointPuyo: 50
};

export default class ChainsimEditor {
  // Settings
  public gameSettings: GameSettings;
  public simulatorSettings: SimulatorSettings;
  public displayMode: string;
  public simulationSpeed: number;
  
  // PIXI Objects
  public loader: PIXI.Loader;
  public resources: any;

  // Game objects
  public app: PIXI.Application;
  public spritesheetJSON: any;
  public fieldSprites: any; // Wha type is this...?
  public puyoSprites: any;
  public chainCountSprites: any;
  public texturesToLoad: string[];
  public fieldDisplay: {[k: string]: any} = {};
  public puyoDisplay: PIXI.Sprite[][] = [];
  public scoreDisplay: PIXI.Sprite[] = [];

  // State trackers
  public state: any; // Function alias
  public frame: number;
  public puyoStates: string[][];
  public puyoDropSpeed: number[][];
  public puyoBounceFrames: number[][];

  // Data
  public gameField: Field;

  // Helper
  public coordArray: any[][];

  constructor(targetDiv: HTMLElement) {
    this.gameSettings = {
      width: 608,
      height: 974,
      cellWidth: 64,
      cellHeight: 60
    };
    this.simulatorSettings = defaultSimulatorSettings;
    this.displayMode = 'simple';
    this.simulationSpeed = 1;

    // Init data
    this.gameField = new Field(createUniformArray("0", this.simulatorSettings.cols, this.simulatorSettings.rows), this.simulatorSettings);
    this.frame = 0;

    // Helper properties
    this.coordArray = []
    for (let x = 0; x < this.simulatorSettings.cols; x++) {
      this.coordArray[x] = [];
      for (let y = 0; y < this.simulatorSettings.rows; y++) {
        this.coordArray[x][y] = {
          x: (x * this.gameSettings.cellWidth) + (this.gameSettings.cellWidth / 2) + 25,
          y: (y * this.gameSettings.cellHeight) + (this.gameSettings.cellHeight / 2) + 124
        }
      }
    }
    this.puyoStates = createUniformArray("idle", this.simulatorSettings.cols, this.simulatorSettings.rows);
    this.puyoDropSpeed = createUniformArray(0, this.simulatorSettings.cols, this.simulatorSettings.rows);
    this.puyoBounceFrames = createUniformArray(0, this.simulatorSettings.cols, this.simulatorSettings.rows);

    // Create app and append to HTML
    this.app = new PIXI.Application(
      this.gameSettings.width,
      this.gameSettings.height,
      {
        antialias: true,
        transparent: true,
        resolution: 1
      }
    );
    this.app.view.style.width = `${this.gameSettings.width * 0.8}px`;
    this.app.view.style.height = `${this.gameSettings.height * 0.8}px`;
    targetDiv.appendChild(this.app.view);

    // Create loader and load resources
    // Webpack loading resources: https://github.com/pixijs/pixi.js/issues/2633#issuecomment-229627857
    this.loader = new PIXI.Loader();

    this.texturesToLoad = [
      '/chainsim/img/arle_bg.png',
      '/chainsim/img/field.json',
      '/chainsim/img/puyo.json',
      '/chainsim/img/arrow.png',
      '/chainsim/img/arrow_x.png',
      '/chainsim/img/cursor.png',
      '/chainsim/img/cursor_x.png',
      '/chainsim/img/chain_font.json',
      '/chainsim/img/edit_bubble.png',
      '/chainsim/img/touch_disabler.png',
      '/chainsim/img/picker_arrow_left.png',
      '/chainsim/img/picker_arrow_right.png',
      '/chainsim/img/editor_x.png',
      '/chainsim/img/current_tool.png',
      '/chainsim/img/next_background_1p_mask.png',
      '/chainsim/img/rotate_container.png'
    ]

    this.loader
      .add(this.texturesToLoad)
      .load((loader: any, resources: any) => {
        this.resources = resources;
        this.fieldSprites = resources["/chainsim/img/field.json"].textures;
        this.puyoSprites = resources["/chainsim/img/puyo.json"].textures;
        this.chainCountSprites = resources["/chainsim/img/chain_font.json"].textures;
        this.initFieldDisplay();
        this.initScoreDisplay();
        this.initGameOverX();
        this.initPuyoDisplay();
        this.refreshPuyoSprites();
      })
    
    this.state = this.idleState;

    // Load a test matrix
    this.app.ticker.add(delta => this.gameLoop(delta));
  }

  public setNewField(inputMatrix: string[][]): void {
    this.gameField = new Field(inputMatrix, this.simulatorSettings);
    this.refreshPuyoSprites();
  }

  private initFieldDisplay(): void {
    this.fieldDisplay.charBG = new Sprite(this.resources['/chainsim/img/arle_bg.png'].texture);
    this.fieldDisplay.charBG.x = 17;
    this.fieldDisplay.charBG.y = 183;
    this.app.stage.addChild(this.fieldDisplay.charBG);

    // Top Border
    this.fieldDisplay.borderTop = new Sprite(this.fieldSprites['field_border_top.png'])
    this.fieldDisplay.borderTop.y = 132
    this.app.stage.addChild(this.fieldDisplay.borderTop)

    // Left border, top half
    this.fieldDisplay.borderLeftTop = new Sprite(this.fieldSprites['field_border_left_tophalf.png'])
    this.fieldDisplay.borderLeftTop.y = 184
    this.app.stage.addChild(this.fieldDisplay.borderLeftTop)

    // Left border, bottom half
    this.fieldDisplay.borderLeftBottom = new Sprite(this.fieldSprites['field_border_left_bottomhalf.png'])
    this.fieldDisplay.borderLeftBottom.y = 536
    this.app.stage.addChild(this.fieldDisplay.borderLeftBottom)

    // Right border, top half
    this.fieldDisplay.borderRightTop = new Sprite(this.fieldSprites['field_border_right_tophalf.png'])
    this.fieldDisplay.borderRightTop.x = 417
    this.fieldDisplay.borderRightTop.y = 184
    this.app.stage.addChild(this.fieldDisplay.borderRightTop)

    // Right border, bottom half
    this.fieldDisplay.borderRightBottom = new Sprite(this.fieldSprites['field_border_right_bottomhalf.png'])
    this.fieldDisplay.borderRightBottom.x = 417
    this.fieldDisplay.borderRightBottom.y = 536
    this.app.stage.addChild(this.fieldDisplay.borderRightBottom)

    // Bottom border
    this.fieldDisplay.borderBottom = new Sprite(this.fieldSprites['field_border_bottom.png'])
    this.fieldDisplay.borderBottom.y = 902
    this.app.stage.addChild(this.fieldDisplay.borderBottom)

    // Next Window Border
    this.fieldDisplay.nextWindowBorder = new Sprite(this.fieldSprites['next_border_1p.png'])
    this.fieldDisplay.nextWindowBorder.x = 456
    this.fieldDisplay.nextWindowBorder.y = 160
    this.app.stage.addChild(this.fieldDisplay.nextWindowBorder)

    // Next Window Inner
    this.fieldDisplay.nextWindowInner = new Sprite(this.fieldSprites['next_background_1p.png'])
    this.fieldDisplay.nextWindowInner.x = 456
    this.fieldDisplay.nextWindowInner.y = 160
    this.app.stage.addChild(this.fieldDisplay.nextWindowInner)

    // NEXT Puyo Mask
    this.fieldDisplay.nextWindowMask = new Sprite(this.resources['/chainsim/img/next_background_1p_mask.png'].texture)
    this.fieldDisplay.nextWindowMask.position.set(456, 160)
    this.app.stage.addChild(this.fieldDisplay.nextWindowMask)
  }

  private initScoreDisplay(): void {
    const startX: number = (this.displayMode === "simple") ? 32 : 150
    
    for (let i = 0; i < 8; i++) {
      this.scoreDisplay[i] = new Sprite(this.fieldSprites["score_0.png"]);
      this.scoreDisplay[i].anchor.set(0.5);
      this.scoreDisplay[i].x = startX + this.scoreDisplay[i].width * 0.9 * i;
      this.scoreDisplay[i].y = 935;
      this.app.stage.addChild(this.scoreDisplay[i]);
    }
  }

  private initGameOverX(): void {
    this.fieldDisplay.redX = new Sprite(this.puyoSprites['death_X.png']);
    this.fieldDisplay.redX.anchor.set(0.5);
    this.fieldDisplay.redX.x = this.coordArray[2][1].x;
    this.fieldDisplay.redX.y = this.coordArray[2][1].y;
    this.app.stage.addChild(this.fieldDisplay.redX);
  }

  private initPuyoDisplay(): void {
    this.puyoDisplay = []
    for (let x = 0; x < this.simulatorSettings.cols; x++) {
      this.puyoDisplay[x] = [];
      for (let y = 0; y < this.simulatorSettings.rows; y++) {
        this.puyoDisplay[x][y] = new Sprite(this.puyoSprites["red_urdl.png"]);
        this.puyoDisplay[x][y].anchor.set(0.5);
        this.puyoDisplay[x][y].x = this.coordArray[x][y].x;
        this.puyoDisplay[x][y].y = this.coordArray[x][y].y;
        this.puyoDisplay[x][y].interactive = true;
        this.app.stage.addChild(this.puyoDisplay[x][y])
      }
    }
  }

  private refreshPuyoSprites(): void {
    for (let x = 0; x < this.simulatorSettings.cols; x++) {
      for (let y = 0; y < this.simulatorSettings.rows; y++) {
        // console.log(`${this.gameField.matrix[x][y].name}_${this.gameField.matrix[x][y].connections}.png`);
        this.puyoDisplay[x][y].texture = this.puyoSprites[`${this.gameField.matrix[x][y].name}_${this.gameField.matrix[x][y].connections}.png`]
        this.puyoDisplay[x][y].anchor.set(0.5);
        this.puyoDisplay[x][y].x = this.coordArray[x][y].x;
        this.puyoDisplay[x][y].y = this.coordArray[x][y].y;
        this.puyoStates[x][y] = "idle";
      }
    }
  }

  private gameLoop(delta: number): void {
    this.state(delta);
  }

  private idleState(delta: number): void {
    if (this.gameField.simState === "checkingDrops") {
      this.state = this.animateFieldDrops;
    }
  }

  private animateFieldDrops(delta: number): void {
    const t = this.frame;
    const speed = delta * this.simulationSpeed;

    let stillDropping: boolean = false;
    for (let i = 0; i < Math.round(speed); i++) {
      for (let x = 0; x < this.simulatorSettings.cols; x++) {
        for (let y = 0; y < this.simulatorSettings.rows; y++) {
          if (this.gameField.dropDistances[x][y] > 0) {
            stillDropping = true;
          }
          
          // If the Puyo is "idle", change state to "dropping"
          if (this.gameField.dropDistances[x][y] > 0 && this.puyoStates[x][y] === "idle") {
            this.puyoStates[x][y] = "dropping";
          }

          // Apply gravity to puyos that should be dropping
          if (this.puyoStates[x][y] === "dropping") {
            if (this.puyoDisplay[x][y].y + this.puyoDropSpeed[x][y] < this.coordArray[x][y].y + this.gameField.dropDistances[x][y] * this.gameSettings.cellHeight) {
              this.puyoDisplay[x][y].y += this.puyoDropSpeed[x][y]
              this.puyoDropSpeed[x][y] += 0.1875 / 16 * 60 * t
            } else {
              this.puyoStates[x][y] = "bouncing";
              this.puyoDisplay[x][y].y = this.coordArray[x][y].y + this.gameField.dropDistances[x][y] * this.gameSettings.cellHeight + this.gameSettings.cellHeight / 2
              if (this.gameField.matrix[x][y].isColored) {
                this.puyoDisplay[x][y].anchor.set(0.5, 1);
              }
            }
          }

          // Play bounce animation for colored Puyos
          if (this.puyoStates[x][y] === "bouncing") {
            this.puyoBounceFrames[x][y] += 1;
            if (this.puyoBounceFrames[x][y] < 8 && this.gameField.matrix[x][y].isColored) {
              this.puyoDisplay[x][y].scale.y -= 0.2 / 8;
              this.puyoDisplay[x][y].scale.x += 0.2 / 8;
            } else if (this.puyoBounceFrames[x][y] < 16 && this.gameField.matrix[x][y].isColored) {
              this.puyoDisplay[x][y].scale.y += 0.2 / 8;
              this.puyoDisplay[x][y].scale.x -= 0.2 / 8;
            } else {
              this.puyoDisplay[x][y].anchor.set(0.5, 0.5);
              this.puyoDisplay[x][y].y = this.coordArray[x][y].y + this.gameField.dropDistances[x][y] * this.gameSettings.cellHeight;
              this.puyoStates[x][y] = "idle";
              this.gameField.dropDistances[x][y] = 0;
              this.puyoBounceFrames[x][y] = 0;
              this.puyoDropSpeed[x][y] = 4;
            }
          }
        }
      }
      this.frame += 1;
    }

    if (stillDropping === false) {
      this.frame = 0;
      this.gameField.advanceState(); // Advance state to "dropped" (set the field.)
      this.refreshPuyoSprites();

      console.log(this.gameField.simState);
      
      const nextState: string = this.gameField.advanceState();
      if (nextState === "checkingPops") {
        this.state = this.animateColorPops;
      } else {
        this.state = this.idleState;
      }

    }
  }

  private animateColorPops(delta: number): void {
    const speed: number = delta * this.simulationSpeed;

    for (let i = 0; i < Math.round(speed); i++) {
      if (this.gameField.hasPops) {
        for (const group of this.gameField.poppingGroups) {
          for (const puyo of group) {
            if (this.frame < 24) {
              (Math.cos(this.frame / 3 * Math.PI) >= 0)
                ? this.puyoDisplay[puyo.x][puyo.y].alpha = 1
                : this.puyoDisplay[puyo.x][puyo.y].alpha = 0
            } else if (this.frame >= 24) {
              this.puyoDisplay[puyo.x][puyo.y].alpha = 1;
              this.puyoDisplay[puyo.x][puyo.y].texture = this.puyoSprites[`burst_${this.gameField.matrix[puyo.x][puyo.y].name}.png`]
            }
          }
        }

        if (this.frame < 24) {
          for (const group of this.gameField.poppingGroups) {
            for (const puyo of group) {
              (Math.cos(this.frame / 3 * Math.PI) >= 0)
                ? this.puyoDisplay[puyo.x][puyo.y].alpha = 1
                : this.puyoDisplay[puyo.x][puyo.y].alpha = 0
            }
          }
        } else if (this.frame >= 24) {
          for (const group of this.gameField.poppingGroups) {
            for (const puyo of group) {
              this.puyoDisplay[puyo.x][puyo.y].alpha = 1;
              this.puyoDisplay[puyo.x][puyo.y].texture = this.puyoSprites[`burst_${this.gameField.matrix[puyo.x][puyo.y].name}.png`]
            }
          }

          for (let x = 0; x < this.simulatorSettings.cols; x++) {
            for (let y = 0; y < this.simulatorSettings.rows; y++) {
              if (this.gameField.garbageClearCountMatrix[x][y] === 1) {
                this.puyoDisplay[x][y].alpha = 1 - this.frame / 32;
              } else {

              }
            }
          }
        }
      }
      this.frame += 1;
    }

    if (this.frame >= 32) {
      this.frame = 0;

    }
  }

}
