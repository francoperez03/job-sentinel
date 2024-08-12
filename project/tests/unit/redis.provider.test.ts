import Redis from 'ioredis';
import { JobProvider } from '../../providers/jobs.provider';

describe('Redis Cache', () => {
  let jobProvider: JobProvider;
  let redisClient: Redis;

  beforeAll(() => {
    redisClient = new Redis();
    jobProvider = new JobProvider();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  it('should cache and retrieve job state', async () => {
    const network = 'test-network';
    const jobAddress = '0xJobAddress';
    const jobState = await jobProvider.getJobState(network, jobAddress);
    console.log({jobState})
    expect(jobState).toHaveProperty('lastChangeBlock');
    expect(jobState).toHaveProperty('wasWorkable', false);

    const cachedState = await redisClient.get(`${jobAddress}-${network}`);
    expect(cachedState).toBeDefined();
    expect(JSON.parse(cachedState as string)).toMatchObject(jobState);
  });
});
