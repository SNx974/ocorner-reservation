// Runs once when the Node.js server boots (Next.js instrumentation hook).
// Starts an in-process scheduler so the J-3 birthday reminders are sent
// automatically — no external cron required. Deduplication (SentEmail) makes
// repeated runs safe.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runBirthdayJm3Reminders } = await import("./lib/birthday-reminders");
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  const run = () =>
    runBirthdayJm3Reminders()
      .then(r => console.log("[jm3] birthday reminders:", r))
      .catch(e => console.error("[jm3] scheduler error", e));

  // First pass shortly after boot, then every 6h.
  setTimeout(run, 30_000);
  setInterval(run, SIX_HOURS);
}
