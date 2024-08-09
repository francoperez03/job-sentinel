// src/services/sequencerService.ts

import { Service, Inject } from "typedi";
import { JobProvider } from "../providers/jobs.provider";
import { NetworkProvider } from "../providers/networks.provider";
import { JobState } from "../types";
import { NotificationProvider } from "../interfaces/notificacion.interface";

const BLOCKS_LIMIT = 10;
@Service()
export class JobService {

  private jobProvider: JobProvider;
  private networkProvider: NetworkProvider;
  private jobStates: Record<string, JobState> = {};


  constructor(
    @Inject("DiscordProvider")
    private discordProvider: NotificationProvider
  ){
    this.jobProvider = new JobProvider();
    this.networkProvider = new NetworkProvider();
  }

  public async checkInactiveJobs() {
    const networks = await this.networkProvider.fetchNetworks();

    if (!networks) {
      console.log('There isnt master netowrk');
      return;
    }
    const workableJobs = await this.jobProvider.getWorkableJobs(networks);

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
