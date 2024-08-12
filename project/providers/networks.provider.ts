import { sequencerAbi } from '../abis/sequencer.abi';
import logger from '../logger';
import { Window } from '../types';
import { ethers, Contract } from 'ethers';
import Redis from 'ioredis';

export class NetworkProvider {

  private provider: ethers.JsonRpcProvider;
  private sequencerContract: Contract;
  private redisClient: Redis;
  private readonly CACHE_TTL = 600;
  private readonly REDIS_HOST = 'my-redis';
  private readonly REDIS_PORT = 6379;

  constructor() {
    const providerUrl = process.env.RPC_PROVIDER || 'https://rpc.ankr.com/eth';
    const sequencerAddress = process.env.SEQUENCER_ADDRESS || 'default';
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.sequencerContract = new ethers.Contract(sequencerAddress, sequencerAbi, this.provider);

    this.redisClient = new Redis({
      host: this.REDIS_HOST,
      port: this.REDIS_PORT
    });
  }

  public async fetchNetworks(): Promise<string[]> {
    logger.info('Fetching networks from the sequencer contract...');
    const cacheKey = 'networks';

    const cachedNetworks = await this.redisClient.get(cacheKey);
    if (cachedNetworks) {
      logger.info(`Cache hit networks`);
      return JSON.parse(cachedNetworks);
    }
    logger.info(`Cache miss networks`);
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
    logger.info('Fetching the master network...');
    const cacheKey = 'masterNetwork';
    const cachedMaster = await this.redisClient.get(cacheKey);
    if (cachedMaster) {
      logger.info(`Cache hit master network: ${cachedMaster}`);
      return cachedMaster;
    }

    const masterNetwork = await this.sequencerContract.getMaster();
    await this.redisClient.setex(cacheKey, this.CACHE_TTL, masterNetwork);
    logger.info(`Master network is ${masterNetwork}`);
    return masterNetwork;
  }

  public async getWindow(network: string): Promise<Window> {
    logger.info(`Fetching window details for network ${network}...`);
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
    try {
      logger.info(`Fetching total window size...`);
      const cachedTotalSize = await this.redisClient.get(cacheKey);
      if (cachedTotalSize) {
        logger.info(`Cache hit for key ${cacheKey}. Returning cached value: ${cachedTotalSize}`);
        return parseInt(cachedTotalSize);
      }
      logger.info(`Cache miss for key ${cacheKey}`);
      const totalWindowSize = await this.sequencerContract.totalWindowSize();
      await this.redisClient.setex(cacheKey, this.CACHE_TTL, totalWindowSize.toString());
      logger.info(`Fetched total window size: ${totalWindowSize}.`);
      return totalWindowSize;
    } catch (error) {
      logger.error(`Error fetching total window size from blockchain or cache for key ${cacheKey}:`, error);
      throw error;
    }
  }
}
