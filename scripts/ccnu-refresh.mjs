const token = process.env.CRON_SECRET;
if (!token) throw new Error("CRON_SECRET is required");
const base = process.env.CRON_BASE_URL || "http://127.0.0.1:3000";
const response = await fetch(new URL("/api/cron/ccnu-refresh", base), {
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(10 * 60 * 1000)
});
if (!response.ok) throw new Error(`CCNU refresh failed: HTTP ${response.status}`);
const result = await response.json();
console.log(`CCNU refresh: ${result.refreshed} updated, ${result.needsAuthorization.length} require renewed authorization`);
