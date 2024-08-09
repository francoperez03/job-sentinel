export interface NotificationProvider {
  sendNotification(message: string): Promise<void>;
}