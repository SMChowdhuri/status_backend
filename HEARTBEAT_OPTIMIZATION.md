# Heartbeat and Database Optimization Updates

## 🚀 Recent Changes

### 1. Heartbeat Frequency Update
- **Changed from**: Every 1 minute
- **Changed to**: Every 5 minutes (300 seconds)
- **Reason**: Reduces database load and API calls while maintaining adequate monitoring

### 2. Automatic Status Logs Cleanup
- **Feature**: Automatic deletion of status logs older than 7 days
- **Schedule**: Runs daily at midnight (00:00)
- **Benefit**: Prevents database bloat and optimizes storage usage

## 📊 New Features

### Automatic Cleanup
- **Schedule**: `0 0 * * *` (daily at midnight)
- **Retention**: 7 days of status logs
- **Logging**: Cleanup results are logged to console
- **WebSocket**: Cleanup events are emitted for monitoring

### Manual Cleanup API
- **Endpoint**: `POST /api/admin/cleanup-logs`
- **Purpose**: Manual trigger for status logs cleanup
- **Authentication**: Admin only
- **Response**: Returns deletion count and statistics

### Database Statistics Script
- **File**: `database-stats.js`
- **Purpose**: Analyze database usage and test cleanup
- **Usage**: 
  ```bash
  node database-stats.js                    # Show stats only
  node database-stats.js --add-test-data   # Add old test data
  node database-stats.js --cleanup         # Run cleanup
  ```

## 🔧 Configuration

### Heartbeat Settings
```javascript
// Current configuration in cron/heartbeat.js
cron.schedule('*/5 * * * *', async () => {
  // Runs every 5 minutes
});

cron.schedule('0 0 * * *', async () => {
  // Cleanup runs daily at midnight
});
```

### Cleanup Settings
```javascript
// Current retention period
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

// To modify retention period, change the multiplier:
// 1 day:  1 * 24 * 60 * 60 * 1000
// 7 days: 7 * 24 * 60 * 60 * 1000
// 30 days: 30 * 24 * 60 * 60 * 1000
```

## 📈 Performance Impact

### Before Optimization
- Heartbeat: Every 1 minute = 1440 checks/day per service
- Storage: Unlimited log retention
- Database growth: Linear increase over time

### After Optimization
- Heartbeat: Every 5 minutes = 288 checks/day per service (80% reduction)
- Storage: 7-day rolling window
- Database growth: Stabilized after 7 days

### Storage Calculation Example
```
For 5 services with 5-minute heartbeat:
- Daily logs: 5 services × 288 checks = 1,440 logs/day
- 7-day retention: 1,440 × 7 = 10,080 logs maximum
- Estimated storage: ~1.5 MB (assuming 150 bytes per log)
```

## 🛠 API Usage

### Manual Cleanup
```bash
# Trigger manual cleanup
curl -X POST http://localhost:5000/api/admin/cleanup-logs \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response:
{
  "message": "Status logs cleanup completed successfully",
  "deletedCount": 1250,
  "cutoffDate": "2024-01-15T00:00:00.000Z"
}
```

### WebSocket Events
```javascript
// Listen for cleanup events
socket.on('statusLogsCleanup', (data) => {
  console.log(`Cleanup completed: ${data.deletedCount} logs deleted`);
  console.log(`Cutoff date: ${data.cutoffDate}`);
});

// Listen for heartbeat events (unchanged)
socket.on('serviceStatusUpdate', (serviceData) => {
  // Handle service status updates
});
```

## 🔍 Monitoring

### Console Logs
```
🚀 Heartbeat monitoring started (every 5 minutes)
🧹 Status logs cleanup scheduled (daily at midnight)
Running heartbeat check...
Running status logs cleanup...
✅ Cleanup completed: Deleted 1250 old status logs
```

### Database Statistics
Use the database statistics script to monitor your database usage:

```bash
# Check current database statistics
node database-stats.js

# Example output:
📊 Total Status Logs: 5230
📈 Status Logs Distribution:
  Last 24 hours: 288
  Last 3 days: 864
  Last 7 days: 2016
  Older than 7 days: 3214 (will be cleaned up)

💾 Storage Estimates:
  Total logs storage: ~765.23 KB
  Storage to be cleaned: ~470.05 KB
```

## ⚙️ Customization

### Modify Heartbeat Frequency
To change heartbeat frequency, edit `cron/heartbeat.js`:

```javascript
// Every 1 minute
cron.schedule('* * * * *', async () => {

// Every 5 minutes (current)
cron.schedule('*/5 * * * *', async () => {

// Every 10 minutes
cron.schedule('*/10 * * * *', async () => {

// Every hour
cron.schedule('0 * * * *', async () => {
```

### Modify Retention Period
To change log retention period, edit the cleanup function:

```javascript
// 3 days retention
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

// 7 days retention (current)
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

// 30 days retention
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
```

### Modify Cleanup Schedule
To change cleanup schedule, edit the cron pattern:

```javascript
// Daily at midnight (current)
cron.schedule('0 0 * * *', async () => {

// Every 12 hours
cron.schedule('0 */12 * * *', async () => {

// Weekly on Sunday at 2 AM
cron.schedule('0 2 * * 0', async () => {
```

## 🚨 Important Notes

1. **Backup Before Cleanup**: Consider backing up your database before running cleanup operations
2. **Monitor Performance**: Watch for any performance changes after implementing 5-minute heartbeat
3. **Adjust as Needed**: You can modify the retention period based on your specific monitoring needs
4. **Admin Access**: Manual cleanup requires admin authentication

## 📋 Maintenance Tasks

### Daily
- Automatic cleanup runs at midnight
- Monitor cleanup logs for any errors

### Weekly
- Run database statistics script to check growth trends
- Review service performance metrics

### Monthly
- Analyze heartbeat frequency effectiveness
- Consider adjusting retention period based on usage patterns

This optimization should significantly improve your database performance and storage efficiency! 🎉
