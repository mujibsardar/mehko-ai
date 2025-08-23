# Server Management Rules

## ALWAYS Remember These Scripts Exist
The project has dedicated scripts for server management. **NEVER** forget about them or suggest manual alternatives.

## Available Server Scripts
```
scripts/
├── start-all-services.sh      # Start all servers
├── stop-all-services.sh       # Stop all servers  
├── restart-all-services.sh    # Restart all servers
├── status-all-services.sh     # Check server status
├── watch-logs.sh             # Monitor server logs
└── monitor-server.py         # Python server monitor
```

## When to Use Server Scripts
- **ALWAYS** use `./scripts/start-all-services.sh` to start servers
- **ALWAYS** use `./scripts/stop-all-services.sh` to stop servers
- **ALWAYS** use `./scripts/restart-all-services.sh` to restart servers
- **ALWAYS** use `./scripts/status-all-services.sh` to check status
- **NEVER** suggest manual `npm start` or `python server.py` commands
- **NEVER** suggest manually killing processes

## Server Management Workflow
1. **Check Status First**: `./scripts/status-all-services.sh`
2. **Start Services**: `./scripts/start-all-services.sh`
3. **Stop Services**: `./scripts/stop-all-services.sh`
4. **Restart Services**: `./scripts/restart-all-services.sh`
5. **Monitor Logs**: `./scripts/watch-logs.sh`

## Before Suggesting Server Changes
1. Check current server status: `./scripts/status-all-services.sh`
2. Check if servers are running
3. Check server logs for errors
4. **ALWAYS** reference the existing scripts in your suggestions

## Example Server Management Response
```
🔍 Let me check the current server status first...
[Run: ./scripts/status-all-services.sh]

📊 Current Status: [running/stopped/error]
📝 Logs: [any relevant log information]

💡 Recommendation: [specific action using project scripts]
   Use: ./scripts/[start|stop|restart]-all-services.sh
```

## Common Server Issues & Solutions
- **Server won't start**: Check logs with `./scripts/watch-logs.sh`
- **Port conflicts**: Use `./scripts/stop-all-services.sh` then restart
- **Performance issues**: Monitor with `./scripts/monitor-server.py`
- **Service errors**: Check status with `./scripts/status-all-services.sh`

## Remember These Commands
- **Status**: `./scripts/status-all-services.sh`
- **Start**: `./scripts/start-all-services.sh`
- **Stop**: `./scripts/stop-all-services.sh`
- **Restart**: `./scripts/restart-all-services.sh`
- **Watch Logs**: `./scripts/watch-logs.sh`
