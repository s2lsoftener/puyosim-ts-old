import ChainsimEditor from "./ChainsimEditor";

const gameContainer: HTMLElement = document.getElementById("game-container")!;
const game = new ChainsimEditor(gameContainer);

game.app.view.style.height = `${window.innerHeight * 0.99}px`;
game.app.view.style.width = `${window.innerHeight * 0.99 * 0.63}px`;

function resize() {
  game.app.view.style.height = `${window.innerHeight * 0.99}px`;
  game.app.view.style.width = `${window.innerHeight * 0.99 * 0.63}px`;
}

window.onresize = resize;
