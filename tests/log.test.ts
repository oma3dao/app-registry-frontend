import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log } from '../src/lib/log';

describe('log utility', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs with caller information when stack trace is available', () => {
    // Create a function to call log from
    function testFunction() {
      log('test message', 123, { key: 'value' });
    }

    testFunction();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*log\.test\.ts:testFunction\]/),
      'test message',
      123,
      { key: 'value' }
    );
  });

  it('logs with anonymous function when function name is not available', () => {
    // Call log from an anonymous function
    (() => {
      log('anonymous function test');
    })();

    expect(consoleSpy).toHaveBeenCalledWith(
      'anonymous function test'
    );
  });

  it('logs with fallback when stack trace parsing fails', () => {
    // Mock a scenario where stack trace is malformed
    const originalError = Error;
    vi.spyOn(global, 'Error').mockImplementation(() => ({
      stack: 'malformed stack trace'
    } as Error));

    log('fallback test');

    expect(consoleSpy).toHaveBeenCalledWith('fallback test');

    // Restore original Error
    vi.restoreAllMocks();
  });

  it('logs with fallback when stack trace is undefined', () => {
    // Mock a scenario where stack is undefined
    const originalError = Error;
    vi.spyOn(global, 'Error').mockImplementation(() => ({
      stack: undefined
    } as Error));

    log('undefined stack test');

    expect(consoleSpy).toHaveBeenCalledWith('undefined stack test');

    // Restore original Error
    vi.restoreAllMocks();
  });

  it('handles multiple arguments correctly', () => {
    function multiArgFunction() {
      log('string', 42, true, null, undefined, { obj: 'test' }, [1, 2, 3]);
    }

    multiArgFunction();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*log\.test\.ts:multiArgFunction\]/),
      'string',
      42,
      true,
      null,
      undefined,
      { obj: 'test' },
      [1, 2, 3]
    );
  });

  it('handles empty arguments', () => {
    function emptyArgsFunction() {
      log();
    }

    emptyArgsFunction();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*log\.test\.ts:emptyArgsFunction\]/)
    );
  });

  it('handles complex objects and arrays', () => {
    function complexArgsFunction() {
      const complexObj = {
        nested: {
          array: [1, 2, 3],
          string: 'test'
        },
        boolean: true
      };
      
      log('complex test', complexObj);
    }

    complexArgsFunction();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*log\.test\.ts:complexArgsFunction\]/),
      'complex test',
      {
        nested: {
          array: [1, 2, 3],
          string: 'test'
        },
        boolean: true
      }
    );
  });

  it('handles async functions', async () => {
    async function asyncTestFunction() {
      log('async test');
    }

    await asyncTestFunction();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*log\.test\.ts:asyncTestFunction\]/),
      'async test'
    );
  });

  it('extracts correct filename from different path formats', () => {
    // Mock different stack trace formats
    const originalError = Error;
    vi.spyOn(global, 'Error').mockImplementation(() => ({
      stack: `Error
    at testFunction (/path/to/src/components/test.tsx:10:15)
    at log (/path/to/src/lib/log.ts:5:10)
    at Object.<anonymous> (/path/to/tests/log.test.ts:5:20)`
    } as Error));

    log('filename test');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*test\.tsx:testFunction\]/),
      'filename test'
    );

    vi.restoreAllMocks();
  });

  it('handles Windows path separators', () => {
    // Mock Windows-style paths
    const originalError = Error;
    vi.spyOn(global, 'Error').mockImplementation(() => ({
      stack: `Error
    at testFunction (C:\\path\\to\\src\\components\\test.tsx:10:15)
    at log (C:\\path\\to\\src\\lib\\log.ts:5:10)
    at Object.<anonymous> (C:\\path\\to\\tests\\log.test.ts:5:20)`
    } as Error));

    log('Windows path test');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*test\.tsx:testFunction\]/),
      'Windows path test'
    );

    vi.restoreAllMocks();
  });
}); 