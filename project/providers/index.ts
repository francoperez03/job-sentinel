import { Container } from "typedi";
import { DiscordProvider } from "./discord.provider";


export default async () => {
  Container.set("DiscordProvider", new DiscordProvider());
  console.log("Providers loaded!");
};
