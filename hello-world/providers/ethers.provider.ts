// src/providers/ethereumProvider.ts

import { Contract, ethers } from 'ethers';
import { sequencerAbi } from '../abis/sequencer.abi';

const providerUrl = process.env.INFURA_URL || 'https://rpc.ankr.com/eth';
const sequencerAddress = process.env.SEQUENCER_ADDRESS || '0x238b4E35dAed6100C6162fAE4510261f88996EC9';

export const provider = new ethers.JsonRpcProvider(providerUrl);
export const sequencerContract: Contract = new ethers.Contract(sequencerAddress, sequencerAbi, provider);
