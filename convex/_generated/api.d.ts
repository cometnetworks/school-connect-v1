/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent_admissions from "../agent/admissions.js";
import type * as agent_notifier from "../agent/notifier.js";
import type * as agent_prompts from "../agent/prompts.js";
import type * as announcements from "../announcements.js";
import type * as betaApplications from "../betaApplications.js";
import type * as conversations from "../conversations.js";
import type * as director from "../director.js";
import type * as external_agentmail from "../external/agentmail.js";
import type * as external_calcom from "../external/calcom.js";
import type * as external_kapso from "../external/kapso.js";
import type * as http from "../http.js";
import type * as parentLookup from "../parentLookup.js";
import type * as portal from "../portal.js";
import type * as schools from "../schools.js";
import type * as seed from "../seed.js";
import type * as webhooks_calcom from "../webhooks/calcom.js";
import type * as webhooks_kapso from "../webhooks/kapso.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agent/admissions": typeof agent_admissions;
  "agent/notifier": typeof agent_notifier;
  "agent/prompts": typeof agent_prompts;
  announcements: typeof announcements;
  betaApplications: typeof betaApplications;
  conversations: typeof conversations;
  director: typeof director;
  "external/agentmail": typeof external_agentmail;
  "external/calcom": typeof external_calcom;
  "external/kapso": typeof external_kapso;
  http: typeof http;
  parentLookup: typeof parentLookup;
  portal: typeof portal;
  schools: typeof schools;
  seed: typeof seed;
  "webhooks/calcom": typeof webhooks_calcom;
  "webhooks/kapso": typeof webhooks_kapso;
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
