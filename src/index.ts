import Chainsim from "./Chainsim"

const testMatrix = new Chainsim([
  ["B", "B", "B", "B", "Y", "Y", "Y", "Y", "G", "G", "G", "G", "G"],
  ["J", "J", "P", "P", "P", "P", "R", "R", "R", "R", "G", "G", "G"],
  ["B", "B", "B", "B", "Y", "Y", "Y", "Y", "G", "G", "G", "G", "G"],
  ["J", "J", "P", "P", "P", "P", "R", "R", "R", "R", "G", "G", "G"],
  ["B", "B", "B", "B", "Y", "Y", "Y", "Y", "G", "G", "G", "G", "G"],
  ["J", "J", "P", "P", "P", "P", "R", "R", "R", "R", "G", "G", "G"]
]);

testMatrix.simulateChain();
console.log(testMatrix.readableMatrix());

const outputResult = document.getElementById("result")!;
testMatrix.readableMatrix().forEach(row => {
  outputResult.innerHTML += row.toString() + "<br>";
})
