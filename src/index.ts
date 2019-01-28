import ChainsimEditor from "./ChainsimEditor";
import Field from "./Field";
import { transposeMatrix } from "./helper";

const testMatrix2 = new Field(
  transposeMatrix([
    ["0", "0", "0", "B", "0", "0"],
    ["0", "0", "0", "B", "0", "0"],
    ["0", "0", "0", "P", "B", "0"],
    ["0", "0", "0", "P", "B", "0"],
    ["0", "0", "R", "G", "B", "0"],
    ["0", "0", "0", "G", "P", "B"],
    ["B", "G", "0", "R", "G", "P"],
    ["Y", "R", "R", "B", "G", "B"],
    ["G", "G", "G", "Y", "G", "B"],
    ["Y", "Y", "Y", "P", "B", "Y"],
    ["B", "R", "G", "J", "Y", "Y"],
    ["B", "B", "R", "G", "P", "P"],
    ["R", "R", "G", "G", "J", "P"]
  ])
);

const displayInitial = document.getElementById("initial")!;
transposeMatrix(testMatrix2.inputMatrix).forEach(row => {
  displayInitial.innerHTML += row.toString() + "<br>";
});

const displaySimulation = document.getElementById("result")!;
transposeMatrix(testMatrix2.matrixText).forEach(row => {
  displaySimulation.innerHTML += row.toString() + "<br>";
});

const displayScore = document.getElementById("score")!;
displayScore.innerHTML = testMatrix2.totalScore.toString();

const displayLength = document.getElementById("length")!;
displayLength.innerHTML = testMatrix2.chainLength.toString();

const displayGarbage = document.getElementById("garbage")!;
displayGarbage.innerHTML = testMatrix2.totalGarbage.toString();

document.getElementById("open-puyonexus")!.addEventListener("click", () => {
  testMatrix2.sendToPuyoNexus();
});

document.getElementById("step")!.addEventListener("click", () => {
  testMatrix2.advanceState();

  displaySimulation.innerHTML = "";
  transposeMatrix(testMatrix2.matrixText).forEach(row => {
    displaySimulation.innerHTML += row.toString() + "<br>";
  });

  displayScore.innerHTML = testMatrix2.totalScore.toString();
  displayLength.innerHTML = testMatrix2.chainLength.toString();
  displayGarbage.innerHTML = testMatrix2.totalGarbage.toString();
});

document.getElementById("game-step")!.addEventListener("click", () => {
  console.log("Advance state");
  game.gameField.advanceState();
})

const gameContainer: HTMLElement = document.getElementById("game-container")!;
const game = new ChainsimEditor(gameContainer);

game.setNewField(
  transposeMatrix([
    ["0", "0", "0", "B", "0", "0"],
    ["0", "0", "0", "B", "0", "0"],
    ["0", "0", "0", "P", "B", "0"],
    ["0", "0", "0", "P", "B", "0"],
    ["0", "0", "R", "G", "B", "0"],
    ["0", "0", "0", "G", "P", "B"],
    ["B", "G", "0", "R", "G", "P"],
    ["Y", "R", "R", "B", "G", "B"],
    ["G", "G", "G", "Y", "G", "B"],
    ["Y", "Y", "Y", "P", "B", "Y"],
    ["B", "R", "G", "J", "Y", "Y"],
    ["B", "B", "R", "G", "P", "P"],
    ["R", "R", "G", "G", "J", "P"]
  ])
)

