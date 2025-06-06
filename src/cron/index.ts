import cron from 'croner';
import { RandomColorRoleJob } from './jobs/random-color-role';
import { TemporaryBanJob } from './jobs/temporary-ban';

export function scheduleCronJobs(): void {
  [
    new RandomColorRoleJob(),
    new TemporaryBanJob(),
  ].forEach(job => {
    cron(job.interval, () => {
      job.execute();
    });
  });
}
