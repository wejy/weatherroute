export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { startCronJobs } = await import("@/server/jobs/cron");
  startCronJobs();
}
