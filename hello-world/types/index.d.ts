export interface Job {
    jobAddress: string;
    canWork: boolean;
    args: string;
}

export interface Window {
    start: number;
    length: number;
}

export interface JobState {
  lastChangeBlock: number;
  currentState: boolean;
}

