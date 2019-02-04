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

interface CurrentTool {
  page: number;
  item: number;
  row: number;
  puyo: any;
  targetLayer: string;
  x: number;
  y: number;
}

interface Surface {
  horizontal: object[],
  vertical: object[]
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
  public chainCountDisplay: { [k: string]: any } = {};
  public scoreCountSprites: any;
  public texturesToLoad: string[];
  public fieldDisplay: { [k: string]: any } = {};
  public fieldControls: { [k: string]: any } = {};
  public puyoDisplay: PIXI.Sprite[][] = [];
  public garbageDisplay: PIXI.Sprite[] = [];
  public scoreDisplay: PIXI.Sprite[] = [];
  public editorDisplay: { [k: string]: any } = {};
  public editorToolDisplay: any[][][];
  public nextPuyoPairs: PIXI.Sprite[][] = [];

  // State trackers
  public simulatorMode: string;
  public leftButtonDown: boolean;
  public rightButtonDown: boolean;
  public state: any; // Function alias
  public frame: number;
  public puyoStates: string[][];
  public puyoDropSpeed: number[][];
  public puyoBounceFrames: number[][];
  public garbageDisplayCoordinates: number[];
  public prevState: any; // Function alias
  public editorOpen: boolean;
  public currentTool: CurrentTool;
  public currentNextPuyos: string[][];

  // Data
  public gameField: Field;

  // Helper
  public coordArray: any[][];
  public nextCoord: any[];
  public surfaces: Surface;

  constructor(targetDiv: HTMLElement) {
    this.gameSettings = {
      width: 630, // 608
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
      createUniformArray("0", this.simulatorSettings.cols, this.simulatorSettings.rows),
      this.simulatorSettings
    );
    this.frame = 0;

    // Placement properties
    this.coordArray = [];
    for (let x = 0; x < this.simulatorSettings.cols; x++) {
      this.coordArray[x] = [];
      for (let y = 0; y < this.simulatorSettings.rows; y++) {
        this.coordArray[x][y] = {
          x: x * this.gameSettings.cellWidth + this.gameSettings.cellWidth / 2 + 25,
          y: y * this.gameSettings.cellHeight + this.gameSettings.cellHeight / 2 + 124
        };
      }
    }

    this.nextCoord = [{ x: 478, y: 196 }, { x: 530, y: 328 }, { x: 530, y: 488 }];

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
    this.garbageDisplayCoordinates = [];

    // Create app and append to HTML
    this.leftButtonDown = false;
    this.rightButtonDown = false;
    this.app = new PIXI.Application(this.gameSettings.width, this.gameSettings.height, {
      antialias: true,
      transparent: true,
      resolution: 1
    });
    // this.app.view.style.width = `${this.gameSettings.width * 0.8}px`;
    // this.app.view.style.height = `${this.gameSettings.height * 0.8}px`;
    this.app.view.style.backgroundColor = "#AAAAAA";

    this.app.stage.interactive = true;
    this.app.stage.on("pointerdown", () => {
      this.leftButtonDown = true;
    });
    this.app.stage.on("pointerup", () => {
      this.leftButtonDown = false;
      this.rightButtonDown = false;
    });
    this.app.stage.on("pointerupoutside", () => {
      this.leftButtonDown = false;
      this.rightButtonDown = false;
    });
    this.app.stage.on("rightdown", () => {
      this.leftButtonDown = false;
      this.rightButtonDown = true;
    });
    this.app.stage.on("rightup", () => {
      this.leftButtonDown = false;
      this.rightButtonDown = false;
    });
    this.app.stage.on("rightupoutside", () => {
      this.leftButtonDown = false;
      this.rightButtonDown = false;
    });
    targetDiv.appendChild(this.app.view);

    // Disable right click menu
    this.app.view.oncontextmenu = e => e.preventDefault();

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
      "/chainsim/img/scoreFont.json",
      "/chainsim/img/edit_bubble.png",
      "/chainsim/img/touch_disabler.png",
      "/chainsim/img/picker_arrow_left.png",
      "/chainsim/img/picker_arrow_right.png",
      "/chainsim/img/editor_x.png",
      "/chainsim/img/current_tool.png",
      "/chainsim/img/next_background_1p_mask.png",
      "/chainsim/img/rotate_container.png",
      "/chainsim/img/side_container.png",
      "/chainsim/img/btn_sim.png",
      "/chainsim/img/btn_sim_pressed.png",
      "/chainsim/img/layer_main.png",
      "/chainsim/img/layer_shadow.png",
      "/chainsim/img/btn_share.png",
      "/chainsim/img/btn_share_pressed.png"
    ];

    this.loader.add(this.texturesToLoad).load((loader: any, resources: any) => {
      this.loadAssets(loader, resources);
    });

    // Editor
    this.editorOpen = false;
    this.currentTool = {
      page: 0,
      item: 0,
      row: 0,
      puyo: "",
      targetLayer: "main",
      x: -2424,
      y: -2424
    };
    this.editorToolDisplay = [];

    // Game states
    this.state = this.idleState;
    this.simulatorMode = "sim"; // "edit", "sim"
    this.currentNextPuyos = [["R", "G"], ["B", "Y"], ["P", "R"]];
    
    // Surfaces
    this.surfaces = {
      horizontal: [],
      vertical: []
    };
    this.calculateSurfaces();
    console.log(this.surfaces);

