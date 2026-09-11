export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_BACKGROUND_CRON !== 'false') {
      throw new Error('Production web server requires ENABLE_BACKGROUND_CRON=false; run scripts/cron-worker.ts separately');
    }

    const { initCronJobs } = await import('@/lib/cron/scheduler');
    initCronJobs();
  }
}
