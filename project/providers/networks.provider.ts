import { sequencerAbi } from '../abis/sequencer.abi';
import { Window } from '../types';
import { ethers, Contract } from 'ethers';

export class NetworkProvider {

  private provider: ethers.JsonRpcProvider;
  private sequencerContract: Contract;
  private networksCache: string[] | null = null;

  constructor(){
    const providerUrl = process.env.RPC_PROVIDER || 'https://rpc.ankr.com/eth';
    const sequencerAddress = process.env.SEQUENCER_ADDRESS || 'default';
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.sequencerContract = new ethers.Contract(sequencerAddress, sequencerAbi, this.provider);
  }
  public async fetchNetworks(): Promise<string[]> {
    const numNetworks = await this.sequencerContract.numNetworks();

    const networks: string[] = [];

    for (let i = 0; i < numNetworks; i++) {
      const network = await this.sequencerContract.networkAt(i);
      networks.push(network);
    }

    return networks;
  }

  public async getMaster(): Promise<string> {
    const masterNetwork = await this.sequencerContract.getMaster();
    return masterNetwork;
  }

  public async getWindow(network: string): Promise<Window> {
    const windowDetails = await this.sequencerContract.windows(network);
    return {
      start: parseInt(windowDetails.start.toString()),
      length: parseInt(windowDetails.length.toString()),
    };
  }

  public async getTotalWindowSize(): Promise<number> {
    const totalWindowSize = await this.sequencerContract.totalWindowSize();
    return totalWindowSize;
  }
}
