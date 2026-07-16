import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfileTool from "./tools/get-my-profile";
import listMyNotificationsTool from "./tools/list-my-notifications";
import listExploreJobsTool from "./tools/list-explore-jobs";

// Build the OAuth issuer from the project ref (inlined at build time by Vite).
// Must be the direct supabase.co host, never the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "techvinex-mcp",
  title: "Techvinex",
  version: "0.1.0",
  instructions:
    "Techvinex tools. Every tool runs as the signed-in Techvinex user under RLS. " +
    "Use `get_my_profile` to read the current user's profile, " +
    "`list_my_notifications` to read their notifications, " +
    "and `list_explore_jobs` to browse published job listings.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfileTool, listMyNotificationsTool, listExploreJobsTool],
});
