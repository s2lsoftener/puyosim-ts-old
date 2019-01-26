import Chainsim from "./Chainsim";
import { transposeMatrix } from "./helper";

const testMatrix = new Chainsim([
  ["B", "B", "B", "B", "Y", "Y", "Y", "Y", "G", "G", "G", "G", "G"],
  ["J", "J", "P", "P", "P", "P", "R", "R", "R", "R", "G", "G", "G"],
  ["B", "B", "B", "B", "Y", "Y", "Y", "Y", "G", "G", "G", "G", "G"],
  ["J", "J", "P", "P", "P", "P", "R", "R", "R", "R", "G", "G", "G"],
  ["B", "B", "B", "B", "Y", "Y", "Y", "Y", "G", "G", "G", "G", "G"],
  ["J", "J", "P", "P", "P", "P", "R", "R", "R", "R", "G", "G", "G"]
]);

const testMatrix2 = new Chainsim(
  transposeMatrix([
    ["0", "0", "0", "B", "0", "0"],
    ["0", "0", "0", "B", "0", "0"],
    ["0", "0", "0", "P", "B", "0"],
    ["0", "0", "0", "P", "B", "0"],
    ["0", "0", "0", "G", "B", "0"],
    ["0", "0", "0", "G", "P", "B"],
    ["B", "G", "R", "R", "G", "P"],
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
testMatrix2.sendToPuyoNexus();
testMatrix2.simulateChain();
console.log(testMatrix2.hasPops);
console.log(testMatrix2.poppingGroups);

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

testMatrix2.sendToPuyoNexus();
