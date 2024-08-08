import axios from 'axios';
export class DiscordProvider {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'default';
  }

  public async sendNotification(message: string): Promise<void> {
    try {
      await axios.post(this.webhookUrl, {
        content: message
      });
      console.log('Notificación sent:', {message});
    } catch (error) {
      console.error('Error sending notificacion', (error as Error).message);
    }
  }
}
