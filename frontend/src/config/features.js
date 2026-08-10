/**
 * Features that depend on services this deployment does not have.
 *
 * FlowForge -- the "Build New Tool" action -- generates automation workflows
 * and deploys them to n8n, keeping its conversations in Supabase. Neither is
 * configured here, so every click has always come back with
 * "Database service unavailable" (HTTP 503). It was also the most prominent
 * control in the app: a bright green button on all ten unit pages plus the
 * header, and the most inviting thing to click.
 *
 * The code is untouched and still routed. Set this to true once SUPABASE_URL,
 * SUPABASE_SERVICE_KEY, N8N_BASE_URL and N8N_API_KEY are set on the backend,
 * and every entry point returns.
 */
export const FLOWFORGE_ENABLED = false;
