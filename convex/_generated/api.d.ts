/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as cleanup from "../cleanup.js";
import type * as crons from "../crons.js";
import type * as engine_deck from "../engine/deck.js";
import type * as engine_index from "../engine/index.js";
import type * as engine_redact from "../engine/redact.js";
import type * as engine_reducer from "../engine/reducer.js";
import type * as engine_rotate from "../engine/rotate.js";
import type * as engine_scoring from "../engine/scoring.js";
import type * as engine_types from "../engine/types.js";
import type * as engineRooms from "../engineRooms.js";
import type * as game_core from "../game_core.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as presence from "../presence.js";
import type * as rooms from "../rooms.js";
import type * as stats from "../stats.js";
import type * as types from "../types.js";
import type * as userPreferences from "../userPreferences.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  auth: typeof auth;
  chat: typeof chat;
  cleanup: typeof cleanup;
  crons: typeof crons;
  "engine/deck": typeof engine_deck;
  "engine/index": typeof engine_index;
  "engine/redact": typeof engine_redact;
  "engine/reducer": typeof engine_reducer;
  "engine/rotate": typeof engine_rotate;
  "engine/scoring": typeof engine_scoring;
  "engine/types": typeof engine_types;
  engineRooms: typeof engineRooms;
  game_core: typeof game_core;
  games: typeof games;
  http: typeof http;
  presence: typeof presence;
  rooms: typeof rooms;
  stats: typeof stats;
  types: typeof types;
  userPreferences: typeof userPreferences;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
