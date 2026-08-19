/**
 * Online rooms for the new-edition engine.
 *
 * One document per room. The full EngineState is stored as JSON and every
 * event goes through the pure engine reducer (`applyEvent`) with the sender's
 * seat index as the actor — the server is the single source of truth and the
 * only place that ever sees unredacted card faces.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  EngineError,
  EngineState,
  GameEvent,
  applyEvent,
  createGame,
  redactState,
} from "./engine";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

const randomCode = (): string =>
  Array.from(
    { length: 4 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");

const getRoom = async (ctx: MutationCtx, code: string) => {
  const room = await ctx.db
    .query("engineRooms")
    .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
    .unique();
  if (!room) throw new ConvexError("Room not found");
  return room;
};

export const createRoom = mutation({
  args: { playerId: v.string(), name: v.string() },
  handler: async (ctx, { playerId, name }) => {
    let code = randomCode();
    // Regenerate on the (unlikely) collision.
    while (
      await ctx.db
        .query("engineRooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique()
    ) {
      code = randomCode();
    }
    const now = Date.now();
    await ctx.db.insert("engineRooms", {
      code,
      hostId: playerId,
      status: "lobby",
      players: [{ playerId, name: name.trim() || "Player" }],
      createdAt: now,
      updatedAt: now,
    });
    return { code };
  },
});

export const joinRoom = mutation({
  args: { code: v.string(), playerId: v.string(), name: v.string() },
  handler: async (ctx, { code, playerId, name }) => {
    const room = await getRoom(ctx, code);
    if (room.players.some((p) => p.playerId === playerId)) {
      return { code: room.code }; // rejoin
    }
    if (room.status !== "lobby") throw new ConvexError("Game already started");
    if (room.players.length >= MAX_PLAYERS) throw new ConvexError("Room is full");
    await ctx.db.patch(room._id, {
      players: [...room.players, { playerId, name: name.trim() || "Player" }],
      updatedAt: Date.now(),
    });
    return { code: room.code };
  },
});

export const leaveRoom = mutation({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, { code, playerId }) => {
    const room = await getRoom(ctx, code);
    if (room.status !== "lobby") return; // seats are fixed once playing
    const players = room.players.filter((p) => p.playerId !== playerId);
    if (players.length === 0) {
      await ctx.db.delete(room._id);
    } else {
      await ctx.db.patch(room._id, {
        players,
        hostId: room.hostId === playerId ? players[0].playerId : room.hostId,
        updatedAt: Date.now(),
      });
    }
  },
});

export const startGame = mutation({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, { code, playerId }) => {
    const room = await getRoom(ctx, code);
    if (room.hostId !== playerId) throw new ConvexError("Only the host can start");
    if (room.status !== "lobby") {
      // Allow "play again" once the current game is finished.
      const current = room.state
        ? (JSON.parse(room.state) as EngineState)
        : null;
      if (current && current.phase !== "gameOver") {
        throw new ConvexError("Game already started");
      }
    }
    if (room.players.length < MIN_PLAYERS) {
      throw new ConvexError("Need at least 2 players");
    }
    const seed = (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
    const state = createGame(
      room.players.map((p) => ({ id: p.playerId, name: p.name })),
      seed,
      { targetScore: 100 },
    );
    await ctx.db.patch(room._id, {
      status: "playing",
      state: JSON.stringify(state),
      updatedAt: Date.now(),
    });
  },
});

export const sendEvent = mutation({
  args: { code: v.string(), playerId: v.string(), event: v.any() },
  handler: async (ctx, { code, playerId, event }) => {
    const room = await getRoom(ctx, code);
    if (room.status !== "playing" || !room.state) {
      throw new ConvexError("Game has not started");
    }
    const actor = room.players.findIndex((p) => p.playerId === playerId);
    if (actor === -1) throw new ConvexError("You are not in this room");
    const state = JSON.parse(room.state) as EngineState;
    let next: EngineState;
    try {
      next = applyEvent(state, event as GameEvent, actor);
    } catch (error) {
      if (error instanceof EngineError) throw new ConvexError(error.message);
      throw error;
    }
    await ctx.db.patch(room._id, {
      state: JSON.stringify(next),
      updatedAt: Date.now(),
    });
  },
});

export const get = query({
  args: { code: v.string(), playerId: v.string() },
  handler: async (ctx, { code, playerId }) => {
    const room = await ctx.db
      .query("engineRooms")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!room) return null;
    const seat = room.players.findIndex((p) => p.playerId === playerId);
    const base = {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      players: room.players.map((p) => ({ name: p.name })),
      seat,
    };
    // Card data only flows to seated players, redacted for their seat.
    if (room.status !== "playing" || !room.state || seat === -1) {
      return { ...base, state: null };
    }
    const state = JSON.parse(room.state) as EngineState;
    return { ...base, state: JSON.stringify(redactState(state, seat)) };
  },
});
