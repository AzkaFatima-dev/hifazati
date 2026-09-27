import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = process.argv[2] || "http://localhost:3100";
const contrastOnly = process.argv.includes("--contrast-only");
await mkdir("qa-artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const findings = [], errors = [];
let checks = 0;
function check(name, condition) { assert(condition, name); checks++; console.log(`PASS ${name}`); }
try {
  for (const [label, width, height] of contrastOnly ? [["desktop",1440,1000]] : [["desktop",1440,1000],["mobile",390,844],["small-mobile",320,740]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push({ label, message: error.message }));
    for (const [name, path] of contrastOnly ? [["dashboard","/dashboard"],["report","/dashboard?view=report"]] : [["home","/"],["dashboard","/dashboard"],["report","/dashboard?view=report"],["search","/dashboard?view=search"],["profile","/dashboard?view=profile"]]) {
      const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 60000 });
      check(`${label} ${name} loads`, response?.ok());
      check(`${label} ${name} has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      check(`${label} ${name} has one main heading`, await page.locator("h1").count() === 1);
      const scan = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
      for (const violation of scan.violations) findings.push({ label, page: name, rule: violation.id, impact: violation.impact, nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) });
      if (name === "home") {
        for (const img of await page.locator("main img").all()) {
          await img.scrollIntoViewIfNeeded();
          await img.evaluate((element) => element.decode());
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        check(`${label} homepage images load`, await page.locator("main img").evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 0)));
        check(`${label} login button is available`, await page.getByRole("button", { name: "Log in", exact: true }).isVisible());
        check(`${label} registration button is available`, await page.getByRole("button", { name: /Register/ }).isVisible());
        await page.screenshot({ path: `qa-artifacts/home-${label}.png`, fullPage: true });
      }
      if (name === "report") {
        check(`${label} required fields use native validation`, await page.locator('[name="driverName"]').getAttribute("required") !== null && await page.locator('[name="driverContact"]').getAttribute("required") !== null && await page.locator('[name="details"]').getAttribute("required") !== null && await page.locator('[name="evidence"]').getAttribute("required") !== null);
        check(`${label} date and driver photo remain optional`, await page.locator('[name="month"]').getAttribute("required") === null && await page.locator('[name="driverPhoto"]').getAttribute("required") === null);
        await page.locator('[name="provider"]').selectOption("Other");
        check(`${label} other ride description is mandatory`, await page.locator('[name="providerOther"]').isVisible() && await page.locator('[name="providerOther"]').getAttribute("required") !== null);
        check(`${label} empty form cannot submit`, await page.locator("form").evaluate((form) => !form.checkValidity()));
        await page.screenshot({ path: `qa-artifacts/report-${label}.png`, fullPage: true });
      }
      if (name === "search") check(`${label} signed-out search shows login gate`, await page.getByRole("heading", { name: "Log in to check a driver" }).isVisible());
      if (name === "profile") check(`${label} signed-out profile allows private receipts`, await page.getByLabel("Private receipt", { exact: true }).isVisible());
    }
    if (!contrastOnly) {
    await page.getByRole("button", { name: "Check a driver", exact: true }).click();
    await page.waitForURL("**/dashboard?view=search");
    await page.reload({ waitUntil: "networkidle" });
    check(`${label} refresh preserves selected dashboard section`, await page.getByRole("heading", { name: "Check before you ride." }).isVisible());
    await page.goBack({ waitUntil: "networkidle" });
    console.log(`${label} browser Back selected view:`, new URL(page.url()).searchParams.get("view"));
    await page.getByRole("heading", { name: "My reports." }).waitFor({ state: "visible", timeout: 15000 });
    check(`${label} browser Back returns to previous dashboard section`, new URL(page.url()).searchParams.get("view") === "profile");
    }
    await context.close();
  }
  await writeFile("qa-artifacts/browser-results.json", JSON.stringify({ checks, errors, findings }, null, 2));
  console.log(JSON.stringify({ checks, runtimeErrors: errors, accessibility: findings.map((item) => ({ viewport: item.label, page: item.page, rule: item.rule, affectedElements: item.nodes.length })) }, null, 2));
  if (errors.length || findings.length) process.exitCode = 1;
} finally {
  await writeFile("qa-artifacts/browser-results.json", JSON.stringify({ checks, errors, findings }, null, 2));
  await browser.close();
}
