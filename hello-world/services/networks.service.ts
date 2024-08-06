import { sequencerContract } from '../providers/ethers.provider';

export async function fetchNetworks(): Promise<string[]> {
    const numNetworks = await sequencerContract.numNetworks();
    const networks: string[] = [];

    for (let i = 0; i < numNetworks; i++) {
        const network = await sequencerContract.networkAt(i);
        networks.push(network);
    }

    return networks;
}
