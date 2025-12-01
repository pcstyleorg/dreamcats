# Browserbase + Stagehand + Gemini Computer Use Agent

This mirrors the official Browserbase “Gemini CUA” template without pulling the whole scaffold. It opens a Browserbase cloud browser, hands control to Stagehand’s agent with Gemini 2.5 Computer Use, and executes a natural-language instruction end‑to‑end.

## Setup
1) Copy env template: `cp .env.example .env`  
2) Fill:
   - `BROWSERBASE_API_KEY` – from Browserbase dashboard  
   - `BROWSERBASE_PROJECT_ID` – project that can create sessions  
   - optional `BROWSERBASE_TEMPLATE_ID` – if you saved a base config in Browserbase  
   - `GOOGLE_API_KEY` – Gemini key with computer‑use access  
3) Install deps (uses bun in this repo):  
   ```bash
   cd agents/browserbase-gemini
   bun install
   ```

## Run
```bash
cd agents/browserbase-gemini
GOOGLE_API_KEY=... BROWSERBASE_API_KEY=... BROWSERBASE_PROJECT_ID=... bun run index.ts
```
On start it prints a live Browserbase session link.

## Tweaks
- Edit `instruction` in `index.ts` to change the autonomous task.
- Adjust `maxSteps`, viewport, or enable/disable proxies in `browserbaseSessionCreateParams`.
- Set `verbose: 0` to avoid leaking sensitive data in logs.

## References
- Browserbase Gemini CUA template: https://www.browserbase.com/templates/gemini-cua  
- Stagehand docs: https://docs.stagehand.dev  
- Gemini computer-use: https://ai.google.dev/gemini-api/docs/computer-use  
