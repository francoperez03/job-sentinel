// src/services/jobs.service.ts

import { JobStates } from "../types";
import { IJobProvider, INetworkProvider, INotificationProvider } from "../interfaces/providers.interface";

const BLOCKS_LIMIT = 10;

export class JobService {

  private jobStates: JobStates = {};

  constructor(
    private networkProvider: INetworkProvider,
    private jobProvider: IJobProvider,
    private notificationProvider: INotificationProvider,
  ) {}

  public async checkInactiveJobs() {
    const networks = await this.networkProvider.fetchNetworks();
    console.log({ networks });
    if (!networks) {
      console.log('Networks not found');
      return;
    }
    const workableJobs = await this.jobProvider.getWorkableJobs(networks);
    const currentBlock: number = await this.jobProvider.getCurrentBlock();
    for (const job of workableJobs) {
      const JobInactivityState = this.jobStates[job.jobAddress] || { lastChangeBlock: currentBlock, currentState: false };
      if (JobInactivityState.lastChangeBlock && (currentBlock - JobInactivityState.lastChangeBlock) >= BLOCKS_LIMIT) {
        await this.notificationProvider.sendNotification(`Job ${job.jobAddress} has been inactive for 10 blocks in network ${job.network}`);
        console.log('Send discord notification');
      }
    }
    return workableJobs;
  }
}
