// src/services/sequencerService.ts

import { DiscordProvider } from "../providers/discord.provider";
import { JobProvider } from "../providers/jobs.provider";
import { NetworkProvider } from "../providers/networks.provider";
import { Job, JobState } from "../types";

const BLOCKS_LIMIT = 10;
export class JobService {

  private jobProvider: JobProvider;
  private networkProvider: NetworkProvider;
  private discordProvider: DiscordProvider;
  private batchSize: number;
  private jobStates: Record<string, JobState> = {};


  constructor(batchSize: number){
    this.jobProvider = new JobProvider();
    this.networkProvider = new NetworkProvider();
    this.discordProvider = new DiscordProvider();
    this.batchSize = batchSize;
  }

  public async checkInactiveJobs() {
    const masterNetwork = await this.networkProvider.getMaster();

    if (!masterNetwork) {
      console.log('There isnt master netowrk');
      return;
    }
    const workableJobs = await this.jobProvider.getWorkableJobs(masterNetwork);

    const currentBlock: number = await this.jobProvider.getCurrentBlock()
    for (const job of workableJobs) {
      const JobInactivityState = this.jobStates[job] || { lastChangeBlock: currentBlock, currentState: false };
      if(JobInactivityState.lastChangeBlock && (currentBlock - JobInactivityState.lastChangeBlock) >= BLOCKS_LIMIT) {
        this.discordProvider.sendNotification(job);
        console.log('Send discord notification')
      }
    }
    return workableJobs
  }
}
