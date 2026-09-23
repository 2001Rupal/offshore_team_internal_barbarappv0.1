import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AppointmentReminder,
  AppointmentReminderDocument,
} from './schemas/appointment-reminder.schema';
import {
  NOTIFICATION_PROVIDER,
  INotificationProvider,
} from './providers/notification-provider.interface';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectModel(AppointmentReminder.name)
    private readonly reminderModel: Model<AppointmentReminderDocument>,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly notificationProvider: INotificationProvider,
  ) {}

  async schedule24HourReminder(appointment: {
    _id: Types.ObjectId | string;
    customerId: Types.ObjectId | string;
    customerPhoneSnapshot: string;
    bookingToken: string;
    serviceNameSnapshot: string;
    barberNameSnapshot: string;
    shopName: string;
    startAt: Date;
    timezone: string;
  }): Promise<AppointmentReminderDocument | null> {
    try {
      const appointmentId = new Types.ObjectId(appointment._id.toString());
      const customerId = new Types.ObjectId(appointment.customerId.toString());

      // Skip SMS reminder if customer has no phone number (e.g. registered via email without phone)
      if (!appointment.customerPhoneSnapshot || !appointment.customerPhoneSnapshot.trim()) {
        return null;
      }

      // Prevent duplicate reminders for the same appointment
      const existing = await this.reminderModel.findOne({
        appointmentId,
        type: '24_HOUR',
      });
      if (existing) {
        return existing;
      }

      // Calculate scheduled time: 24 hours prior to appointment start
      const scheduledFor = new Date(appointment.startAt.getTime() - 24 * 60 * 60 * 1000);

      // Format date/time in shop timezone
      const timeFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: appointment.timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      });
      const dateFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: appointment.timezone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      const formattedTime = timeFormatter.format(appointment.startAt);
      const formattedDate = dateFormatter.format(appointment.startAt);

      const message = `Reminder: Your ${appointment.serviceNameSnapshot} with ${appointment.barberNameSnapshot} at ${appointment.shopName} is on ${formattedDate} at ${formattedTime}. Token: ${appointment.bookingToken}.`;

      const reminder = new this.reminderModel({
        appointmentId,
        customerId,
        customerPhone: appointment.customerPhoneSnapshot,
        bookingToken: appointment.bookingToken,
        type: '24_HOUR',
        scheduledFor,
        status: 'SCHEDULED',
        message,
        attempts: 0,
      });

      await reminder.save();

      // If the appointment is within the next 24 hours (scheduledFor is in the past), dispatch immediately
      if (scheduledFor <= new Date()) {
        try {
          await this.notificationProvider.sendReminder({
            appointmentId: appointmentId.toString(),
            phone: appointment.customerPhoneSnapshot,
            message,
            type: '24_HOUR',
          });
          reminder.status = 'SENT';
          reminder.sentAt = new Date();
          reminder.attempts = 1;
          await reminder.save();
        } catch (sendErr: any) {
          this.logger.warn(`Failed to dispatch immediate reminder: ${sendErr?.message}`);
          reminder.status = 'FAILED';
          reminder.lastError = sendErr?.message;
          await reminder.save();
        }
      }

      return reminder;
    } catch (err: any) {
      // Notification scheduling failure must NOT fail appointment creation
      this.logger.error(`Error scheduling reminder: ${err?.message}`, err.stack);
      return null;
    }
  }

  async cancelRemindersForAppointment(appointmentId: string): Promise<void> {
    try {
      await this.reminderModel.updateMany(
        { appointmentId: new Types.ObjectId(appointmentId), status: 'SCHEDULED' },
        { $set: { status: 'CANCELLED' } },
      );
    } catch (err: any) {
      this.logger.warn(`Failed to cancel reminders for appointment ${appointmentId}: ${err?.message}`);
    }
  }
}
