import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
export class DiscordProvider {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1271111101227991060/IXZasRFdYP1cmg4KFM74AMtjdZuTa54zr0TRbzDUnbwhS_ATyXmcK-BGamo63EdMNYJN';
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
