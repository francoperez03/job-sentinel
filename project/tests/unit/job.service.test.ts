import Redis from 'ioredis';
import { JobService } from '../../services/jobs.service';
import { JobProvider } from '../../providers/jobs.provider';
import { NetworkProvider } from '../../providers/networks.provider';
import { DiscordProvider } from '../../providers/discord.provider';
import { JobState, Window } from '../../types';

jest.mock('../../providers/jobs.provider');
jest.mock('../../providers/networks.provider');
jest.mock('../../providers/discord.provider');
jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
  }));
  return RedisMock;
});

describe('JobService', () => {
  const CURRENT_BLOCK = 100;
  const MORE_THAN_10_BLOCKS_AGO = 89;
  const LESS_THAN_10_BLOCKS_AGO = 95;
  let jobService: JobService;
  let jobProvider: jest.Mocked<JobProvider>;
  let networkProvider: jest.Mocked<NetworkProvider>;
  let notificationProvider: jest.Mocked<DiscordProvider>;
  let redisClient: jest.Mocked<Redis>;

  beforeAll(() => {
    jobProvider = new JobProvider() as jest.Mocked<JobProvider>;
    networkProvider = new NetworkProvider() as jest.Mocked<NetworkProvider>;
    notificationProvider = new DiscordProvider() as jest.Mocked<DiscordProvider>;

    jobService = new JobService(networkProvider, jobProvider, notificationProvider);
    redisClient = new Redis() as jest.Mocked<Redis>;
    jobProvider.getCurrentBlock.mockResolvedValue(CURRENT_BLOCK);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    redisClient.get.mockResolvedValueOnce(null);
    networkProvider.getWindow.mockResolvedValue({ start: 0, length: 20 } as Window);
  });

  it('should send a notification if a job is inactive for 10 blocks', async () => {
    const jobState: JobState = { lastChangeBlock: MORE_THAN_10_BLOCKS_AGO, wasWorkable: true };
    jobProvider.getJobState.mockResolvedValue(jobState);
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
    const jobState: JobState = { lastChangeBlock: LESS_THAN_10_BLOCKS_AGO, wasWorkable: true };
    jobProvider.getJobState.mockResolvedValue(jobState);
    networkProvider.fetchNetworks.mockResolvedValue(['network1']);
    jobProvider.getWorkableJobs.mockResolvedValue([
      { jobAddress: 'job1', canWork: true, network: 'network1' },
    ]);

    await jobService.checkInactiveJobs();

    expect(notificationProvider.sendNotification).not.toHaveBeenCalled();
  });

  it('should update job state when canWork changes from true to false', async () => {
    const jobState: JobState = { lastChangeBlock: LESS_THAN_10_BLOCKS_AGO, wasWorkable: true };
    jobProvider.getJobState.mockResolvedValue(jobState);
    networkProvider.fetchNetworks.mockResolvedValue(['network1']);
    jobProvider.getWorkableJobs.mockResolvedValue([
      { jobAddress: 'job1', canWork: false, network: 'network1' },
    ]);

    await jobService.checkInactiveJobs();

    expect(jobProvider.setJobState).toHaveBeenCalledWith('network1', 'job1', {
      wasWorkable: false,
      lastChangeBlock: CURRENT_BLOCK,
    });
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
    const jobState: JobState = { lastChangeBlock: CURRENT_BLOCK, wasWorkable: false };
    jobProvider.getJobState.mockResolvedValue(jobState);
    networkProvider.fetchNetworks.mockResolvedValue(['network1']);
    jobProvider.getWorkableJobs.mockResolvedValue([
      { jobAddress: 'job2', canWork: true, network: 'network1' },
    ]);

    await jobService.checkInactiveJobs();

    expect(jobProvider.setJobState).toHaveBeenCalledWith('network1', 'job2', {
      wasWorkable: true,
      lastChangeBlock: CURRENT_BLOCK,
    });
  });

  it('should handle multiple jobs and networks correctly', async () => {
    const jobState1: JobState = { lastChangeBlock: MORE_THAN_10_BLOCKS_AGO, wasWorkable: true };
    const jobState2: JobState = { lastChangeBlock: LESS_THAN_10_BLOCKS_AGO, wasWorkable: true };
    jobProvider.getJobState.mockImplementation((network, jobAddress) => {
      if (jobAddress === 'job1') return Promise.resolve(jobState1);
      if (jobAddress === 'job2') return Promise.resolve(jobState2);
      return Promise.resolve({ lastChangeBlock: CURRENT_BLOCK, wasWorkable: false });
    });
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

    expect(jobProvider.setJobState).toHaveBeenCalledWith('network2', 'job2', {
      wasWorkable: false,
      lastChangeBlock: CURRENT_BLOCK,
    });
  });
});
