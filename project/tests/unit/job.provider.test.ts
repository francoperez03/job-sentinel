import { jobAbi } from '../../abis/job.abi';
import { sequencerAbi } from '../../abis/sequencer.abi';
import { JobProvider } from '../../providers/jobs.provider';
import { ethers, Contract, JsonRpcProvider } from 'ethers';

jest.mock('ethers');

describe('JobProvider', () => {
  const BLOCK_NUMBER = 1234
  const NUM_JOBS = 3
  const NUM_WORKABLE_JOBS = 2
  let jobProvider: JobProvider;
  let mockSequencerContract: jest.Mocked<Contract>;
  let mockJobContract: jest.Mocked<Contract>;
  let mockProvider: jest.Mocked<JsonRpcProvider>

  beforeAll(() => {
    mockSequencerContract = {
      numJobs: jest.fn(),
      jobAt: jest.fn(),
    } as unknown as jest.Mocked<Contract>;

    mockJobContract = {
      workable: jest.fn(),
    } as unknown as jest.Mocked<Contract>;

    mockProvider = {
      getBlockNumber: jest.fn().mockResolvedValueOnce(BLOCK_NUMBER),
    } as unknown as jest.Mocked<ethers.JsonRpcProvider>;
    
    (ethers.Contract as jest.Mock).mockImplementation((address, abi, provider) => {
      if (abi === sequencerAbi) {
        return mockSequencerContract;
      } else if (abi === jobAbi) {
        return mockJobContract;
      }
      throw new Error('Unknown contract ABI');
    });

    (ethers.JsonRpcProvider as jest.Mock).mockReturnValue(mockProvider);

    jobProvider = new JobProvider();
  });

  it('should fetch jobs correctly', async () => {
    mockSequencerContract.numJobs.mockResolvedValueOnce(NUM_JOBS);
    mockSequencerContract.jobAt.mockResolvedValueOnce('job1')
                               .mockResolvedValueOnce('job2')
                               .mockResolvedValueOnce('job3');

    const jobs = await jobProvider.fetchJobs();

    expect(jobs).toEqual(['job1', 'job2', 'job3']);
    expect(mockSequencerContract.numJobs).toHaveBeenCalled();
    expect(mockSequencerContract.jobAt).toHaveBeenCalledTimes(NUM_JOBS);
  });

  it('should check if a job is workable correctly', async () => {
    mockJobContract.workable.mockResolvedValueOnce([true]);

    const result = await jobProvider['checkIsWorkable']('network1', 'job1');

    expect(result).toEqual([true]);
    expect(mockJobContract.workable).toHaveBeenCalledWith('network1');
  });

  it('should fetch workable jobs correctly', async () => {
    mockSequencerContract.numJobs.mockResolvedValueOnce(NUM_WORKABLE_JOBS);
    mockSequencerContract.jobAt.mockResolvedValueOnce('job1')
                               .mockResolvedValueOnce('job2');
    mockJobContract.workable.mockResolvedValueOnce([true])
                             .mockResolvedValueOnce([false]);

    const jobs = await jobProvider.getWorkableJobs(['network1']);

    expect(jobs).toEqual([
      { jobAddress: 'job1', network: 'network1', canWork: true },
    ]);
    expect(mockJobContract.workable).toHaveBeenCalledTimes(NUM_WORKABLE_JOBS);
  });


  it('should get current block correctly', async () => {
    const blockNumber = await jobProvider.getCurrentBlock();

    expect(blockNumber).toBe(BLOCK_NUMBER);
    expect(mockProvider.getBlockNumber).toHaveBeenCalled();
  });
});
