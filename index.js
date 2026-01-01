const fs = require("fs");
const path = require("path");

const distEntry = path.join(__dirname, "dist", "index.js");

if (fs.existsSync(distEntry)) {
  require(distEntry);
} else {
  try {
    require("ts-node/register");
    require(path.join(__dirname, "src", "index.ts"));
  } catch (err) {
    console.error(
      "No se encontró `dist/index.js`. Ejecuta `npm run build` o instala dependencias de desarrollo para ejecutar TypeScript.",
      err
    );
    process.exit(1);
  }
}
