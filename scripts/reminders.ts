import { disconnectFromDatabase, dispatchDueReminders } from '@pathshala/db';
import { loadLocalEnv } from './env';

/** Drain every due in-app reminder; suitable for a cron job. */
async function main(): Promise<void> {
  loadLocalEnv();
  const result = await dispatchDueReminders();
  console.log(`Reminders: ${result.sent} delivered in-app, ${result.emailAttempted} emailed.`);
  await disconnectFromDatabase();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
