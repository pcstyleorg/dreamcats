/// <reference types="vite/client" />
/**
 * Online room flow for the new-edition engine: create → join → start →
 * events, with per-viewer redaction enforced by the `get` query.
 */

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import type { EngineState } from "../engine";

const modules = import.meta.glob(["../*.ts", "../_generated/**/*.{ts,js}"]);

const setup = async () => {
  const t = convexTest(schema, modules);
  const { code } = await t.mutation(api.engineRooms.createRoom, {
    playerId: "p-ann",
    name: "Ann",
  });
  await t.mutation(api.engineRooms.joinRoom, {
    code,
    playerId: "p-ben",
    name: "Ben",
  });
  return { t, code };
};

const stateFor = async (
  t: Awaited<ReturnType<typeof setup>>["t"],
  code: string,
  playerId: string,
): Promise<EngineState> => {
  const room = await t.query(api.engineRooms.get, { code, playerId });
  return JSON.parse(room!.state!) as EngineState;
};

describe("engineRooms", () => {
  it("runs the lobby flow and starts a game", async () => {
    const { t, code } = await setup();
    expect(code).toMatch(/^[A-Z2-9]{4}$/);

    // non-host cannot start
    await expect(
      t.mutation(api.engineRooms.startGame, { code, playerId: "p-ben" }),
    ).rejects.toThrow(/host/);

    await t.mutation(api.engineRooms.startGame, { code, playerId: "p-ann" });
    const room = await t.query(api.engineRooms.get, {
      code,
      playerId: "p-ann",
    });
    expect(room!.status).toBe("playing");
    expect(room!.seat).toBe(0);
    const state = JSON.parse(room!.state!) as EngineState;
    expect(state.phase).toBe("peeking");
    expect(state.players.map((p) => p.name)).toEqual(["Ann", "Ben"]);
  });

  it("redacts card faces per viewer and never leaks the seed", async () => {
    const { t, code } = await setup();
    await t.mutation(api.engineRooms.startGame, { code, playerId: "p-ann" });

    // Ann peeks her slot 0 — only Ann sees that face.
    await t.mutation(api.engineRooms.sendEvent, {
      code,
      playerId: "p-ann",
      event: { type: "peek", player: 0, slot: 0 },
    });
    const forAnn = await stateFor(t, code, "p-ann");
    const forBen = await stateFor(t, code, "p-ben");
    expect(forAnn.seed).toBe(0);
    expect(forBen.seed).toBe(0);
    const annSlot0ForBen = forBen.players[0].dream[0].card;
    expect(annSlot0ForBen.value).toBe(0);
    expect(annSlot0ForBen.kind).toBe("number");
    // Ann's own view has a real card there (peeking reveal)
    expect(forAnn.players[0].dream[0].card.id).toBe(annSlot0ForBen.id);
    expect(forAnn.drawPile.every((c) => c.value === 0)).toBe(true);
    // spectators / non-members get no state at all
    const stranger = await t.query(api.engineRooms.get, {
      code,
      playerId: "p-nobody",
    });
    expect(stranger!.state).toBeNull();
  });

  it("rejects events from the wrong player via engine authorization", async () => {
    const { t, code } = await setup();
    await t.mutation(api.engineRooms.startGame, { code, playerId: "p-ann" });
    await expect(
      t.mutation(api.engineRooms.sendEvent, {
        code,
        playerId: "p-ben",
        event: { type: "peek", player: 0, slot: 0 },
      }),
    ).rejects.toThrow(/own dream/);
  });

  it("plays a turn end-to-end through mutations", async () => {
    const { t, code } = await setup();
    await t.mutation(api.engineRooms.startGame, { code, playerId: "p-ann" });
    for (const [playerId, seat] of [
      ["p-ann", 0],
      ["p-ben", 1],
    ] as const) {
      for (const slot of [0, 1]) {
        await t.mutation(api.engineRooms.sendEvent, {
          code,
          playerId,
          event: { type: "peek", player: seat, slot },
        });
      }
    }
    let s = await stateFor(t, code, "p-ann");
    expect(s.phase).toBe("awaitTurn");
    expect(s.currentPlayer).toBe(0);

    await t.mutation(api.engineRooms.sendEvent, {
      code,
      playerId: "p-ann",
      event: { type: "drawDeck" },
    });
    s = await stateFor(t, code, "p-ann");
    expect(s.phase).toBe("holdingDeck");
    expect(s.held).not.toBeNull();
    // Ben must not see Ann's held card
    const benView = await stateFor(t, code, "p-ben");
    expect(benView.held!.value).toBe(0);

    await t.mutation(api.engineRooms.sendEvent, {
      code,
      playerId: "p-ann",
      event: { type: "discardHeld" },
    });
    s = await stateFor(t, code, "p-ann");
    expect(s.currentPlayer).toBe(1);
  });

  it("full rooms and started games refuse joins", async () => {
    const { t, code } = await setup();
    await t.mutation(api.engineRooms.joinRoom, {
      code,
      playerId: "p-cid",
      name: "Cid",
    });
    await t.mutation(api.engineRooms.joinRoom, {
      code,
      playerId: "p-dee",
      name: "Dee",
    });
    await expect(
      t.mutation(api.engineRooms.joinRoom, {
        code,
        playerId: "p-eve",
        name: "Eve",
      }),
    ).rejects.toThrow(/full/);
    await t.mutation(api.engineRooms.startGame, { code, playerId: "p-ann" });
    await expect(
      t.mutation(api.engineRooms.joinRoom, {
        code,
        playerId: "p-eve",
        name: "Eve",
      }),
    ).rejects.toThrow(/started/);
  });
});
