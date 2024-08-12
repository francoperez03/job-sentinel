import { Job, Window } from "../types";

export interface INotificationProvider {
  sendNotification(message: string): Promise<void>;
}

export interface INetworkProvider {
  fetchNetworks(): Promise<string[]>;
  getMaster(): Promise<string>;
  getWindow(network: string): Promise<Window>;
  getTotalWindowSize(): Promise<number>;
}

export interface IJobProvider {
  fetchJobs(): Promise<string[]>;
  getWorkableJobs(networks: string[]): Promise<Job[]>;
  getCurrentBlock(): Promise<number>;
}