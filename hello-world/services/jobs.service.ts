// src/services/sequencerService.ts

import { DiscordProvider } from "../providers/discord.provider";
import { JobProvider } from "../providers/jobs.provider";
import { NetworkProvider } from "../providers/networks.provider";
import { Job, JobState } from "../types";

const BLOCK_LIMITS = 10;
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

  private async getWorkableJobs(masterNetwork: string) {
    const jobAddresses = await this.jobProvider.fetchJobs();
    let jobs: string[] = []
    for (const jobAddress of jobAddresses) {
      const [canWork, args] = await this.jobProvider.checkIsWorkable(masterNetwork, jobAddress)
      console.log({canWork})
      if(canWork) {
        jobs.push(jobAddress)
      }
    }
    return jobs
  }


  public async checkInactiveJobs() {
    const masterNetwork = await this.networkProvider.getMaster();

    if (!masterNetwork) {
      console.log('There isnt master netowrk');
      return;
    }
    const workableJobs = await this.getWorkableJobs(masterNetwork);
    this.discordProvider.sendNotification('¡Hola desde el ConcepcionLive!');

    const currentBlock: number = await this.jobProvider.getCurrentBlock()
    for (const job of workableJobs) {
      const JobInactivityState = this.jobStates[job] || { lastChangeBlock: currentBlock, currentState: false };
      console.log({JobInactivityState, currentBlock})
      if(JobInactivityState.lastChangeBlock && (currentBlock - JobInactivityState.lastChangeBlock) >= BLOCK_LIMITS) {

        console.log('Send discord notification')
      }
    }
    return workableJobs
  }
}
