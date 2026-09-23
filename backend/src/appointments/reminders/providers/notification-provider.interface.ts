export interface ReminderNotification {
  appointmentId: string;
  phone: string;
  message: string;
  type: string;
}

export interface INotificationProvider {
  sendReminder(notification: ReminderNotification): Promise<void>;
  getSentReminders(): ReminderNotification[];
}

export const NOTIFICATION_PROVIDER = 'NOTIFICATION_PROVIDER';
