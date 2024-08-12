import { ethers, Contract, hexlify } from 'ethers';
import Redis from 'ioredis';
import { sequencerAbi } from '../abis/sequencer.abi';
import { jobAbi } from '../abis/job.abi';
import { Job, JobState } from '../types';
import { IJobProvider } from '../interfaces/providers.interface';

const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
export class JobProvider implements IJobProvider {

  private provider: ethers.JsonRpcProvider;
  private sequencerContract: Contract;
  private redisClient: Redis;
  private readonly REDIS_HOST = 'my-redis';
  private readonly REDIS_PORT = 6379;

  constructor() {
    const providerUrl = process.env.RPC_PROVIDER || 'https://rpc.ankr.com/eth';
    const sequencerAddress = process.env.SEQUENCER_ADDRESS || '0x238b4E35dAed6100C6162fAE4510261f88996EC9';
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.sequencerContract = new ethers.Contract(sequencerAddress, sequencerAbi, this.provider);
    this.redisClient = new Redis({
      host: this.REDIS_HOST,
      port: this.REDIS_PORT
    });
  }

  private async checkIsWorkable(network: string, jobAddress: string): Promise<[boolean, string | null]> {
    const jobKey = `${jobAddress}-${network}`;
    let canWork = false;
    let args = null;

    try {
      const jobContract = new ethers.Contract(jobAddress, jobAbi, this.provider);
      [canWork, args] = await jobContract.workable(network);
      return [canWork, args];
    } catch (error) {
      console.error(`Error checking if job ${jobAddress} is workable on network ${network}:`, (error as Error).message);
      return [false, null];
    }
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

  public async getWorkableJobs(networks: string[]): Promise<Job[]> {
    const jobAddresses = await this.fetchJobs();
    const jobPromises: Promise<{ jobAddress: string; network: string; canWork: boolean; }>[] = [];

    for (const jobAddress of jobAddresses) {
      for (const network of networks) {
        const promise = this.checkIsWorkable(network, jobAddress).then(([canWork, args]) => {
          return {
            jobAddress,
            network,
            canWork,
          };
        });
        jobPromises.push(promise);
      }
    }

    const results = await Promise.allSettled(jobPromises);
    const jobs = results.reduce<any[]>((acc, result) => {
      if (result.status === FULFILLED && result.value && result.value.canWork) {
        acc.push(result.value);
      } else if (result.status === REJECTED) {
        console.error(`Error checking job. Network: ${result.reason.network}, Job: ${result.reason.jobAddress}: ${result.reason.message}`);
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

  public async setJobState(network: string, jobAddress: string, state: JobState): Promise<void> {
    const jobKey = `${jobAddress}-${network}`;
    await this.redisClient.set(jobKey, JSON.stringify(state));
  }

  public async getJobState(network: string, jobAddress: string): Promise<JobState> {
    const jobKey = `${jobAddress}-${network}`;
    const cachedState = await this.redisClient.get(jobKey);
    if (cachedState) {
      return JSON.parse(cachedState);
    }
    const blockNumber = await this.provider.getBlockNumber();
    const initialState = { lastChangeBlock: blockNumber, wasWorkable: false };
    await this.setJobState(network, jobAddress, initialState);
    return initialState;
  }
}