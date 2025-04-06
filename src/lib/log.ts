/**
 * Custom logging function that includes caller information from stack trace
 * @param args Any number of arguments to log
 */
export function log(...args: unknown[]): void {
  const error = new Error();
  const stack = error.stack?.split('\n');
  
  // Skip the first line (Error:), and find the first line that's not from log.ts
  const callerLine = stack?.find(line => 
    !line.includes('Error') && 
    !line.includes('log.ts')
  );
  
  if (callerLine) {
    // Extract filename and function name
    const match = callerLine.match(/at (?:async )?([^(]+) \((.+):\d+:\d+\)/);
    if (match) {
      const [, functionName, filePath] = match;
      const fileName = filePath.split('/').pop() || 'unknown';
      const cleanFunctionName = functionName.trim().split('.').pop() || 'anonymous';
      console.log(`[${fileName}:${cleanFunctionName}]`, ...args);
      return;
    }
  }
  
  // Fallback if we can't parse the stack trace
  console.log(...args);
}  