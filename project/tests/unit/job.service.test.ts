import { JobService } from '../../services/jobs.service';
import { JobProvider } from '../../providers/jobs.provider';
import { NetworkProvider } from '../../providers/networks.provider';
import { DiscordProvider } from '../../providers/discord.provider';

// Mock dependencies
jest.mock('../../providers/jobs.provider');
jest.mock('../../providers/networks.provider');
jest.mock('../../providers/discord.provider');

describe('JobService', () => {
  const CURRENT_BLOCK = 100;
  const MORE_THAN_10_BLOCKS_AGO = 89;
  const LESS_THAN_10_BLOCKS_AGO = 95;
  let jobService: JobService;
  let jobProvider: jest.Mocked<JobProvider>;
  let networkProvider: jest.Mocked<NetworkProvider>;
  let notificationProvider: jest.Mocked<DiscordProvider>;

  beforeAll(() => {
    jobProvider = new JobProvider() as jest.Mocked<JobProvider>;
    networkProvider = new NetworkProvider() as jest.Mocked<NetworkProvider>;
    notificationProvider = new DiscordProvider() as jest.Mocked<DiscordProvider>;

    jobService = new JobService(networkProvider, jobProvider, notificationProvider);

    jobProvider.getCurrentBlock.mockResolvedValue(CURRENT_BLOCK);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jobService['jobStates'] = {};
  });

  it('should send a notification if a job is inactive for 10 blocks', async () => {
    jobService['jobStates'] = {
      job1: { lastChangeBlock: MORE_THAN_10_BLOCKS_AGO, wasWorkable: true }
    };
    networkProvider.fetchNetworks.mockResolvedValue(['network1']);
    jobProvider.getWorkableJobs.mockResolvedValue([
      { jobAddress: 'job1', canWork: true, network: 'network1' },
    ]);


    await jobService.checkInactiveJobs();

    expect(notificationProvider.sendNotification).toHaveBeenCalledWith(
      'Job job1 has been inactive for 10 blocks in network network1'
    );
  });

  it('should not send a notification if a job is not inactive for 10 blocks', async () => {
    jobService['jobStates'] = {
      job1: { lastChangeBlock: LESS_THAN_10_BLOCKS_AGO, wasWorkable: true }
    };
    networkProvider.fetchNetworks.mockResolvedValue(['network1']);
    jobProvider.getWorkableJobs.mockResolvedValue([
      { jobAddress: 'job1', canWork: true, network: 'network1' },
    ]);


    await jobService.checkInactiveJobs();

    expect(notificationProvider.sendNotification).not.toHaveBeenCalled();
  });

  it('should update job state when canWork changes from true to false', async () => {
    jobService['jobStates'] = {
      job1: { lastChangeBlock: LESS_THAN_10_BLOCKS_AGO, wasWorkable: true }
    };
    networkProvider.fetchNetworks.mockResolvedValue(['network1']);
    jobProvider.getWorkableJobs.mockResolvedValue([
      { jobAddress: 'job1', canWork: false, network: 'network1' },
    ]);


    await jobService.checkInactiveJobs();

    expect(jobService['jobStates']['job1'].wasWorkable).toBe(false);
    expect(jobService['jobStates']['job1'].lastChangeBlock).toBe(CURRENT_BLOCK);
    expect(notificationProvider.sendNotification).not.toHaveBeenCalled();
  });

  it('should not send a notification if no networks are found', async () => {
    networkProvider.fetchNetworks.mockResolvedValue([]);
    jobProvider.getWorkableJobs.mockResolvedValue([]);

    await jobService.checkInactiveJobs();

    expect(notificationProvider.sendNotification).not.toHaveBeenCalled();
  });

  it('should not send a notification if no workable jobs are found', async () => {
    networkProvider.fetchNetworks.mockResolvedValue(['network1']);
    jobProvider.getWorkableJobs.mockResolvedValue([]);

    await jobService.checkInactiveJobs();

    expect(notificationProvider.sendNotification).not.toHaveBeenCalled();
  });

  it('should handle errors if the job provider fails', async () => {
    networkProvider.fetchNetworks.mockResolvedValue(['network1']);
    jobProvider.getWorkableJobs.mockRejectedValue(new Error('Job provider failure'));

    await expect(jobService.checkInactiveJobs()).rejects.toThrow('Job provider failure');

    expect(notificationProvider.sendNotification).not.toHaveBeenCalled();
  });

  it('should initialize state correctly when a new job is found', async () => {
    networkProvider.fetchNetworks.mockResolvedValue(['network1']);
    jobProvider.getWorkableJobs.mockResolvedValue([
      { jobAddress: 'job2', canWork: true, network: 'network1' },
    ]);

    await jobService.checkInactiveJobs();

    expect(jobService['jobStates']['job2'].wasWorkable).toBe(true);
    expect(jobService['jobStates']['job2'].lastChangeBlock).toBe(CURRENT_BLOCK);
  });

  it('should handle multiple jobs and networks correctly', async () => {
    jobService['jobStates'] = {
      job1: { lastChangeBlock: MORE_THAN_10_BLOCKS_AGO, wasWorkable: true },
      job2: { lastChangeBlock: LESS_THAN_10_BLOCKS_AGO, wasWorkable: true }
    };
    networkProvider.fetchNetworks.mockResolvedValue(['network1', 'network2']);
    jobProvider.getWorkableJobs.mockResolvedValue([
      { jobAddress: 'job1', canWork: true, network: 'network1' },
      { jobAddress: 'job2', canWork: false, network: 'network2' },
    ]);


    await jobService.checkInactiveJobs();

    expect(notificationProvider.sendNotification).toHaveBeenCalledWith(
      'Job job1 has been inactive for 10 blocks in network network1'
    );
    expect(notificationProvider.sendNotification).not.toHaveBeenCalledWith(
      'Job job2 has been inactive for 10 blocks in network network2'
    );

    expect(jobService['jobStates']['job2'].wasWorkable).toBe(false);
  });
});
