import { sequencerAbi } from '../abis/sequencer.abi';
import { Window } from '../types';
import { ethers, Contract } from 'ethers';
import Redis from 'ioredis';

export class NetworkProvider {

  private provider: ethers.JsonRpcProvider;
  private sequencerContract: Contract;
  private redisClient: Redis;
  private readonly CACHE_TTL = 600;

  constructor() {
    const providerUrl = process.env.RPC_PROVIDER || 'https://rpc.ankr.com/eth';
    const sequencerAddress = process.env.SEQUENCER_ADDRESS || 'default';
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.sequencerContract = new ethers.Contract(sequencerAddress, sequencerAbi, this.provider);

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl);
  }

  public async fetchNetworks(): Promise<string[]> {
    const cacheKey = 'networks';
    const cachedNetworks = await this.redisClient.get(cacheKey);
    console.log({cachedNetworks})
    if (cachedNetworks) {
      return JSON.parse(cachedNetworks);
    }

    const numNetworks = await this.sequencerContract.numNetworks();
    const networks: string[] = [];

    for (let i = 0; i < numNetworks; i++) {
      const network = await this.sequencerContract.networkAt(i);
      networks.push(network);
    }

    await this.redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(networks));
    return networks;
  }

  public async getMaster(): Promise<string> {
    const cacheKey = 'masterNetwork';
    const cachedMaster = await this.redisClient.get(cacheKey);

    if (cachedMaster) {
      return cachedMaster;
    }

    const masterNetwork = await this.sequencerContract.getMaster();
    await this.redisClient.setex(cacheKey, this.CACHE_TTL, masterNetwork);

    return masterNetwork;
  }

  public async getWindow(network: string): Promise<Window> {
    const cacheKey = `window-${network}`;
    const cachedWindow = await this.redisClient.get(cacheKey);

    if (cachedWindow) {
      return JSON.parse(cachedWindow);
    }

    const windowDetails = await this.sequencerContract.windows(network);
    const window = {
      start: parseInt(windowDetails.start.toString()),
      length: parseInt(windowDetails.length.toString()),
    };

    await this.redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(window));
    return window;
  }

  public async getTotalWindowSize(): Promise<number> {
    const cacheKey = 'totalWindowSize';
    const cachedTotalSize = await this.redisClient.get(cacheKey);

    if (cachedTotalSize) {
      return parseInt(cachedTotalSize);
    }

    const totalWindowSize = await this.sequencerContract.totalWindowSize();
    await this.redisClient.setex(cacheKey, this.CACHE_TTL, totalWindowSize.toString());

    return totalWindowSize;
  }
}
