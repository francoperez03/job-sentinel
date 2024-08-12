import { DiscordProvider } from "./discord.provider";
import { JobProvider } from "./jobs.provider";
import { NetworkProvider } from "./networks.provider";


export default async () => {
  const networkProvider = new NetworkProvider();
  const jobProvider = new JobProvider();
  const notificationProvider = new DiscordProvider();
  console.log("Providers loaded! 🚀");
  return { networkProvider, jobProvider, notificationProvider}
};