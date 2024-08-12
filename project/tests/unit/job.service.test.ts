import { JobService } from '../../services/jobs.service';
import { JobProvider } from '../../providers/jobs.provider';
import { NetworkProvider } from '../../providers/networks.provider';
import { DiscordProvider } from '../../providers/discord.provider';

// Mock dependencies
jest.mock('../../providers/jobs.provider');
jest.mock('../../providers/networks.provider');
jest.mock('../../providers/discord.provider');

describe('JobService', () => {
  let jobService: JobService;
  let jobProvider: jest.Mocked<JobProvider>;
  let networkProvider: jest.Mocked<NetworkProvider>;
  let discordProvider: jest.Mocked<DiscordProvider>;

  beforeAll(() => {
    jobProvider = new JobProvider() as jest.Mocked<JobProvider>;
    networkProvider = new NetworkProvider() as jest.Mocked<NetworkProvider>;
    discordProvider = new DiscordProvider() as jest.Mocked<DiscordProvider>;

    jobService = new JobService(networkProvider, jobProvider, discordProvider)

    networkProvider.fetchNetworks.mockResolvedValue(['network1','network2','network3']);
    jobProvider.getWorkableJobs.mockResolvedValue([
      { jobAddress: 'job1', canWork: true, network: 'network1' },
    ]);
    jobProvider.getCurrentBlock.mockResolvedValue(100);
  });

  it('should check for inactive jobs and send a Discord notification if any are found', async () => {
    jobService['jobStates'] = {
      job1: { lastChangeBlock: 89, currentState: false }
    };

    await jobService.checkInactiveJobs();

    expect(discordProvider.sendNotification).toHaveBeenCalledWith(
      'Job job1 has been inactive for 10 blocks in network network1'
    );
  });

  it('should not send a notification if no inactive jobs are found', async () => {
    jobService['jobStates'] = {
      job1: { lastChangeBlock: 95, currentState: true }
    };

    await jobService.checkInactiveJobs();

    expect(discordProvider.sendNotification).not.toHaveBeenCalled();
  });
});
