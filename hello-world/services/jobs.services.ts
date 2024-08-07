// src/services/sequencerService.ts

import { JobProvider } from "../providers/jobs.providers";
import { NetworkProvider } from "../providers/networks.providers";
import { Job } from "../types";


export class JobService {

  private jobProvider: JobProvider;
  private networkProvider: NetworkProvider;
  private batchSize: number;

  constructor(batchSize: number){
    this.jobProvider = new JobProvider();
    this.networkProvider = new NetworkProvider();
    this.batchSize = batchSize;
  }

  public async checkInactiveJobs() {
    const masterNetwork = await this.networkProvider.getMaster();

    if (!masterNetwork) {
      console.log('There isnt master netowrk');
      return;
    }

    const workableJobs = await this.checkWorkableJobs(masterNetwork);
    // for (const job of workableJobs) {
    //   //Send discord noti
    // }
    return workableJobs
  }
  public async checkWorkableJobs(masterNetwork: string) {
    const jobs = await this.jobProvider.fetchJobs();
    console.log({jobs})
    for (const jobAddress of jobs) {
      const canWork = await this.jobProvider.checkIsWorkable(masterNetwork, jobAddress)
      console.log(canWork)
      if (!canWork) {
        console.log(`Job ${jobAddress} is workable`);
      }
    }
  }


}
