export interface SequencerContract {
    numNetworks(): Promise<bigint>;
    networkAt(index: number): Promise<string>;
}
