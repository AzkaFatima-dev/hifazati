import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
const supplied = parseEnv(readFileSync(process.argv[2] || ".env.qa.local", "utf8"));
const local = parseEnv(readFileSync(".env.local", "utf8"));
if (!supplied.CLERK_SECRET_KEY && supplied.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === local.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) supplied.CLERK_SECRET_KEY = local.CLERK_SECRET_KEY;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3100"], { env: { ...process.env, ...supplied, VERCEL: "" }, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