    // Load a test matrix
    this.app.ticker.add(delta => this.gameLoop(delta));
  }

  public setNewField(inputMatrix: string[][]): void {
    this.gameField = new Field(inputMatrix, this.simulatorSettings);
    this.refreshPuyoSprites();
  }

  private loadAssets(loader: any, resources: any): void {
    this.resources = resources;
    this.fieldSprites = resources["/chainsim/img/field.json"].textures;
    this.puyoSprites = resources["/chainsim/img/puyo.json"].textures;
    this.chainCountSprites = resources["/chainsim/img/chain_font.json"].textures;
    this.scoreCountSprites = resources["/chainsim/img/scoreFont.json"].textures;
    this.initFieldDisplay();
    this.initScoreDisplay();
    this.initGameOverX();
    this.initPuyoDisplay();
    this.refreshPuyoSprites();
    this.initFieldControls();
    this.initGarbageDisplay();
    this.initChainCounter();
    this.initNextPuyos();
    this.initEditorDisplay();
  }

  private initFieldDisplay(): void {
    this.fieldDisplay.charBG = new Sprite(this.resources["/chainsim/img/arle_bg.png"].texture);
    this.fieldDisplay.charBG.x = 17;
    this.fieldDisplay.charBG.y = 183;
    this.app.stage.addChild(this.fieldDisplay.charBG);

    // Top Border
    this.fieldDisplay.borderTop = new Sprite(this.fieldSprites["field_border_top.png"]);
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
    this.fieldDisplay.borderBottom = new Sprite(this.fieldSprites["field_border_bottom.png"]);
    this.fieldDisplay.borderBottom.y = 902;
    this.app.stage.addChild(this.fieldDisplay.borderBottom);

    // Next Window Border
    this.fieldDisplay.nextWindowBorder = new Sprite(this.fieldSprites["next_border_1p.png"]);
    this.fieldDisplay.nextWindowBorder.x = 456;
    this.fieldDisplay.nextWindowBorder.y = 160;
    this.app.stage.addChild(this.fieldDisplay.nextWindowBorder);

    // Next Window Inner
    this.fieldDisplay.nextWindowInner = new Sprite(this.fieldSprites["next_background_1p.png"]);
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
      this.scoreDisplay[i] = new Sprite(this.scoreCountSprites["score_0.png"]);
      this.scoreDisplay[i].scale.set(0.8, 0.8);
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

        // Define interactions when pressed
        this.puyoDisplay[x][y].interactive = true;

        // Left click. Replace Puyo with currentTool.puyo
        this.puyoDisplay[x][y].on("pointerdown", () => {
          if (this.currentTool.targetLayer === "main" && this.state === this.idleState) {
            if (this.currentTool.puyo !== "") {
              this.gameField.inputMatrix[x][y] = this.currentTool.puyo;
              this.gameField.matrix[x][y].p = this.currentTool.puyo;
              this.gameField.matrix[x][y].x = x;
              this.gameField.matrix[x][y].y = y;
            }
            this.refreshPuyoSprites();
          }
        });

        // Right click. Erase current puyo.
        this.puyoDisplay[x][y].on("rightdown", () => {
          if (this.currentTool.targetLayer === "main" && this.state === this.idleState) {
            this.gameField.inputMatrix[x][y] = "0";
            this.gameField.matrix[x][y].p = "0";
            this.gameField.matrix[x][y].x = x;
            this.gameField.matrix[x][y].y = y;
            this.refreshPuyoSprites();
          }
        });

        this.puyoDisplay[x][y].on("pointerover", () => {
          if (
            this.currentTool.targetLayer === "main" &&
            this.state === this.idleState &&
            this.leftButtonDown === true &&
            this.rightButtonDown === false &&
            this.currentTool.puyo !== ""
          ) {
            this.gameField.inputMatrix[x][y] = this.currentTool.puyo;
            this.gameField.matrix[x][y].p = this.currentTool.puyo;
            this.gameField.matrix[x][y].x = x;
            this.gameField.matrix[x][y].y = y;
            this.refreshPuyoSprites();
          } else if (
            this.currentTool.targetLayer === "main" &&
            this.state === this.idleState &&
            this.rightButtonDown === true
          ) {
            this.gameField.inputMatrix[x][y] = "0";
            this.gameField.matrix[x][y].p = "0";
            this.gameField.matrix[x][y].x = x;
            this.gameField.matrix[x][y].y = y;
            this.refreshPuyoSprites();
          }
        });

        // Turn off leftButtonDown when mouse buttons are released
        const releaseMouse = () => {
          this.leftButtonDown = false;
          this.rightButtonDown = false;
        };
        this.puyoDisplay[x][y].on("pointerupoutside", () => releaseMouse());
        this.puyoDisplay[x][y].on("pointerup", () => releaseMouse());
        this.puyoDisplay[x][y].on("rightup", () => releaseMouse());
        this.puyoDisplay[x][y].on("rightupoutside", () => releaseMouse());

        this.app.stage.addChild(this.puyoDisplay[x][y]);
      }
    }
  }

  private initFieldControls(): void {
    // Side container
    this.fieldControls.container = new Sprite(
      this.resources["/chainsim/img/side_container.png"].texture
    );
    this.fieldControls.container.x = 438;
    this.fieldControls.container.y = 548;
    this.app.stage.addChild(this.fieldControls.container);

    // Toolset toggle buttons
    this.fieldControls.showSimTools = new Sprite(this.resources["/chainsim/img/btn_sim_pressed.png"].texture);
    this.fieldControls.showSimTools.x = 456;
    this.fieldControls.showSimTools.y = 472;
    this.fieldControls.showSimTools.interactive = true;
    this.fieldControls.showSimTools.buttonMode = true;
    this.fieldControls.showSimTools.on("pointerup", () => {
      if (this.simulatorMode !== "sim") {
        this.simulatorMode = "sim";
        this.toggleTools();
      }
      this.fieldControls.showSimTools.texture = this.resources["/chainsim/img/btn_sim_pressed.png"].texture;
      this.fieldControls.showEditTools.texture = this.fieldSprites["btn_edit.png"];
    })
    this.app.stage.addChild(this.fieldControls.showSimTools);

    this.fieldControls.showEditTools = new Sprite(this.fieldSprites["btn_edit.png"]);
    this.fieldControls.showEditTools.x = 536 - 2;
    this.fieldControls.showEditTools.y = 472 - 2;
    this.fieldControls.showEditTools.interactive = true;
    this.fieldControls.showEditTools.buttonMode = true;
    this.fieldControls.showEditTools.on("pointerup", () => {
      if (this.simulatorMode !== "edit") {
        this.simulatorMode = "edit";
        this.toggleTools();
      }
      this.fieldControls.showSimTools.texture = this.resources["/chainsim/img/btn_sim.png"].texture;
      this.fieldControls.showEditTools.texture = this.fieldSprites["btn_edit_pressed.png"];
    })
    this.app.stage.addChild(this.fieldControls.showEditTools);

    // Simulator Buttons
    const startY = 568;
    let height: number;
    let i = 0;

    this.fieldControls.reset = new Sprite(this.fieldSprites["btn_reset.png"]);
    this.fieldControls.reset.x = 456
    this.fieldControls.reset.y = startY;
    this.fieldControls.reset.interactive = true;
    this.fieldControls.reset.buttonMode = true;
    this.fieldControls.reset.on("pointerdown", () => {
      this.fieldControls.reset.texture = this.fieldSprites["btn_reset_pressed.png"];
    });
    this.fieldControls.reset.on("pointerup", () => {
      this.fieldControls.reset.texture = this.fieldSprites["btn_reset.png"];
      this.resetFieldAndState();
    });
    this.fieldControls.reset.on("pointerupoutside", () => {
      this.fieldControls.reset.texture = this.fieldSprites["btn_reset.png"];
    });
    this.app.stage.addChild(this.fieldControls.reset);
    height = this.fieldControls.reset.height;

    // Pause button
    this.fieldControls.pause = new Sprite(this.fieldSprites["btn_pause.png"]);
    this.fieldControls.pause.x = 534;
    this.fieldControls.pause.y = startY + height * i;
    this.fieldControls.pause.interactive = true;
    this.fieldControls.pause.buttonMode = true;
    this.fieldControls.pause.on("pointerdown", () => {
      this.fieldControls.pause.texture = this.fieldSprites["btn_pause_pressed.png"];
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

    // Step
    this.fieldControls.play = new Sprite(this.fieldSprites["btn_play.png"]);
    this.fieldControls.play.x = 456;
    this.fieldControls.play.y = startY + height * i;
    this.fieldControls.play.interactive = true;
    this.fieldControls.play.buttonMode = true;
    this.fieldControls.play.on("pointerdown", () => {
      this.fieldControls.play.texture = this.fieldSprites["btn_play_pressed.png"];
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

    // Play
    this.fieldControls.auto = new Sprite(this.fieldSprites["btn_auto.png"]);
    this.fieldControls.auto.x = 534;
    this.fieldControls.auto.y = startY + height * i;
    this.fieldControls.auto.interactive = true;
    this.fieldControls.auto.buttonMode = true;
    this.fieldControls.auto.on("pointerdown", () => {
      this.fieldControls.auto.texture = this.fieldSprites["btn_auto_pressed.png"];
    });
    this.fieldControls.auto.on("pointerup", () => {
      this.fieldControls.auto.texture = this.fieldSprites["btn_auto.png"];

      console.log(this.gameField.simState);
      if (this.gameField.simState === "idle" && this.autoAdvance === false) {
        this.autoAdvance = true;
        this.simulationSpeed = 1;
        this.gameField.advanceState();
      } else if (this.gameField.simState === "idle" && this.autoAdvance === true) {
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

    this.fieldControls.share = new Sprite(this.resources["/chainsim/img/btn_share.png"].texture);
    this.fieldControls.share.x = 456;
    this.fieldControls.share.y = startY + height * i;
    this.fieldControls.share.interactive = true;
    this.fieldControls.share.buttonMode = true;
    this.fieldControls.share.on("pointerdown", () => {
      this.fieldControls.share.texture = this.resources["/chainsim/img/btn_share_pressed.png"].texture;
    });
    this.fieldControls.share.on("pointerup", () => {
      this.fieldControls.share.texture = this.resources["/chainsim/img/btn_share.png"].texture;
      const array = transposeMatrix(this.gameField.matrixText);
      let outputString = "";

      for (const row of array) {
        for (const cell of row) {
          outputString += cell;
        }
      }

      prompt("Chain string: ", outputString);
    });
    this.fieldControls.share.on("pointerupoutside", () => {
      this.fieldControls.share.texture = this.resources["/chainsim/img/btn_share.png"].texture;
    });
    this.app.stage.addChild(this.fieldControls.share);
  }

  private toggleTools(): void {
    const simTools = [
      this.fieldControls.reset,
      this.fieldControls.pause,
      this.fieldControls.play,
      this.fieldControls.auto,
      this.fieldControls.share
    ]

    if (this.simulatorMode === "sim") {
      // If current simulator mode is edit, change to sim
      for (const tool of simTools) {
        tool.visible = true;
      }

      for (const page of this.editorToolDisplay) {
        for (const row of page) {
          for (const item of row) {
            item.visible = false;
          }
        }
      }

      this.editorDisplay.left.visible = false;
      this.editorDisplay.right.visible = false;
      this.editorDisplay.layerName.visible = false;

      this.editorDisplay.toolCursor.visible = false;
    } else if (this.simulatorMode === "edit") {
      // If current simulator mode is sim, change to edit
      for (const tool of simTools) {
        tool.visible = false;
      }

      const p = this.currentTool.page;
      for (const row of this.editorToolDisplay[p]) {
        for (const item of row) {
          item.visible = true;
        }
      }

      this.editorDisplay.left.visible = true;
      this.editorDisplay.right.visible = true;
      this.editorDisplay.layerName.visible = true;

      this.editorDisplay.toolCursor.visible = true;
    }
  }

  private initGarbageDisplay(): void {
    // Place Garbage Tray
    this.fieldDisplay.garbageTray = new Sprite(this.fieldSprites["garbage_tray.png"]);
    this.fieldDisplay.garbageTray.x = 337;
    this.fieldDisplay.garbageTray.y = 915;
    this.fieldDisplay.garbageTray.scale.set(0.7, 0.7);
    this.app.stage.addChild(this.fieldDisplay.garbageTray);

    // Place icon sprites
    const startX: number = this.fieldDisplay.garbageTray.x + 8;
    for (let i = 0; i < 6; i++) {
      this.garbageDisplay[i] = new Sprite(this.puyoSprites["spacer_n.png"]);
      this.garbageDisplay[i].scale.set(0.7, 0.7);
      this.garbageDisplay[i].x = startX + this.garbageDisplay[i].width * i;
      this.garbageDisplayCoordinates[i] = startX + this.garbageDisplay[i].width * i;
      this.garbageDisplay[i].y = 910;
      this.app.stage.addChild(this.garbageDisplay[i]);
    }
  }

  

  private initChainCounter(): void {
    const startX = 432;
    const startY = 836;

    this.chainCountDisplay.defaultPos = {
      x: startX,
      y: startY
    };

    this.chainCountDisplay.firstDigit = new Sprite(this.chainCountSprites["spacer.png"]);
    this.chainCountDisplay.firstDigit.x = startX;
    this.chainCountDisplay.firstDigit.y = startY;
    this.chainCountDisplay.firstDigit.scale.set(0.85, 0.85);
    this.chainCountDisplay.firstDigit.origY = this.chainCountDisplay.firstDigit.y;
    this.chainCountDisplay.firstDigit.visible = false;

    this.chainCountDisplay.secondDigit = new Sprite(this.chainCountSprites["spacer.png"]);
    this.chainCountDisplay.secondDigit.x = startX + 40;
    this.chainCountDisplay.secondDigit.y = startY;
    this.chainCountDisplay.secondDigit.scale.set(0.85, 0.85);
    this.chainCountDisplay.secondDigit.origY = this.chainCountDisplay.secondDigit.y;
    this.chainCountDisplay.secondDigit.visible = false;

    this.chainCountDisplay.chainText = new Sprite(this.chainCountSprites["chain_text.png"]);
    this.chainCountDisplay.chainText.x = startX + 84;
    this.chainCountDisplay.chainText.y = startY + 8;
    this.chainCountDisplay.chainText.origY = this.chainCountDisplay.chainText.y;
    this.chainCountDisplay.chainText.scale.set(0.85, 0.85);
    this.chainCountDisplay.chainText.visible = false;

    this.app.stage.addChild(this.chainCountDisplay.firstDigit);
    this.app.stage.addChild(this.chainCountDisplay.secondDigit);
    this.app.stage.addChild(this.chainCountDisplay.chainText);
  }

  private initNextPuyos(): void {
    this.nextPuyoPairs = [[], [], []];

    // Get colors from currentNextPuyos
    const colorNames = [["spacer", "spacer"], ["spacer", "spacer"], ["spacer", "spacer"]];

    for (let p = 0; p < colorNames.length; p++) {
      for (let i = 0; i < 2; i++) {
        switch (this.currentNextPuyos[p][i]) {
          case "R":
            colorNames[p][i] = "red";
            break;
          case "G":
            colorNames[p][i] = "green";
            break;
          case "B":
            colorNames[p][i] = "blue";
            break;
          case "Y":
            colorNames[p][i] = "yellow";
            break;
          case "P":
            colorNames[p][i] = "purple";
            break;
        }
      }
    }

    console.log(colorNames);

    for (let p = 0; p < colorNames.length; p++) {
      this.nextPuyoPairs[p][0] = new Sprite(this.puyoSprites[`${colorNames[p][0]}_n.png`]);
      this.nextPuyoPairs[p][1] = new Sprite(this.puyoSprites[`${colorNames[p][1]}_n.png`]);
      if (p > 0) {
        this.nextPuyoPairs[p][0].scale.set(0.8, 0.8);
        this.nextPuyoPairs[p][1].scale.set(0.8, 0.8);
      }
      this.nextPuyoPairs[p][0].position.set(
        this.nextCoord[p].x,
        this.nextCoord[p].y + this.nextPuyoPairs[p][0].height
      );
      this.nextPuyoPairs[p][1].position.set(this.nextCoord[p].x, this.nextCoord[p].y);

      this.nextPuyoPairs[p][0].mask = this.fieldDisplay.nextWindowMask;
      this.nextPuyoPairs[p][1].mask = this.fieldDisplay.nextWindowMask;

      this.app.stage.addChild(this.nextPuyoPairs[p][0]);
      this.app.stage.addChild(this.nextPuyoPairs[p][1]);
    }
  }

  private initEditorDisplay(): void {
    // Current tool cursor
    this.editorDisplay.toolCursor = new Sprite(
      this.resources["/chainsim/img/current_tool.png"].texture
    );
    this.editorDisplay.toolCursor.anchor.set(0.5, 0.5);
    this.editorDisplay.toolCursor.scale.set(1.1, 1.1);
    this.editorDisplay.toolCursor.visible = false;
    this.editorDisplay.toolCursor.x = this.currentTool.x;
    this.editorDisplay.toolCursor.y = this.currentTool.y;
    this.app.stage.addChild(this.editorDisplay.toolCursor);

    // Set up page 0, row 0
    const startX = 474;
    const startY = 586;

    const toolSprites = [
      [
        [
          this.resources["/chainsim/img/editor_x.png"].texture
        ],
        [
          this.puyoSprites["red_n.png"],
          this.puyoSprites["green_n.png"],
          this.puyoSprites["blue_n.png"]
        ],
        [
          this.puyoSprites["yellow_n.png"],
          this.puyoSprites["purple_n.png"]
        ],
        [
          this.puyoSprites["garbage_n.png"],
          this.puyoSprites["hard_n.png"],
          this.puyoSprites["block_n.png"]
        ]
      ],
      [
        [
          this.resources["/chainsim/img/editor_x.png"].texture
        ],
        [
          this.puyoSprites["red_n.png"],
          this.puyoSprites["green_n.png"],
          this.puyoSprites["blue_n.png"]
        ],
        [
          this.puyoSprites["yellow_n.png"],
          this.puyoSprites["purple_n.png"]
        ],
        [
          this.puyoSprites["garbage_n.png"],
          this.puyoSprites["hard_n.png"],
          this.puyoSprites["block_n.png"]
        ]
      ]
    ];

    const toolColors = [
      [
        ["0"],
        ["R", "G", "B"],
        ["Y", "P"],
        ["J", "H", "L"]
      ],
      [
        ["0"],
        ["R", "G", "B"],
        ["Y", "P"],
        ["J", "H", "L"]
      ]
    ];

    const targetLayer = [
      [
        ["main"],
        ["main", "main", "main"],
        ["main", "main"],
        ["main", "main", "main"]
      ],
      [
        ["shadow"],
        ["shadow", "shadow", "shadow"],
        ["shadow", "shadow"],
        ["shadow", "shadow", "shadow"]
      ]
    ];

    for (let p = 0; p < toolSprites.length; p++) {
      this.editorToolDisplay[p] = [];
      for (let r = 0; r < toolSprites[p].length; r++) {
        this.editorToolDisplay[p][r] = [];
        for (let i = 0; i < toolSprites[p][r].length; i++) {
          const horizontalPadding = 8;
          const verticalPadding = 8;

          // Init sprite
          this.editorToolDisplay[p][r][i] = new Sprite(toolSprites[p][r][i]);
          this.editorToolDisplay[p][r][i].interactive = true;
          this.editorToolDisplay[p][r][i].buttonMode = true;
          this.editorToolDisplay[p][r][i].scale.set(0.8, 0.8);
          this.editorToolDisplay[p][r][i].anchor.set(0.5, 0.5);
          this.editorToolDisplay[p][r][i].x =
            startX + (this.editorToolDisplay[p][r][i].width + horizontalPadding) * i;
          this.editorToolDisplay[p][r][i].y =
            startY + (this.editorToolDisplay[p][r][i].height + verticalPadding) * r;
          this.editorToolDisplay[p][r][i].on("pointerdown", () => {
            // If this item is already selected, deselect and turn off cursor
            if (
              this.currentTool.page === p &&
              this.currentTool.item === i &&
              this.currentTool.targetLayer === targetLayer[p][r][i] &&
              this.currentTool.puyo === toolColors[p][r][i]
            ) {
              this.currentTool.page = p;
              this.currentTool.item = i;
              this.currentTool.puyo = "";
              this.currentTool.targetLayer = targetLayer[p][r][i];
              this.currentTool.x = -2424;
              this.currentTool.y = -2424;
              this.editorDisplay.toolCursor.visible = false;
            } else {
              this.currentTool.page = p;
              this.currentTool.item = i;
              this.currentTool.puyo = toolColors[p][r][i];
              this.currentTool.targetLayer = targetLayer[p][r][i];
              this.currentTool.x = this.editorToolDisplay[p][r][i].x;
              this.currentTool.y = this.editorToolDisplay[p][r][i].y;
              this.editorDisplay.toolCursor.x = this.editorToolDisplay[p][r][i].x;
              this.editorDisplay.toolCursor.y = this.editorToolDisplay[p][r][i].y;
              this.editorDisplay.toolCursor.visible = true;
            }
          });

          if (targetLayer[p][r][i] === "shadow") {
            this.editorToolDisplay[p][r][i].alpha = 0.7;
          }

          this.editorToolDisplay[p][r][i].visible = false;
          this.app.stage.addChild(this.editorToolDisplay[p][r][i]);
        }
      }
    }


    const arrowY = 790;
    const editorPages = ["main", "shadow"]
    this.editorDisplay.left = new Sprite(this.resources["/chainsim/img/picker_arrow_left.png"].texture);
    this.editorDisplay.left.scale.set(0.8, 0.8);
    this.editorDisplay.left.x = 436;
    this.editorDisplay.left.y = arrowY;
    this.editorDisplay.left.interactive = true;
    this.editorDisplay.left.buttonMode = true;
    this.editorDisplay.left.visible = false;
    this.editorDisplay.left.on("pointerup", () => {
      // Get index of current page based on editorPages
      const index = editorPages.indexOf(this.currentTool.targetLayer);

      if (index === 0) {
        this.currentTool.page = editorPages.length - 1;
        this.currentTool.targetLayer = editorPages[editorPages.length - 1]
      } else {
        this.currentTool.page = index - 1;
        this.currentTool.targetLayer = editorPages[index - 1]
      }

      this.currentTool.item = 0;
      this.currentTool.row = 0;
      this.currentTool.puyo = "";
      this.editorDisplay.toolCursor.visible = false;
      this.updatePuyoPage();
    })
    this.app.stage.addChild(this.editorDisplay.left);

    this.editorDisplay.right = new Sprite(this.resources["/chainsim/img/picker_arrow_right.png"].texture);
    this.editorDisplay.right.scale.set(0.8, 0.8);
    this.editorDisplay.right.x = 584;
    this.editorDisplay.right.y = arrowY;
    this.editorDisplay.right.interactive = true;
    this.editorDisplay.right.buttonMode = true;
    this.editorDisplay.right.visible = false;
    this.editorDisplay.right.on("pointerup", () => {
      // Get index of current page based on editorPages
      const index = editorPages.indexOf(this.currentTool.targetLayer);

      if (index === editorPages.length - 1) {
        this.currentTool.page = 0;
        this.currentTool.targetLayer = editorPages[0]
      } else {
        this.currentTool.page = index + 1;
        this.currentTool.targetLayer = editorPages[index + 1]
      }

      this.currentTool.item = 0;
      this.currentTool.row = 0;
      this.currentTool.puyo = "";
      this.editorDisplay.toolCursor.visible = false;
      this.updatePuyoPage();
    })
    this.app.stage.addChild(this.editorDisplay.right);

    this.editorDisplay.layerName = new Sprite(this.resources["/chainsim/img/layer_main.png"].texture);
    this.editorDisplay.layerName.scale.set(0.8, 0.8);
    this.editorDisplay.layerName.x = 466;
    this.editorDisplay.layerName.y = arrowY;
    this.editorDisplay.layerName.visible = false;
    this.app.stage.addChild(this.editorDisplay.layerName);
  }

  private refreshPuyoSprites(): void {
    this.gameField.setConnectionData();
    for (let x = 0; x < this.simulatorSettings.cols; x++) {
      for (let y = 0; y < this.simulatorSettings.rows; y++) {
        if (this.puyoSprites) {
          this.puyoDisplay[x][y].texture = this.puyoSprites[
            `${this.gameField.matrix[x][y].name}_${this.gameField.matrix[x][y].connections}.png`
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
  }

  private resetFieldAndState(): void {
    this.autoAdvance = false;
    this.simulationSpeed = 1;
    this.frame = 0;
    this.gameField.chainLength = 0;
    this.gameField.linkScore = 0;
    this.gameField.totalScore = 0;
    this.gameField.linkBonusMultiplier = 0;
    this.gameField.linkPuyoMultiplier = 0;
    this.gameField.leftoverNuisancePoints = 0;
    this.gameField.totalGarbage = 0;
    this.gameField.linkGarbage = 0;
    this.gameField.hasPops = false;
    this.gameField.hasDrops = false;
    this.gameField.chainHistory = [];
    this.gameField.updateFieldMatrix(this.gameField.inputMatrix); // Reset to inputMatrix
    this.gameField.refreshLinkData();
    this.gameField.refreshPuyoPositionData();
    this.gameField.setConnectionData();
    this.gameField.simState = "idle";
    this.refreshPuyoSprites();
    this.refreshGarbageIcons();
    this.updateScoreDisplay();
    this.updateChainCounterDisplay();

    this.state = this.idleState;
  }

  private gameLoop(delta: number): void {
    this.calculateSurfaces();
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
      this.updateScoreDisplay();
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
            if (this.gameField.dropDistances[x][y] > 0 && this.puyoStates[x][y] === "idle") {
              this.puyoStates[x][y] = "dropping";
            }

            // Apply gravity to puyos that should be dropping
            if (this.puyoStates[x][y] === "dropping") {
              if (
                this.puyoDisplay[x][y].y + this.puyoDropSpeed[x][y] <
                this.coordArray[x][y].y +
                  this.gameField.dropDistances[x][y] * this.gameSettings.cellHeight
              ) {
                this.puyoDisplay[x][y].y += this.puyoDropSpeed[x][y];
                this.puyoDropSpeed[x][y] += (0.1875 / 16) * 30 * t;
              } else {
                this.puyoStates[x][y] = "bouncing";
                this.puyoDisplay[x][y].y =
                  this.coordArray[x][y].y +
                  this.gameField.dropDistances[x][y] * this.gameSettings.cellHeight +
                  this.gameSettings.cellHeight / 2;
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
                  this.gameField.dropDistances[x][y] * this.gameSettings.cellHeight;
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

        const nextState: string = this.gameField.advanceState();
        console.log(this.gameField.chainLength);
        // if (nextState === "checkingPops" && this.autoAdvance === true) {
        if (nextState === "checkingPops") {
          console.log(nextState);
          this.refreshPuyoSprites();
          this.updateScoreDisplay();
          this.state = this.animatePops;
        } else if (nextState === "dropped") {
          console.log(nextState);
          this.refreshPuyoSprites();
          if (this.autoAdvance === true) {
            this.gameField.advanceState();
            this.updateScoreDisplay();
            this.state = this.animatePops;
          } else {
            this.state = this.idleState;
          }
        } else {
          this.gameField.simState = "dropped";
          this.refreshPuyoSprites();
          this.state = this.idleState;
        }
      }
    } else if (this.gameField.simState === "dropped") {
      this.frame = 0;
      const nextState: string = this.gameField.advanceState();
      if (nextState === "checkingPops") {
        console.log(nextState);
        this.refreshPuyoSprites();
        this.updateScoreDisplay();
        this.state = this.animatePops;
      } else if (nextState === "dropped") {
        console.log(nextState);
        this.refreshPuyoSprites();
        if (this.autoAdvance === true) {
          this.gameField.advanceState();
          this.updateScoreDisplay();
          this.state = this.animatePops;
        } else {
          this.state = this.idleState;
        }
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

      const duration: number = 40;
      for (let s = 0; s < Math.round(speed); s++) {
        if (this.gameField.hasPops) {
          // Animate Puyo and garbage pops
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
                  this.puyoDisplay[puyo.x][puyo.y].alpha = 1 - this.frame / duration / 1.2;
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
                      this.puyoDisplay[x][y].alpha = 1 - (this.frame / duration) * 0.8;
                    } else {
                      this.puyoDisplay[x][y].texture = this.puyoSprites["garbage_n.png"];
                      this.puyoDisplay[x][y].alpha =
                        (this.frame - duration * 0.8) / (duration - duration * 0.8);
                    }
                  }
                } else if (this.gameField.garbageClearCountMatrix[x][y] >= 2) {
                  if (
                    this.gameField.matrix[x][y].p === PuyoType.Garbage ||
                    this.gameField.matrix[x][y].p === PuyoType.Hard
                  ) {
                    this.puyoDisplay[x][y].alpha = 1 - this.frame / duration;
                  }
                }
              }
            }

            // Make the chain counter bounce
            if (this.frame < duration) {
              const t = this.frame - duration * 0.6;
              const r = (duration * 0.4) / 2; // time remaining
              this.chainCountDisplay.firstDigit.y =
                this.chainCountDisplay.defaultPos.y - 16 * ((-1 / r ** 2) * (t - r) ** 2 + 1);
              this.chainCountDisplay.secondDigit.y =
                this.chainCountDisplay.defaultPos.y - 16 * ((-1 / r ** 2) * (t - r) ** 2 + 1);
              this.chainCountDisplay.chainText.y =
                this.chainCountDisplay.defaultPos.y + 8 - 16 * ((-1 / r ** 2) * (t - r) ** 2 + 1);
            }
          }

          // Animate Garbage Tray
          const gAnimDuration = duration * 0.9 - duration * 0.6;
          const centerX =
            (this.garbageDisplayCoordinates[2] + this.garbageDisplayCoordinates[3]) / 2;
          if (this.frame >= duration * 0.6 && this.frame <= duration * 0.9) {
            this.calculateGarbageIcons();
            for (let g = 0; g < 6; g++) {
              const distance: number = this.garbageDisplayCoordinates[g] - centerX;
              const fraction: number =
                (this.frame - duration * 0.6) / (duration * 0.9 - duration * 0.6);
              this.garbageDisplay[g].x = centerX + distance * fraction;
            }
          }

          // Fallback in case the garbage icons go too far
          for (let g = 0; g < 3; g++) {
            if (this.garbageDisplay[g].x < this.garbageDisplayCoordinates[g]) {
              this.garbageDisplay[g].x = this.garbageDisplayCoordinates[g];
            }
          }

          for (let g = 3; g < 6; g++) {
            if (this.garbageDisplay[g].x > this.garbageDisplayCoordinates[g]) {
              this.garbageDisplay[g].x = this.garbageDisplayCoordinates[g];
            }
          }
        }
        this.frame += 1;
      }

      if (this.frame >= duration * 0.6) {
        this.showChainMultiplier();
        this.updateChainCounterDisplay();
      }

      if (this.frame >= duration * 1.2) {
        this.frame = 0;

        // Ensure garbage icons are updated
        const centerX = (this.garbageDisplayCoordinates[2] + this.garbageDisplayCoordinates[3]) / 2;
        this.calculateGarbageIcons();
        for (let g = 0; g < 6; g++) {
          const distance: number = this.garbageDisplayCoordinates[g] - centerX;
          this.garbageDisplay[g].x = centerX + distance;
        }

        this.gameField.advanceState(); // "checkingPops" -> "popped"
        // this.refreshPuyoSprites();

        const nextState: string = this.gameField.advanceState();
        if (nextState === "checkingDrops") {
          this.refreshPuyoSprites();
          this.updateScoreDisplay();
          this.state = this.animateFieldDrops;
        } else {
          this.refreshPuyoSprites();
          this.updateScoreDisplay();
          this.state = this.idleState;
        }
      }
    } else if (this.gameField.simState === "popped") {
      this.frame = 0;

      // Ensure garbage icons are updated
      const centerX = (this.garbageDisplayCoordinates[2] + this.garbageDisplayCoordinates[3]) / 2;
      this.calculateGarbageIcons();
      for (let g = 0; g < 6; g++) {
        const distance: number = this.garbageDisplayCoordinates[g] - centerX;
        this.garbageDisplay[g].x = centerX + distance;
      }

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

  private animateNextWindow(delta: number): void {
    const duration = 8;
    this.frame += 1;

    // this.nextCoord = [{ x: 478, y: 196 }, { x: 530, y: 328 }, { x: 530, y: 488 }];
    // Distances to move each pair
    const moveY = [
      this.nextCoord[1].y - this.nextCoord[0].y,
      this.nextCoord[1].y - this.nextCoord[0].y,
      this.nextCoord[2].y - this.nextCoord[1].y
    ];

    // First pair
    this.nextPuyoPairs[0][0].y =
      this.nextCoord[0].y +
      this.nextPuyoPairs[0][0].height -
      ((moveY[0] + 20) / duration) * this.frame;
    this.nextPuyoPairs[0][1].y = this.nextCoord[0].y - (moveY[0] / duration) * this.frame;

    // Second pair. 0.8 from sprite scaling in initNextPuyos()
    this.nextPuyoPairs[1][0].y =
      this.nextCoord[1].y +
      this.nextPuyoPairs[0][0].height * 0.8 -
      ((moveY[0] - (this.nextPuyoPairs[0][0].height - this.nextPuyoPairs[0][0].height * 0.8)) /
        duration) *
        this.frame;
    this.nextPuyoPairs[1][1].y = this.nextCoord[1].y - (moveY[1] / duration) * this.frame;
    this.nextPuyoPairs[1][0].scale.set(
      0.8 + (0.2 / duration) * this.frame,
      0.8 + (0.2 / duration) * this.frame
    );
    this.nextPuyoPairs[1][1].scale.set(
      0.8 + (0.2 / duration) * this.frame,
      0.8 + (0.2 / duration) * this.frame
    );
    this.nextPuyoPairs[1][0].x =
      this.nextCoord[1].x - ((this.nextCoord[1].x - this.nextCoord[0].x) / duration) * this.frame;
    this.nextPuyoPairs[1][1].x =
      this.nextCoord[1].x - ((this.nextCoord[1].x - this.nextCoord[0].x) / duration) * this.frame;

    // Third pair
    this.nextPuyoPairs[2][0].y =
      this.nextCoord[2].y + this.nextPuyoPairs[2][0].height - (moveY[2] / duration) * this.frame;
    this.nextPuyoPairs[2][1].y = this.nextCoord[2].y - (moveY[2] / duration) * this.frame;

    if (this.frame === 8) {
      this.state = this.idleState;
    }
  }

  private calculateGarbageIcons(): string[] {
    const garbageIcons: string[] = [
      "spacer_n",
      "spacer_n",
      "spacer_n",
      "spacer_n",
      "spacer_n",
      "spacer_n"
    ];

    const checkCrown = (g: number, i: number) => {
      // Second is the starting index for garbageIcons
      if (i < 6) {
        if (g - 720 >= 0) {
          garbageIcons.splice(i, 1, "crown");
          checkCrown(g - 720, i + 1);
        } else {
          checkMoon(g, i);
        }
      }
    };

    const checkMoon = (g: number, i: number) => {
      if (i < 6) {
        if (g - 360 >= 0) {
          garbageIcons.splice(i, 1, "moon");
          checkStar(g - 360, i + 1);
        } else {
          checkStar(g, i);
        }
      }
    };

    const checkStar = (g: number, i: number) => {
      if (i < 6) {
        if (g - 180 >= 0) {
          garbageIcons.splice(i, 1, "star");
          checkRock(g - 180, i + 1);
        } else {
          checkRock(g, i);
        }
      }
    };

    const checkRock = (g: number, i: number) => {
      if (i < 6) {
        if (g - 30 >= 0) {
          garbageIcons.splice(i, 1, "rock");
          checkRock(g - 30, i + 1);
        } else {
          checkLine(g, i);
        }
      }
    };

    const checkLine = (g: number, i: number) => {
      if (i < 6) {
        if (g - 6 >= 0) {
          garbageIcons.splice(i, 1, "line");
          checkLine(g - 6, i + 1);
        } else {
          checkUnit(g, i);
        }
      }
    };

    const checkUnit = (g: number, i: number) => {
      if (i < 6) {
        if (g - 1 >= 0) {
          garbageIcons.splice(i, 1, "unit");
          checkUnit(g - 1, i + 1);
        }
      }
    };

    checkCrown(this.gameField.totalGarbage, 0);

    for (let i = 0; i < 6; i++) {
      this.garbageDisplay[i].texture = this.puyoSprites[`${garbageIcons[i]}.png`];
    }

    return garbageIcons;
  }

  private refreshGarbageIcons(): void {
    const centerX = (this.garbageDisplayCoordinates[2] + this.garbageDisplayCoordinates[3]) / 2;

    for (let i = 0; i < 6; i++) {
      this.garbageDisplay[i].texture = this.puyoSprites["spacer_n.png"];
    }

    for (let g = 0; g < 6; g++) {
      const distance: number = this.garbageDisplayCoordinates[g] - centerX;
      this.garbageDisplay[g].x = centerX + distance;
    }
  }

  private updatePuyoPage(): void {
    for (let p = 0; p < this.editorToolDisplay.length; p++) {
      for (const row of this.editorToolDisplay[p]) {
        for (const item of row) {
          if (p === this.currentTool.page) {
            item.visible = true;
          } else {
            item.visible = false;
          }
        }
      }
    }

    if (this.currentTool.targetLayer === "main") {
      this.editorDisplay.layerName.texture = this.resources["/chainsim/img/layer_main.png"].texture;
    } else if (this.currentTool.targetLayer === "shadow") {
      this.editorDisplay.layerName.texture = this.resources["/chainsim/img/layer_shadow.png"].texture;
    }
  }

  private updateScoreDisplay(): void {
    let scoreText: string = this.gameField.totalScore.toString();

    const missingDigits: number = 8 - scoreText.length;

    for (let i = 0; i < missingDigits; i++) {
      scoreText = "0" + scoreText;
    }

    for (let i = 0; i < 8; i++) {
      this.scoreDisplay[i].visible = true;
      this.scoreDisplay[i].texture = this.scoreCountSprites[`score_${scoreText[i]}.png`];
    }
  }

  private showChainMultiplier(): void {
    let puyoMultiplierText: string = this.gameField.linkPuyoMultiplier.toString();
    let bonusMultiplierText: string = this.gameField.linkBonusMultiplier.toString();

    const missingDigits = {
      puyo: 3 - puyoMultiplierText.length,
      bonus: 3 - bonusMultiplierText.length
    };

    for (let i = 0; i < missingDigits.puyo; i++) {
      puyoMultiplierText = "X" + puyoMultiplierText;
    }

    for (let i = 0; i < missingDigits.bonus; i++) {
      bonusMultiplierText = "X" + bonusMultiplierText;
    }

    for (let i = 0; i < puyoMultiplierText.length; i++) {
      if (puyoMultiplierText[i] === "X") {
        this.scoreDisplay[i + 1].visible = false;
      } else {
        this.scoreDisplay[i + 1].visible = true;
        this.scoreDisplay[i + 1].texture = this.scoreCountSprites[
          `score_${puyoMultiplierText[i]}.png`
        ];
      }
    }

    for (let i = 0; i < bonusMultiplierText.length; i++) {
      if (bonusMultiplierText[i] === "X") {
        this.scoreDisplay[i + 5].visible = false;
      } else {
        this.scoreDisplay[i + 5].visible = true;
        this.scoreDisplay[i + 5].texture = this.scoreCountSprites[
          `score_${bonusMultiplierText[i]}.png`
        ];
      }
    }

    this.scoreDisplay[4].texture = this.scoreCountSprites["score_x.png"];
    this.scoreDisplay[0].visible = false;
  }

  private updateChainCounterDisplay(): void {
    const chainLengthText: string = this.gameField.chainLength.toString();

    if (chainLengthText === "0") {
      this.chainCountDisplay.firstDigit.visible = false;
      this.chainCountDisplay.secondDigit.visible = false;
      this.chainCountDisplay.chainText.visible = false;
    } else if (chainLengthText.length < 2) {
      this.chainCountDisplay.firstDigit.visible = false;
      this.chainCountDisplay.secondDigit.visible = true;
      this.chainCountDisplay.chainText.visible = true;

      this.chainCountDisplay.secondDigit.texture = this.chainCountSprites[
        `chain_${chainLengthText[0]}.png`
      ];
    } else {
      this.chainCountDisplay.firstDigit.visible = true;
      this.chainCountDisplay.secondDigit.visible = true;
      this.chainCountDisplay.chainText.visible = true;

      this.chainCountDisplay.firstDigit.texture = this.chainCountSprites[
        `chain_${chainLengthText[0]}.png`
      ];
      this.chainCountDisplay.secondDigit.texture = this.chainCountSprites[
        `chain_${chainLengthText[1]}.png`
      ];
    }
  }

  private calculateSurfaces(): void {
    // Calculate the surfaces all around each cell 
    const surfaces: Surface = {
      horizontal: [],
      vertical: []
    }
    
    for (const row of this.puyoDisplay) {
      for (const puyo of row) {
        const horizontalBound = {
          left: puyo.x - puyo.width,
          right: puyo.x + puyo.width
        }

        const verticalBound = {
          top: puyo.y - puyo.height,
          bottom: puyo.y + puyo.height
        }

        surfaces.horizontal.push(horizontalBound);
        surfaces.vertical.push(verticalBound);
      }
    }

    this.surfaces = surfaces;
  }
}
