// src/services/import ogger from '../logger';jobs.service.ts
import logger from '../logger';
import { Job, JobState, JobStates } from "../types";
import { IJobProvider, INetworkProvider, INotificationProvider } from "../interfaces/providers.interface";

const BLOCKS_LIMIT = 10;

export class JobService {

  constructor(
    private networkProvider: INetworkProvider,
    private jobProvider: IJobProvider,
    private notificationProvider: INotificationProvider,
  ) { }

  /**
 * @title JobService
 * @dev This service is responsible for checking the inactivity of jobs across different networks.
 * It monitors if jobs have not been executed for a specific network within the last `BLOCKS_LIMIT` blocks.
 * 
 * @notice The function `checkInactiveJobs` is optimized to minimize blockchain calls by focusing on
 * networks that are currently active or will be active soon, based on the current block number and 
 * the configured window sizes for each network. 
 * 
 * @details 
 * - The function first fetches all available networks and determines which networks are relevant for checking
 *   based on the current block number (`currentBlock`) and the total window size.
 * - It calculates the position within the cycle of all windows and identifies the active window and the next 
 *   window that will become active within the next `BLOCKS_LIMIT` blocks.
 * - Only jobs within these relevant networks are checked for their `canWork` status, significantly reducing
 *   the number of calls to `checkIsWorkable` compared to a naive approach that would check all jobs across all networks.
 * - The function tracks the last block where a job's state changed and raises an alert if the job has been
 *   in a workable state for more than `BLOCKS_LIMIT` blocks without being executed.
 * 
 * @return A list of jobs that were checked during the execution.
 */
  public async checkInactiveJobs() {
    logger.info('Fetching networks...');
    const networks = await this.networkProvider.fetchNetworks();
    if (!networks || networks.length === 0) {
      logger.warn('No networks found');
      return;
    }

    const currentBlock: number = await this.jobProvider.getCurrentBlock();
    const totalWindowSize = await this.networkProvider.getTotalWindowSize();
    const posInCycle = currentBlock % totalWindowSize;

    const relevantNetworks: string[] = [];
    for (const network of networks) {
      const window = await this.networkProvider.getWindow(network);
      if (window.start <= posInCycle && posInCycle < window.start + window.length) {
        relevantNetworks.push(network);
      } else if ((posInCycle + BLOCKS_LIMIT) % totalWindowSize >= window.start) {
        relevantNetworks.push(network);
      }
    }
    logger.info('Fetching workable jobs...');
    const workableJobs: Job[] = await this.jobProvider.getWorkableJobs(relevantNetworks);
    logger.info(`Checking inactive jobs at block ${currentBlock}`, { workableJobs });
    for (const job of workableJobs) {
      const jobState: JobState = await this.jobProvider.getJobState(job.network, job.jobAddress)

      if (job.canWork && !jobState.wasWorkable) {
        jobState.lastChangeBlock = currentBlock;
        jobState.wasWorkable = true;
        logger.info(`Job ${job.jobAddress} on network ${job.network} became workable at block ${currentBlock}`);
      }

      if (job.canWork && jobState.wasWorkable && (currentBlock - jobState.lastChangeBlock) >= BLOCKS_LIMIT) {
        await this.notificationProvider.sendNotification(`Job ${job.jobAddress} has been inactive for 10 blocks in network ${job.network}`);
        logger.info(`Notification sent for job ${job.jobAddress} on network ${job.network}`);
      }

      if (!job.canWork && jobState.wasWorkable) {
        jobState.wasWorkable = false;
        jobState.lastChangeBlock = currentBlock;
        logger.info(`Job ${job.jobAddress} on network ${job.network} became unworkable at block ${currentBlock}`);
      }
      await this.jobProvider.setJobState(job.network, job.jobAddress, jobState)
    }

    return workableJobs;
  }

}
