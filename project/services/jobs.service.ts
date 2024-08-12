// src/services/jobs.service.ts

import { Job, JobStates } from "../types";
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
    if (!networks) {
      console.log('Networks not found');
      return;
    }
    const workableJobs: Job[] = await this.jobProvider.getWorkableJobs(networks);
    const currentBlock: number = await this.jobProvider.getCurrentBlock();
    for (const job of workableJobs) {
      const jobState = this.jobStates[job.jobAddress] || { lastChangeBlock: currentBlock, wasWorkable: false };

      if (job.canWork && !jobState.wasWorkable) {
        jobState.lastChangeBlock = currentBlock;
        jobState.wasWorkable = true;
      }
      if (job.canWork && jobState.wasWorkable && (currentBlock - jobState.lastChangeBlock) >= BLOCKS_LIMIT) {
        await this.notificationProvider.sendNotification(`Job ${job.jobAddress} has been inactive for 10 blocks in network ${job.network}`);
        console.log('Send discord notification');
      }

      if (!job.canWork && jobState.wasWorkable) {
        jobState.wasWorkable = false;
        jobState.lastChangeBlock = currentBlock;
      }

      this.jobStates[job.jobAddress] = jobState;
    }
    return workableJobs;
  }
}
