import * as PIXI from "pixi.js";
import Field from "./Field";

interface GameSettings {
  width: number;
  height: number;
}

export default class ChainsimEditor {
  // Settings
  public gameSettings: GameSettings;

  // HTML Display
  public renderer: PIXI.WebGLRenderer;

  // Game objects
  public stage: PIXI.Container;

  constructor(targetDiv: HTMLElement) {
    this.gameSettings = {
      width: 608,
      height: 974
    };

    this.renderer = new PIXI.WebGLRenderer(
      this.gameSettings.width,
      this.gameSettings.height,
      {
        antialias: true,
        transparent: true,
        resolution: 1
      }
    );

    // Create renderer and append to HTML
    this.renderer.view.style.width = `${this.gameSettings.width}px`;
    this.renderer.view.style.height = `${this.gameSettings.height}px`;
    targetDiv.appendChild(this.renderer.view);

    // Create game objects
    this.stage = new PIXI.Container();
  }
}
