import { Injectable, Logger } from '@nestjs/common';
import { INotificationProvider, ReminderNotification } from './notification-provider.interface';

@Injectable()
export class MockNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(MockNotificationProvider.name);
  private sentReminders: ReminderNotification[] = [];

  async sendReminder(notification: ReminderNotification): Promise<void> {
    this.sentReminders.push(notification);
    this.logger.log(
      `[MockNotificationProvider] Reminder sent to ${notification.phone}: "${notification.message}"`,
    );
  }

  getSentReminders(): ReminderNotification[] {
    return [...this.sentReminders];
  }

  clear(): void {
    this.sentReminders = [];
  }
}
