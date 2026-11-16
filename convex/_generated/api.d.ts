/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as catalog from "../catalog.js";
import type * as couriers_index from "../couriers/index.js";
import type * as couriers_placeholder from "../couriers/placeholder.js";
import type * as couriers_push from "../couriers/push.js";
import type * as couriers_types from "../couriers/types.js";
import type * as http from "../http.js";
import type * as lib from "../lib.js";
import type * as orders from "../orders.js";
import type * as profiles from "../profiles.js";
import type * as rules from "../rules.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  catalog: typeof catalog;
  "couriers/index": typeof couriers_index;
  "couriers/placeholder": typeof couriers_placeholder;
  "couriers/push": typeof couriers_push;
  "couriers/types": typeof couriers_types;
  http: typeof http;
  lib: typeof lib;
  orders: typeof orders;
  profiles: typeof profiles;
  rules: typeof rules;
  seed: typeof seed;
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
