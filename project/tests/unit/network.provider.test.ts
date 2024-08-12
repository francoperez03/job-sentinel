import Redis from 'ioredis';
import { NetworkProvider } from '../../providers/networks.provider';
import { ethers, Contract } from 'ethers';
jest.mock('ethers');
jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
  }));
  return RedisMock;
});

describe('NetworkProvider', () => {
  const NUM_NETWORKS = 4
  const WINDOWS_START = 26
  const WINDOWS_LENGTH = 13
  const TOTAL_WINDOWS_SIZE = 48
  let networkProvider: NetworkProvider;
  let mockContract: jest.Mocked<Contract>;
  let redisClient: jest.Mocked<Redis>;

  beforeAll(() => {
    
    mockContract = {
      numNetworks: jest.fn(),
      networkAt: jest.fn(),
      getMaster: jest.fn(),
      windows: jest.fn(),
      totalWindowSize: jest.fn(),
    } as unknown as jest.Mocked<Contract>;

    (ethers.Contract as jest.Mock).mockImplementation(() => mockContract);
    redisClient = new Redis() as jest.Mocked<Redis>;
    networkProvider = new NetworkProvider();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    redisClient.get.mockResolvedValueOnce(null);
  });

  it('should fetch networks correctly', async () => {
    mockContract.numNetworks.mockResolvedValueOnce(NUM_NETWORKS);
    mockContract.networkAt.mockResolvedValueOnce('network1')
                          .mockResolvedValueOnce('network2')
                          .mockResolvedValueOnce('network3')
                          .mockResolvedValueOnce('network4');

    const networks = await networkProvider.fetchNetworks();

    expect(networks).toEqual(['network1', 'network2', 'network3', 'network4']);
    expect(mockContract.numNetworks).toHaveBeenCalled();
    expect(mockContract.networkAt).toHaveBeenCalledTimes(NUM_NETWORKS);
  });

  it('should fetch the master network correctly', async () => {
    mockContract.getMaster.mockResolvedValueOnce('network3');

    const masterNetwork = await networkProvider.getMaster();

    expect(masterNetwork).toBe('network3');
    expect(mockContract.getMaster).toHaveBeenCalled();
  });

  it('should fetch window details for a network', async () => {
    mockContract.windows.mockResolvedValueOnce({ start: WINDOWS_START, length: WINDOWS_LENGTH });

    const window = await networkProvider.getWindow('network3');

    expect(window).toEqual({ start: WINDOWS_START, length: WINDOWS_LENGTH });
    expect(mockContract.windows).toHaveBeenCalledWith('network3');
  });

  it('should fetch the total window size', async () => {
    mockContract.totalWindowSize.mockResolvedValueOnce(TOTAL_WINDOWS_SIZE);

    const totalWindowSize = await networkProvider.getTotalWindowSize();

    expect(totalWindowSize).toBe(TOTAL_WINDOWS_SIZE);
    expect(mockContract.totalWindowSize).toHaveBeenCalled();
  });
});
