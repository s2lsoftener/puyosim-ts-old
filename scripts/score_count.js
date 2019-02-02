const frames = {};

for (let i = 0; i < 5; i++) {
  let name = `score_${i}.png`;
  frames[name] = {
    frame: { x: i * 56 + 4, y: 0, w: 48, h: 64 },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: 48, h: 64 },
    sourceSize: { w: 48, h: 64 },
    pivot: { x: 0.5, y: 0.5 }
  };
}

for (let i = 0; i < 5; i++) {
  let name = `score_${i + 5}.png`;
  frames[name] = {
    frame: { x: i * 56 + 4, y: 67, w: 48, h: 64 },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: 48, h: 64 },
    sourceSize: { w: 48, h: 64 },
    pivot: { x: 0.5, y: 0.5 }
  };
}

frames["score_x.png"] = {
  frame: { x: 56, y: 440, w: 48, h: 64 },
  rotated: false,
  trimmed: false,
  spriteSourceSize: { x: 0, y: 0, w: 48, h: 64 },
  sourceSize: { w: 48, h: 64 },
  pivot: { x: 0.5, y: 0.5 }
};

const meta = {
  app: "http://www.puyonexus.com",
  version: "1.0",
  image: "num_font_d4444.png",
  format: "RGBA8888",
  size: { w: 512, h: 512 },
  scale: "1"
};

const result = {
  frames,
  meta
};

const resultJSON = JSON.stringify(result, null, 2);

const fs = require("fs");
fs.writeFile("scripts/scoreFont.json", resultJSON, "utf8", () => {
  console.log("Successful");
});
