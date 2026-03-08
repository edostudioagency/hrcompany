import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock import.meta.env before importing logger
vi.stubEnv('PROD', false);

describe('logger', () => {
  let logger: typeof import('../logger').logger;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Re-import logger fresh for each test
    const mod = await import('../logger');
    logger = mod.logger;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should log debug messages in development', () => {
    logger.debug('test debug message');
    expect(console.debug).toHaveBeenCalled();
  });

  it('should log info messages in development', () => {
    logger.info('test info message');
    expect(console.info).toHaveBeenCalled();
  });

  it('should log warn messages', () => {
    logger.warn('test warning');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    logger.error('test error');
    expect(console.error).toHaveBeenCalled();
  });

  it('should include data in log output', () => {
    const data = { userId: '123', action: 'login' };
    logger.info('user action', data);
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('user action'),
      data
    );
  });

  it('should include timestamp in log output', () => {
    logger.info('timestamped message');
    const call = (console.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });

  it('should include level in uppercase in log output', () => {
    logger.error('level test');
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call).toContain('[ERROR]');
  });
});
