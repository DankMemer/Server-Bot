import cron from 'croner';
import { BirthdayRoleJob } from './jobs/birthday-role';
import { RandomColorRoleJob } from './jobs/random-color-role';
import { TemporaryBanJob } from './jobs/temporary-ban';

export function scheduleCronJobs(): void {
  [
    new RandomColorRoleJob(),
    new TemporaryBanJob(),
    new BirthdayRoleJob(),
  ].forEach(job => {
    cron(job.interval, () => {
      job.execute();
    });
  });
}
