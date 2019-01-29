import * as PIXI from "pixi.js";
import Field from "./Field";
import { createUniformArray, transposeMatrix } from "./helper";
import { Puyo, PuyoType } from "./Puyo";

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

export default class ChainsimEditor {
  // Settings
  public gameSettings: GameSettings;
  public simulatorSettings: SimulatorSettings;
  public displayMode: string;
  public simulationSpeed: number;
  public autoAdvance: boolean;

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
  public fieldDisplay: { [k: string]: any } = {};
  public fieldControls: { [k: string]: any } = {};
  public puyoDisplay: PIXI.Sprite[][] = [];
  public scoreDisplay: PIXI.Sprite[] = [];

  // State trackers
  public state: any; // Function alias
  public frame: number;
  public puyoStates: string[][];
  public puyoDropSpeed: number[][];
  public puyoBounceFrames: number[][];
  public prevState: any; // Function alias

  // Data
  public gameField: Field;

  // Helper
  public coordArray: any[][];

  constructor(targetDiv: HTMLElement) {
    this.gameSettings = {
      width: 608, // 608
      height: 1000, // 1000
      cellWidth: 64,
      cellHeight: 60
    };
    this.simulatorSettings = defaultSimulatorSettings;
    this.displayMode = "simple";
    this.simulationSpeed = 1;
    this.autoAdvance = false;

    // Init data
    this.gameField = new Field(
      createUniformArray(
        "0",
        this.simulatorSettings.cols,
        this.simulatorSettings.rows
      ),
      this.simulatorSettings
    );
    this.frame = 0;

    // Helper properties
    this.coordArray = [];
    for (let x = 0; x < this.simulatorSettings.cols; x++) {
      this.coordArray[x] = [];
      for (let y = 0; y < this.simulatorSettings.rows; y++) {
        this.coordArray[x][y] = {
          x:
            x * this.gameSettings.cellWidth +
            this.gameSettings.cellWidth / 2 +
            25,
          y:
            y * this.gameSettings.cellHeight +
            this.gameSettings.cellHeight / 2 +
            124
        };
      }
    }
    this.puyoStates = createUniformArray(
      "idle",
      this.simulatorSettings.cols,
      this.simulatorSettings.rows
    );
    this.puyoDropSpeed = createUniformArray(
      0,
      this.simulatorSettings.cols,
      this.simulatorSettings.rows
    );
    this.puyoBounceFrames = createUniformArray(
      0,
      this.simulatorSettings.cols,
      this.simulatorSettings.rows
    );

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
      "/chainsim/img/arle_bg.png",
      "/chainsim/img/field.json",
      "/chainsim/img/puyo.json",
      "/chainsim/img/arrow.png",
      "/chainsim/img/arrow_x.png",
      "/chainsim/img/cursor.png",
      "/chainsim/img/cursor_x.png",
      "/chainsim/img/chain_font.json",
      "/chainsim/img/edit_bubble.png",
      "/chainsim/img/touch_disabler.png",
      "/chainsim/img/picker_arrow_left.png",
      "/chainsim/img/picker_arrow_right.png",
      "/chainsim/img/editor_x.png",
      "/chainsim/img/current_tool.png",
      "/chainsim/img/next_background_1p_mask.png",
      "/chainsim/img/rotate_container.png"
    ];

    this.loader.add(this.texturesToLoad).load((loader: any, resources: any) => {
      this.resources = resources;
      this.fieldSprites = resources["/chainsim/img/field.json"].textures;
      this.puyoSprites = resources["/chainsim/img/puyo.json"].textures;
      this.chainCountSprites =
        resources["/chainsim/img/chain_font.json"].textures;
      this.initFieldDisplay();
      this.initScoreDisplay();
      this.initGameOverX();
      this.initPuyoDisplay();
      this.refreshPuyoSprites();
      this.initFieldControls();
    });

    this.state = this.idleState;

