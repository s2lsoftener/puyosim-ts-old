import ChainsimEditor from "./ChainsimEditor";
import Field from "./Field";
import { transposeMatrix } from "./helper";

const gameContainer: HTMLElement = document.getElementById("game-container")!;
const game = new ChainsimEditor(gameContainer);

game.app.view.style.height = `${window.innerHeight * 0.99}px`;
game.app.view.style.width = `${window.innerHeight * 0.99 * 0.63}px`;

function resize() {
  game.app.view.style.height = `${window.innerHeight * 0.99}px`;
  game.app.view.style.width = `${window.innerHeight * 0.99 * 0.63}px`;
}

window.onresize = resize;

game.setNewField(
  transposeMatrix([
    ["G", "B", "Y", "0", "0", "P"],
    ["R", "R", "R", "B", "P", "B"],
    ["B", "B", "R", "B", "B", "P"],
    ["B", "G", "G", "Y", "P", "B"],
    ["G", "Y", "Y", "B", "P", "B"],
    ["R", "R", "B", "P", "Y", "B"],
    ["G", "B", "P", "Y", "P", "P"],
    ["R", "R", "B", "P", "Y", "P"],
    ["G", "R", "B", "P", "Y", "B"],
    ["G", "B", "G", "Y", "R", "B"],
    ["G", "R", "B", "G", "Y", "R"],
    ["R", "B", "G", "Y", "R", "B"],
    ["R", "B", "G", "Y", "R", "B"]
  ])
);

// game.setNewField(
//   transposeMatrix([
//     ["0", "0", "0", "B", "0", "0"],
//     ["0", "0", "0", "B", "0", "0"],
//     ["0", "0", "0", "P", "B", "0"],
//     ["0", "0", "0", "P", "B", "0"],
//     ["0", "0", "0", "G", "B", "0"],
//     ["0", "H", "R", "G", "P", "B"],
//     ["B", "G", "0", "R", "G", "P"],
//     ["Y", "R", "R", "B", "G", "B"],
//     ["G", "G", "G", "Y", "G", "B"],
//     ["Y", "Y", "Y", "P", "B", "Y"],
//     ["B", "R", "G", "J", "Y", "Y"],
//     ["B", "B", "R", "G", "P", "P"],
//     ["R", "R", "G", "G", "J", "P"]
//   ])
// );

// game.setNewField(
//   transposeMatrix([
//     ["0", "0", "0", "B", "0", "0"],
//     ["0", "0", "0", "0", "0", "0"],
//     ["0", "0", "0", "0", "0", "0"],
//     ["0", "0", "0", "0", "B", "0"],
//     ["0", "0", "0", "0", "0", "0"],
//     ["0", "0", "0", "0", "0", "B"],
//     ["0", "0", "0", "0", "0", "0"],
//     ["0", "0", "B", "0", "0", "0"],
//     ["0", "0", "0", "0", "0", "G"],
//     ["0", "0", "0", "0", "0", "0"],
//     ["0", "B", "0", "0", "0", "0"],
//     ["B", "0", "0", "0", "0", "R"],
//     ["0", "0", "0", "0", "0", "0"]
//   ])
// );


// setTimeout(() => {
//   game.calculateSurface();
// }, 5000)