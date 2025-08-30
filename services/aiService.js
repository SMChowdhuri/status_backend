const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateIncidentSummary(incidentData, statusLogs) {
    try {
      const prompt = this.createIncidentSummaryPrompt(incidentData, statusLogs);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw new Error('Failed to generate AI summary');
    }
  }

  createIncidentSummaryPrompt(incident, statusLogs) {
    const logsData = statusLogs.map(log => ({
      status: log.status,
      latency: log.latency,
      timestamp: log.timestamp
    }));

    return `
You are an expert system administrator analyzing a service incident. Please provide a comprehensive incident summary based on the following data:

**Incident Details:**
- Service: ${incident.service?.name || 'Unknown Service'}
- Title: ${incident.title}
- Description: ${incident.description}
- Severity: ${incident.severity}
- Start Time: ${incident.startTime}
- End Time: ${incident.endTime || 'Ongoing'}
- Current Status: ${incident.status}

**Service Status Logs (${statusLogs.length} entries):**
${logsData.map((log, index) => 
  `${index + 1}. ${log.timestamp}: Status=${log.status}, Latency=${log.latency}ms`
).join('\n')}

**Analysis Requirements:**
1. **Root Cause Analysis**: Analyze the pattern of status changes and latency spikes
2. **Impact Assessment**: Evaluate the severity and duration of the incident
3. **Timeline**: Provide a clear timeline of events
4. **Recommendations**: Suggest preventive measures and immediate actions

Please provide a structured summary in the following format:

## Incident Summary

### Overview
[Brief description of what happened]

### Timeline
[Key events with timestamps]

### Impact Analysis
[Affected services, downtime duration, performance degradation]

### Root Cause Analysis
[Likely causes based on the data patterns]

### Recommendations
[Preventive measures and immediate actions]

### Technical Details
[Any patterns observed in latency or status changes]

Keep the summary concise but comprehensive, focusing on actionable insights.
    `;
  }

  async generateServiceHealthSummary(service, recentLogs) {
    try {
      const prompt = this.createServiceHealthPrompt(service, recentLogs);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating service health summary:', error);
      throw new Error('Failed to generate service health summary');
    }
  }

  createServiceHealthPrompt(service, logs) {
    const upCount = logs.filter(log => log.status === 'UP').length;
    const downCount = logs.filter(log => log.status === 'DOWN').length;
    const avgLatency = logs.reduce((sum, log) => sum + (log.latency || 0), 0) / logs.length;

    return `
Analyze the health of the following service based on recent monitoring data:

**Service Information:**
- Name: ${service.name}
- URL: ${service.url}
- Current Status: ${service.status}
- Last Checked: ${service.lastChecked}

**Recent Performance Data (${logs.length} data points):**
- UP status count: ${upCount}
- DOWN status count: ${downCount}
- Average latency: ${avgLatency.toFixed(2)}ms
- Uptime percentage: ${((upCount / logs.length) * 100).toFixed(2)}%

**Recent Status Changes:**
${logs.slice(0, 10).map((log, index) => 
  `${index + 1}. ${log.timestamp}: ${log.status} (${log.latency}ms)`
).join('\n')}

Please provide a health assessment covering:
1. Overall service reliability
2. Performance trends
3. Any concerning patterns
4. Recommendations for improvement

Keep the analysis concise and actionable.
    `;
  }
}

module.exports = new AIService();
