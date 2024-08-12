export interface Job {
    jobAddress: string;
    canWork: boolean;
    network: string;
}

export interface Window {
    start: number;
    length: number;
}

export interface JobState {
  lastChangeBlock: number;
  wasWorkable: boolean;
}

export type JobStates = Record<string, { lastChangeBlock: number, wasWorkable: boolean }>
