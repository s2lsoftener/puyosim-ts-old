import ChainsimEditor from "./ChainsimEditor";

fetch("/json/chain5.json")
  .then(response => response.json())
  .then(json => {
    const gameContainer: HTMLElement = document.getElementById("game-container")!;
    const game = new ChainsimEditor(gameContainer, undefined, json);

    game.app.view.style.height = `${window.innerHeight * 0.99}px`;
    game.app.view.style.width = `${window.innerHeight * 0.99 * 0.63}px`;

    function resize() {
      game.app.view.style.height = `${window.innerHeight * 0.99}px`;
      game.app.view.style.width = `${window.innerHeight * 0.99 * 0.63}px`;
    }

    window.onresize = resize;
  });
