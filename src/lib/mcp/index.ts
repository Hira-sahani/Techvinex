import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfileTool from "./tools/get-my-profile";
import listMyNotificationsTool from "./tools/list-my-notifications";
import listExploreJobsTool from "./tools/list-explore-jobs";
import updateMyProfileTool from "./tools/update-my-profile";
import searchExploreJobsTool from "./tools/search-explore-jobs";
import getExploreJobTool from "./tools/get-explore-job";
import listMyApplicationsTool from "./tools/list-my-applications";
import listMyBookmarksTool from "./tools/list-my-bookmarks";
import bookmarkRoleTool from "./tools/bookmark-role";
import unbookmarkRoleTool from "./tools/unbookmark-role";
import markNotificationReadTool from "./tools/mark-notification-read";
import listBlogsTool from "./tools/list-blogs";
import getBlogTool from "./tools/get-blog";

// Build the OAuth issuer from the project ref (inlined at build time by Vite).
// Must be the direct supabase.co host, never the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "techvinex-mcp",
  title: "Techvinex",
  version: "0.2.0",
  instructions:
    "Techvinex tools. Every tool runs as the signed-in Techvinex user under RLS. " +
    "Profile: `get_my_profile`, `update_my_profile`. " +
    "Jobs: `list_explore_jobs`, `search_explore_jobs`, `get_explore_job`. " +
    "Applications: `list_my_applications` (read-only in Sprint 1 — submitting new applications is not exposed yet). " +
    "Bookmarks: `list_my_bookmarks`, `bookmark_role`, `unbookmark_role`. " +
    "Notifications: `list_my_notifications`, `mark_notification_read`. " +
    "Blog: `list_blogs`, `get_blog`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfileTool,
    updateMyProfileTool,
    listExploreJobsTool,
    searchExploreJobsTool,
    getExploreJobTool,
    listMyApplicationsTool,
    listMyBookmarksTool,
    bookmarkRoleTool,
    unbookmarkRoleTool,
    listMyNotificationsTool,
    markNotificationReadTool,
    listBlogsTool,
    getBlogTool,
  ],
});
