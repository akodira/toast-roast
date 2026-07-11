# Opening in Visual Studio

The project includes `ToastRoast.sln` — double-click it (or File → Open → Project/Solution) to load it in Visual Studio with a normal Solution Explorer tree.

## Requirements

Visual Studio needs the **Node.js development** workload installed:

- Open **Visual Studio Installer** → Modify your VS install → check **Node.js development** → Modify.
- (Visual Studio 2017/2019 without that workload: install the [Node.js Tools for Visual Studio (NTVS)](https://marketplace.visualstudio.com/items?itemName=VisualStudioExptTeam.NodejsToolsforVisualStudio2017) extension instead.)

You still need **Node.js** itself installed separately (https://nodejs.org, LTS) — Visual Studio calls out to it, it doesn't bundle it.

## First run

1. Open `ToastRoast.sln`.
2. In Solution Explorer, expand the project → right-click **npm** → **Install npm Packages** (or just run `npm install` in a terminal in the project folder).
3. Copy `.env.example` to `.env.local` and fill in your Supabase `DATABASE_URL` and a `JWT_SECRET`.
4. Press **F5** (or **Debug → Start Debugging**). This launches `server.js` under the Node debugger — set breakpoints anywhere in `app/`, `lib/`, or `server.js` and they'll hit normally.
   - This runs in **dev mode** (hot reload). For a production-style run instead, right-click `package.json` in Solution Explorer → **Open npm Script Runner** → run `build`, then `start`.

## Notes

- `ToastRoast.njsproj` uses `ProjectView = ShowAllFiles`, so every file on disk shows up in Solution Explorer automatically — you don't need to add files to the project one by one.
- `server.js` exists specifically so Visual Studio's debugger has a plain `.js` entry point to launch (Next.js normally starts via the `next` CLI, which VS can't attach a debugger to directly). Running via `npm run dev` / `npm start` from a terminal works exactly the same — `server.js` is only needed for the F5 experience inside VS.
- IntelliSense for JSX/React works out of the box; no TypeScript conversion needed.
