# Port 3000 Usage

## Current Status

Port 3000 is being used by your Next.js dev server (process ID 20388).

## Options

### Option 1: Keep Server Running (Recommended)

Playwright is configured to reuse existing servers. Your tests will work fine with the server already running.

**Advantages:**
- Faster test execution (no server startup time)
- Server stays available for manual testing
- No need to restart

### Option 2: Stop and Let Playwright Manage

If you want Playwright to start/stop the server automatically:

**Stop the current server:**
```bash
# Windows PowerShell
Stop-Process -Id 20388

# Or find and kill the process
taskkill /PID 20388 /F
```

Then Playwright will start it automatically when you run tests.

### Option 3: Use Different Port

If you want to run dev server on a different port:

1. Update `playwright.config.ts`:
```typescript
baseURL: 'http://localhost:3001',  // Change port
```

2. Start dev server on different port:
```bash
npm run dev -- -p 3001
```

## Checking Port Usage

**Windows PowerShell:**
```powershell
# Check what's using port 3000
netstat -ano | findstr :3000

# Find process details
Get-Process -Id <PID> | Select-Object ProcessName, Path
```

**Windows CMD:**
```cmd
netstat -ano | findstr :3000
tasklist /FI "PID eq <PID>"
```

## Recommendation

**Keep the server running** - Playwright is configured to reuse it, so tests will work fine. This is the most convenient setup.

