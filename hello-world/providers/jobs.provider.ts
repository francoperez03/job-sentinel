// src/services/sequencerService.ts

import { sequencerAbi } from '../abis/sequencer.abi';
import { ethers, Contract, hexlify } from 'ethers';
import { jobAbi } from '../abis/job.abi';

const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'
export class JobProvider {

  private provider: ethers.JsonRpcProvider;
  private sequencerContract: Contract;

  constructor(){
    const providerUrl = process.env.RPC_PROVIDER || 'https://rpc.ankr.com/eth';
    const sequencerAddress = process.env.SEQUENCER_ADDRESS || '0x238b4E35dAed6100C6162fAE4510261f88996EC9';
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.sequencerContract = new ethers.Contract(sequencerAddress, sequencerAbi, this.provider);
  }

  private async checkIsWorkable(network: string, jobAddress: string){
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

  public async fetchJobs(): Promise<string[]> {
    const numJobs = await this.sequencerContract.numJobs();
    const jobPromises: Promise<string>[] = [];


    for (let i = 0; i < numJobs; i++) {
      jobPromises.push(this.sequencerContract.jobAt(i));
    }
    const results = await Promise.allSettled(jobPromises);

    const jobs = results.reduce<any[]>((acc, result, index) => {
      if (result.status === FULFILLED && result.value) {
        acc.push(result.value);
      } else if (result.status === REJECTED) {
        console.error(`Error checking job. Job: ${result.reason.jobAddress}: ${result.reason.message}`);
      }
      return acc;
    }, []);
    return jobs;
  }

  public async getNumberOfJobs(): Promise<number> {
    const numJobs = await this.sequencerContract.numJobs();
    return parseInt(numJobs);
  }

  public async getWorkableJobs(masterNetwork: string): Promise<string[]> {
    const jobAddresses = await this.fetchJobs();
    const jobPromises = jobAddresses.map(async (jobAddress) => {
      return this.checkIsWorkable(masterNetwork, jobAddress).then(([canWork, args]) => ({
        jobAddress,
        canWork,
      }));
    });
    const results = await Promise.allSettled(jobPromises);
    const jobs = results.reduce<any[]>((acc, result, index) => {
      if (result.status === FULFILLED && result.value) {
        acc.push({jobAddress:jobAddresses[index], canWork: result.value.canWork});
      } else if (result.status === REJECTED) {
        console.error(`Error checking job. Job: ${result.reason.jobAddress}: ${result.reason.message}`);
      }
      return acc;
    }, []);
    return jobs;
  }

  public async getCurrentBlock(): Promise<number> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      console.log('Error retrieving block:', (error as Error).message);
      throw error;
    }
  }
}
