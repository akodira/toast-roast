// Custom Next.js server — used as the Node.js Tools for Visual Studio
// debug entry point (see ToastRoast.njsproj's <StartupFile>).
// Equivalent to `next dev` / `next start`, just as a plain .js file so
// Visual Studio's Node debugger has something to launch and attach to.
//
// You can still use `npm run dev` / `npm start` from the terminal or the
// Solution Explorer "npm" node — this file is only needed for F5 in VS.
const { createServer } = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`> Toast & Roast ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
  });
});
