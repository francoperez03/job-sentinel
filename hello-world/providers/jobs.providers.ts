// src/services/sequencerService.ts

import { sequencerAbi } from '../abis/sequencer.abi';
import { ethers, Contract, hexlify } from 'ethers';
import { Job } from '../types';
import { jobAbi } from '../abis/job.abi';

export class JobProvider {

  private provider: ethers.JsonRpcProvider;
  private sequencerContract: Contract;

  constructor(){
    const providerUrl = process.env.RPC_PROVIDER || 'https://rpc.ankr.com/eth';
    const sequencerAddress = process.env.SEQUENCER_ADDRESS || '0x238b4E35dAed6100C6162fAE4510261f88996EC9';
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.sequencerContract = new ethers.Contract(sequencerAddress, sequencerAbi, this.provider);
  }
  public async fetchJobs(): Promise<string[]> {
    const numJobs = await this.sequencerContract.numJobs();

    const jobs: string[] = [];

    for (let i = 0; i < numJobs; i++) {
      const network = await this.sequencerContract.jobAt(i);
      jobs.push(network);
    }

    return jobs;
  }

  public async getNumberOfJobs(): Promise<number> {
    const numJobs = await this.sequencerContract.numJobs();
    return parseInt(numJobs);
  }

  public async checkIsWorkable(network: string, jobAddress: string){
    let canWork = false;
    try{
      const jobContract = new ethers.Contract(jobAddress, jobAbi, this.provider);
      const result = await jobContract.workable(network);
      return result;
    } catch(error){
      console.log((error as Error).message)
    }

    return canWork
  }

  public async getCurrentBlock(): Promise<number> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      console.log('error retrieving block:', (error as Error).message);
      throw error;
    }
  }
}