    // Load a test matrix
    this.app.ticker.add(delta => this.gameLoop(delta));
  }

  public setNewField(inputMatrix: string[][]): void {
    this.gameField = new Field(inputMatrix, this.simulatorSettings);
    this.refreshPuyoSprites();
  }

  private initFieldDisplay(): void {
    this.fieldDisplay.charBG = new Sprite(
      this.resources["/chainsim/img/arle_bg.png"].texture
    );
    this.fieldDisplay.charBG.x = 17;
    this.fieldDisplay.charBG.y = 183;
    this.app.stage.addChild(this.fieldDisplay.charBG);

    // Top Border
    this.fieldDisplay.borderTop = new Sprite(
      this.fieldSprites["field_border_top.png"]
    );
    this.fieldDisplay.borderTop.y = 132;
    this.app.stage.addChild(this.fieldDisplay.borderTop);

    // Left border, top half
    this.fieldDisplay.borderLeftTop = new Sprite(
      this.fieldSprites["field_border_left_tophalf.png"]
    );
    this.fieldDisplay.borderLeftTop.y = 184;
    this.app.stage.addChild(this.fieldDisplay.borderLeftTop);

    // Left border, bottom half
    this.fieldDisplay.borderLeftBottom = new Sprite(
      this.fieldSprites["field_border_left_bottomhalf.png"]
    );
    this.fieldDisplay.borderLeftBottom.y = 536;
    this.app.stage.addChild(this.fieldDisplay.borderLeftBottom);

    // Right border, top half
    this.fieldDisplay.borderRightTop = new Sprite(
      this.fieldSprites["field_border_right_tophalf.png"]
    );
    this.fieldDisplay.borderRightTop.x = 417;
    this.fieldDisplay.borderRightTop.y = 184;
    this.app.stage.addChild(this.fieldDisplay.borderRightTop);

    // Right border, bottom half
    this.fieldDisplay.borderRightBottom = new Sprite(
      this.fieldSprites["field_border_right_bottomhalf.png"]
    );
    this.fieldDisplay.borderRightBottom.x = 417;
    this.fieldDisplay.borderRightBottom.y = 536;
    this.app.stage.addChild(this.fieldDisplay.borderRightBottom);

    // Bottom border
    this.fieldDisplay.borderBottom = new Sprite(
      this.fieldSprites["field_border_bottom.png"]
    );
    this.fieldDisplay.borderBottom.y = 902;
    this.app.stage.addChild(this.fieldDisplay.borderBottom);

    // Next Window Border
    this.fieldDisplay.nextWindowBorder = new Sprite(
      this.fieldSprites["next_border_1p.png"]
    );
    this.fieldDisplay.nextWindowBorder.x = 456;
    this.fieldDisplay.nextWindowBorder.y = 160;
    this.app.stage.addChild(this.fieldDisplay.nextWindowBorder);

    // Next Window Inner
    this.fieldDisplay.nextWindowInner = new Sprite(
      this.fieldSprites["next_background_1p.png"]
    );
    this.fieldDisplay.nextWindowInner.x = 456;
    this.fieldDisplay.nextWindowInner.y = 160;
    this.app.stage.addChild(this.fieldDisplay.nextWindowInner);

    // NEXT Puyo Mask
    this.fieldDisplay.nextWindowMask = new Sprite(
      this.resources["/chainsim/img/next_background_1p_mask.png"].texture
    );
    this.fieldDisplay.nextWindowMask.position.set(456, 160);
    this.app.stage.addChild(this.fieldDisplay.nextWindowMask);
  }

  private initScoreDisplay(): void {
    const startX: number = this.displayMode === "simple" ? 32 : 150;

    for (let i = 0; i < 8; i++) {
      this.scoreDisplay[i] = new Sprite(this.fieldSprites["score_0.png"]);
      this.scoreDisplay[i].anchor.set(0.5);
      this.scoreDisplay[i].x = startX + this.scoreDisplay[i].width * 0.9 * i;
      this.scoreDisplay[i].y = 935;
      this.app.stage.addChild(this.scoreDisplay[i]);
    }
  }

  private initGameOverX(): void {
    this.fieldDisplay.redX = new Sprite(this.puyoSprites["death_X.png"]);
    this.fieldDisplay.redX.anchor.set(0.5);
    this.fieldDisplay.redX.x = this.coordArray[2][1].x;
    this.fieldDisplay.redX.y = this.coordArray[2][1].y;
    this.app.stage.addChild(this.fieldDisplay.redX);
  }

  private initPuyoDisplay(): void {
    this.puyoDisplay = [];
    for (let x = 0; x < this.simulatorSettings.cols; x++) {
      this.puyoDisplay[x] = [];
      for (let y = 0; y < this.simulatorSettings.rows; y++) {
        this.puyoDisplay[x][y] = new Sprite(this.puyoSprites["red_urdl.png"]);
        this.puyoDisplay[x][y].anchor.set(0.5);
        this.puyoDisplay[x][y].x = this.coordArray[x][y].x;
        this.puyoDisplay[x][y].y = this.coordArray[x][y].y;
        this.puyoDisplay[x][y].interactive = true;
        this.app.stage.addChild(this.puyoDisplay[x][y]);
      }
    }
  }

  private initFieldControls(): void {
    const startY = 480;
    let height;
    let i = 0;

    // Reset button
    this.fieldControls.reset = new Sprite(this.fieldSprites["btn_reset.png"]);
    this.fieldControls.reset.x = 452;
    this.fieldControls.reset.y = startY;
    this.fieldControls.reset.interactive = true;
    this.fieldControls.reset.buttonMode = true;
    this.fieldControls.reset.on("pointerdown", () => {
      this.fieldControls.reset.texture = this.fieldSprites[
        "btn_reset_pressed.png"
      ];
    });
    this.fieldControls.reset.on("pointerup", () => {
      this.fieldControls.reset.texture = this.fieldSprites["btn_reset.png"];

      this.autoAdvance = false;
      this.simulationSpeed = 1;
      this.frame = 0;
      this.gameField.updateFieldMatrix(this.gameField.inputMatrix); // Reset to inputMatrix
      this.gameField.refreshLinkData();
      this.gameField.refreshPuyoPositionData();
      this.gameField.setConnectionData();
      this.gameField.simState = "idle";
      this.refreshPuyoSprites();

      this.state = this.idleState;
    });
    this.fieldControls.reset.on("pointerupoutside", () => {
      this.fieldControls.reset.texture = this.fieldSprites["btn_reset.png"];
    });
    this.app.stage.addChild(this.fieldControls.reset);
    height = this.fieldControls.reset.height;

    // Pause button
    this.fieldControls.pause = new Sprite(this.fieldSprites["btn_pause.png"]);
    this.fieldControls.pause.x = 528;
    this.fieldControls.pause.y = startY + height * i;
    this.fieldControls.pause.interactive = true;
    this.fieldControls.pause.buttonMode = true;
    this.fieldControls.pause.on("pointerdown", () => {
      this.fieldControls.pause.texture = this.fieldSprites[
        "btn_pause_pressed.png"
      ];
    });
    this.fieldControls.pause.on("pointerup", () => {
      this.fieldControls.pause.texture = this.fieldSprites["btn_pause.png"];
      this.autoAdvance = false;
    });
    this.fieldControls.pause.on("pointerupoutside", () => {
      this.fieldControls.pause.texture = this.fieldSprites["btn_pause.png"];
    });
    this.app.stage.addChild(this.fieldControls.pause);
    i += 1;

    this.fieldControls.play = new Sprite(this.fieldSprites["btn_play.png"]);
    this.fieldControls.play.x = 452;
    this.fieldControls.play.y = startY + height * i;
    this.fieldControls.play.interactive = true;
    this.fieldControls.play.buttonMode = true;
    this.fieldControls.play.on("pointerdown", () => {
      this.fieldControls.play.texture = this.fieldSprites[
        "btn_play_pressed.png"
      ];
      this.autoAdvance = false;
      this.simulationSpeed = 1;
      this.gameField.advanceState();
    });
    this.fieldControls.play.on("pointerup", () => {
      this.fieldControls.play.texture = this.fieldSprites["btn_play.png"];
    });
    this.fieldControls.play.on("pointerupoutside", () => {
      this.fieldControls.play.texture = this.fieldSprites["btn_play.png"];
    });
    this.app.stage.addChild(this.fieldControls.play);

    this.fieldControls.auto = new Sprite(this.fieldSprites["btn_auto.png"]);
    this.fieldControls.auto.x = 528;
    this.fieldControls.auto.y = startY + height * i;
    this.fieldControls.auto.interactive = true;
    this.fieldControls.auto.buttonMode = true;
    this.fieldControls.auto.on("pointerdown", () => {
      this.fieldControls.auto.texture = this.fieldSprites[
        "btn_auto_pressed.png"
      ];
    });
    this.fieldControls.auto.on("pointerup", () => {
      this.fieldControls.auto.texture = this.fieldSprites["btn_auto.png"];

      console.log(this.gameField.simState);
      if (this.gameField.simState === "idle" && this.autoAdvance === false) {
        this.autoAdvance = true;
        this.simulationSpeed = 1;
        this.gameField.advanceState();
      } else if (
        this.gameField.simState === "idle" &&
        this.autoAdvance === true
      ) {
        this.simulationSpeed *= 2;
        this.gameField.advanceState();
      } else if (this.gameField.simState === "dropped") {
        this.autoAdvance = true;
        this.simulationSpeed = 1;
        this.gameField.advanceState();
      } else {
        this.simulationSpeed *= 2;
      }
    });
    this.fieldControls.auto.on("pointerupoutside", () => {
      this.fieldControls.auto.texture = this.fieldSprites["btn_auto.png"];
    });
    this.app.stage.addChild(this.fieldControls.auto);
    i += 1;

    this.fieldControls.edit = new Sprite(this.fieldSprites["btn_edit.png"]);
    this.fieldControls.edit.x = 490;
    this.fieldControls.edit.y = startY + i * height;
    this.fieldControls.edit.interactive = true;
    this.fieldControls.edit.buttonMode = true;
    this.fieldControls.edit.on("pointerdown", () => {
      this.fieldControls.edit.texture = this.fieldSprites[
        "btn_edit_pressed.png"
      ];
    });
    this.fieldControls.edit.on("pointerup", () => {
      this.fieldControls.edit.texture = this.fieldSprites["btn_edit.png"];
    });
    this.fieldControls.edit.on("pointerupoutside", () => {
      this.fieldControls.edit.texture = this.fieldSprites["btn_edit.png"];
    });
    this.app.stage.addChild(this.fieldControls.edit);

    this.fieldDisplay.disableTouchBehind = new Sprite(
      this.resources["/chainsim/img/touch_disabler.png"].texture
    );
    this.fieldDisplay.disableTouchBehind.x = 0;
    this.fieldDisplay.disableTouchBehind.y = 0;
    this.fieldDisplay.disableTouchBehind.width = this.gameSettings.width;
    this.fieldDisplay.disableTouchBehind.height = this.gameSettings.height;
    this.app.stage.addChild(this.fieldDisplay.disableTouchBehind);
    this.fieldDisplay.disableTouchBehind.interactive = false;
  }

  private refreshPuyoSprites(): void {
    for (let x = 0; x < this.simulatorSettings.cols; x++) {
      for (let y = 0; y < this.simulatorSettings.rows; y++) {
        // console.log(`${this.gameField.matrix[x][y].name}_${this.gameField.matrix[x][y].connections}.png`);
        this.puyoDisplay[x][y].texture = this.puyoSprites[
          `${this.gameField.matrix[x][y].name}_${
            this.gameField.matrix[x][y].connections
          }.png`
        ];
        this.puyoDisplay[x][y].anchor.set(0.5);
        this.puyoDisplay[x][y].x = this.coordArray[x][y].x;
        this.puyoDisplay[x][y].y = this.coordArray[x][y].y;
        this.puyoDisplay[x][y].alpha = 1;
        this.puyoDisplay[x][y].scale.x = 1;
        this.puyoDisplay[x][y].scale.y = 1;
        this.puyoStates[x][y] = "idle";
        this.puyoDropSpeed[x][y] = 0;
        this.puyoBounceFrames[x][y] = 0;
      }
    }
  }

  private gameLoop(delta: number): void {
    this.state(delta);
  }

  private idleState(delta: number): void {
    if (this.gameField.simState === "checkingDrops") {
      this.refreshPuyoSprites();
      this.state = this.animateFieldDrops;
      console.log(JSON.parse(JSON.stringify(this.gameField.dropDistances)));
    }
    if (this.gameField.simState === "checkingPops") {
      this.refreshPuyoSprites();
      this.state = this.animatePops;
      console.log(JSON.parse(JSON.stringify(this.gameField.dropDistances)));
    }
  }

  private animateFieldDrops(delta: number): void {
    if (this.gameField.simState === "checkingDrops") {
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
            if (
              this.gameField.dropDistances[x][y] > 0 &&
              this.puyoStates[x][y] === "idle"
            ) {
              this.puyoStates[x][y] = "dropping";
            }

            // Apply gravity to puyos that should be dropping
            if (this.puyoStates[x][y] === "dropping") {
              if (
                this.puyoDisplay[x][y].y + this.puyoDropSpeed[x][y] <
                this.coordArray[x][y].y +
                  this.gameField.dropDistances[x][y] *
                    this.gameSettings.cellHeight
              ) {
                this.puyoDisplay[x][y].y += this.puyoDropSpeed[x][y];
                this.puyoDropSpeed[x][y] += (0.1875 / 16) * 30 * t;
              } else {
                this.puyoStates[x][y] = "bouncing";
                this.puyoDisplay[x][y].y =
                  this.coordArray[x][y].y +
                  this.gameField.dropDistances[x][y] *
                    this.gameSettings.cellHeight +
                  this.gameSettings.cellHeight / 2;
                if (this.gameField.matrix[x][y].isColored) {
                  this.puyoDisplay[x][y].anchor.set(0.5, 1);
                }
              }
            }

            // Play bounce animation for colored Puyos
            if (this.puyoStates[x][y] === "bouncing") {
              this.puyoBounceFrames[x][y] += 1;
              if (
                this.puyoBounceFrames[x][y] < 8 &&
                this.gameField.matrix[x][y].isColored
              ) {
                this.puyoDisplay[x][y].scale.y -= 0.2 / 8;
                this.puyoDisplay[x][y].scale.x += 0.2 / 8;
              } else if (
                this.puyoBounceFrames[x][y] < 16 &&
                this.gameField.matrix[x][y].isColored
              ) {
                this.puyoDisplay[x][y].scale.y += 0.2 / 8;
                this.puyoDisplay[x][y].scale.x -= 0.2 / 8;
              } else {
                this.puyoDisplay[x][y].anchor.set(0.5, 0.5);
                this.puyoDisplay[x][y].y =
                  this.coordArray[x][y].y +
                  this.gameField.dropDistances[x][y] *
                    this.gameSettings.cellHeight;
                this.puyoStates[x][y] = "idle";
                this.gameField.dropDistances[x][y] = 0;
                this.puyoBounceFrames[x][y] = 0;
                this.puyoDropSpeed[x][y] = 0;
              }
            }
          }
        }
        this.frame += 1;
      }

      if (stillDropping === false) {
        this.frame = 0;
        this.gameField.advanceState(); // Advance state to "dropped" (set the field.)
        // this.refreshPuyoSprites();

        console.log(this.gameField.simState);

        const nextState: string = this.gameField.advanceState();
        if (nextState === "checkingPops" && this.autoAdvance === true) {
          this.refreshPuyoSprites();
          this.state = this.animatePops;
        } else {
          this.gameField.simState = "dropped";
          this.refreshPuyoSprites();
          this.state = this.idleState;
        }
      }
    } else if (this.gameField.simState === "dropped") {
      this.frame = 0;
      const nextState: string = this.gameField.advanceState();
      if (nextState === "checkingPops" && this.autoAdvance === true) {
        this.refreshPuyoSprites();
        this.state = this.animatePops;
      } else {
        this.gameField.simState = "dropped";
        this.refreshPuyoSprites();
        this.state = this.idleState;
      }
    }
  }

  private animatePops(delta: number): void {
    if (this.gameField.simState === "checkingPops") {
      const speed: number = delta * this.simulationSpeed;

      const duration: number = 30;
      for (let i = 0; i < Math.round(speed); i++) {
        if (this.gameField.hasPops) {
          if (this.frame < duration * 0.6) {
            // Animate colored Puyos flashing
            for (const group of this.gameField.poppingGroups) {
              for (const puyo of group) {
                Math.cos((this.frame / 3) * Math.PI) >= 0
                  ? (this.puyoDisplay[puyo.x][puyo.y].alpha = 1)
                  : (this.puyoDisplay[puyo.x][puyo.y].alpha = 0);
              }
            }
          } else if (this.frame >= duration * 0.6) {
            // Change colored Puyos to burst sprite
            if (this.frame < duration) {
              for (const group of this.gameField.poppingGroups) {
                for (const puyo of group) {
                  this.puyoDisplay[puyo.x][puyo.y].alpha = 1;
                  this.puyoDisplay[puyo.x][puyo.y].texture = this.puyoSprites[
                    `burst_${this.gameField.matrix[puyo.x][puyo.y].name}.png`
                  ];
                }
              }
            } else {
              for (const group of this.gameField.poppingGroups) {
                for (const puyo of group) {
                  this.puyoDisplay[puyo.x][puyo.y].alpha =
                    1 - this.frame / duration / 1.2;
                }
              }
            }

            // Fade out the garbage Puyos
            for (let x = 0; x < this.simulatorSettings.cols; x++) {
              for (let y = 0; y < this.simulatorSettings.rows; y++) {
                if (this.gameField.garbageClearCountMatrix[x][y] === 1) {
                  if (this.gameField.matrix[x][y].p === PuyoType.Garbage) {
                    this.puyoDisplay[x][y].alpha = 1 - this.frame / duration;
                  }
                  if (this.gameField.matrix[x][y].p === PuyoType.Hard) {
                    if (this.frame <= duration * 0.8) {
                      this.puyoDisplay[x][y].alpha =
                        1 - (this.frame / duration) * 0.8;
                    } else {
                      this.puyoDisplay[x][y].texture = this.puyoSprites[
                        "garbage_n.png"
                      ];
                      this.puyoDisplay[x][y].alpha =
                        (this.frame - duration * 0.8) /
                        (duration - duration * 0.8);
                    }
                  }
                }
              }
            }
          }
        }
        this.frame += 1;
      }

      if (this.frame >= duration * 1.2) {
        this.frame = 0;

        this.gameField.advanceState(); // "checkingPops" -> "popped"
        // this.refreshPuyoSprites();

        const nextState: string = this.gameField.advanceState();
        if (nextState === "checkingDrops") {
          this.refreshPuyoSprites();
          this.state = this.animateFieldDrops;
        } else {
          this.refreshPuyoSprites();
          this.state = this.idleState;
        }
      }
    } else if (this.gameField.simState === "popped") {
      this.frame = 0;
      const nextState: string = this.gameField.advanceState();
      if (nextState === "checkingDrops") {
        this.refreshPuyoSprites();
        this.state = this.animateFieldDrops;
      } else {
        this.refreshPuyoSprites();
        this.state = this.idleState;
      }
    }
  }
}
