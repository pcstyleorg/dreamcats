/**
 * Browserbase + Stagehand + Gemini Computer Use runner.
 * Minimal, repo-local equivalent of `npx create-browser-app --template gemini-cua`.
 */

import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

const requiredEnv = ["BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID", "GOOGLE_API_KEY"] as const;
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  console.error("Copy agents/browserbase-gemini/.env.example and fill values.");
  process.exit(1);
}

type PresetName = "online-basic" | "hotseat-basic";

const argList = process.argv.slice(2);
const getFlag = (name: string, def?: string) => {
  const pref = `--${name}=`;
  const hit = argList.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : def;
};

const presetName = (getFlag("preset") as PresetName | undefined) ?? (process.env.PRESET as PresetName | undefined);
const turns = Number(getFlag("turns", process.env.TURNS ?? "6")) || 6;
const appUrl = getFlag("url", process.env.APP_URL ?? "https://example.com");

const presets: Record<PresetName, string> = {
  "online-basic": `
Open ${appUrl} (set zoom 50%). Follow Sen rules:
- 54-card deck: values 0-8 (4 each), nine 9s, specials take_2/peek_1/swap_2.
- Specials only usable when drawn from DECK; if taken from DISCARD they act like a normal number card.
- Turn: A) DRAW-FROM-DISCARD = take top discard, must swap it into one of your 4 cards and discard the replaced card. B) DRAW-FROM-DECK = look at card, then either swap it into hand and discard replaced card, or discard it, or if it is special use its power immediately.
- Powers: take_2 draw two, keep one; peek_1 peek any one card; swap_2 swap any two cards without looking.
- POBUDKA: at start of a turn you may call to end round; reveal all, lowest total wins; caller gets +5 penalty if not lowest. Game to 100, lowest wins.

Test steps:
1) Click "Create room"; when the room code is shown, copy that exact code (do NOT invent). Name yourself "Agent Tester".
2) Start game, finish initial peek (select exactly 2 of your own cards).
3) Play ${turns} turns: at least one DRAW-FROM-DISCARD, at least one DRAW-FROM-DECK; if you draw a special from deck, use it.
4) Then call POBUDKA to end the round.
5) Confirm round-end scores render. Report the copied room code, actions taken, final scores, and any errors.
`,
  "hotseat-basic": `
Open ${appUrl} (set zoom 50%). Use same Sen rules as above (deck composition, specials deck-only, turn rules, POBUDKA penalty).

Test steps (local/hotseat):
1) Start a local/hotseat game with two players: "Tester A" and "Tester B".
2) Complete peeking (each peeks exactly 2 of their own cards).
3) Play ${turns} total turns alternating players: include at least one DRAW-FROM-DISCARD and one DRAW-FROM-DECK; use any special drawn from deck.
4) Call POBUDKA to end the round.
5) Verify round-end scores. Report actions, scores, and any errors.
`,
};

// Instruction precedence: explicit text > preset > env INSTRUCTION > fallback
const cliText = argList.find((a) => !a.startsWith("--"))?.trim();
const instruction =
  cliText && cliText.length > 0
    ? cliText
    : presetName
      ? presets[presetName]
      : process.env.INSTRUCTION ||
        presets["online-basic"];

async function main() {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      templateId: process.env.BROWSERBASE_TEMPLATE_ID,
      proxies: process.env.PROXIES === "true",
      region: process.env.BROWSERBASE_REGION ?? "us-west-2",
      browserSettings: {
        blockAds: true,
        viewport: { width: 1366, height: 768 },
      },
    },
  });

  try {
    await stagehand.init();
    console.log("Stagehand initialized");
    if (stagehand.browserbaseSessionId) {
      console.log(`Live session: https://browserbase.com/sessions/${stagehand.browserbaseSessionId}`);
    }

    const zoom = Number(process.env.ZOOM ?? 0.5);
    const applyZoom = async (p: any) => {
      await p.evaluate((z) => {
        document.body.style.zoom = String(z);
      }, zoom);
    };

    const page = stagehand.context.pages()[0];
    await page.goto("https://www.google.com", { waitUntil: "domcontentloaded" });
    await applyZoom(page);

    const agent = stagehand.agent({
      cua: true,
      model: {
        modelName: "google/gemini-2.5-computer-use-preview-10-2025",
        apiKey: process.env.GOOGLE_API_KEY!,
      },
      systemPrompt:
        "You are a focused web testing agent. Complete the instruction autonomously. Avoid sign-ups; prefer public pages. Return a concise result.",
    });

    console.log("Instruction:", instruction);
    const result = await agent.execute({
      instruction,
      maxSteps: 40,
      highlightCursor: true,
      onStep: async ({ page: stepPage }) => {
        // Re-apply zoom if agent opens a new page
        await applyZoom(stepPage);
      },
    });

    console.log("Success:", result.success);
    console.log("Result:", result);
  } catch (err) {
    console.error("Agent run failed:", err);
  } finally {
    await stagehand.close();
  }
}

main();
