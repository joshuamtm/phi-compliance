interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  action: AuditAction;
  resourceType: 'file' | 'data' | 'system';
  resourceId: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceFlags: string[];
  ipAddress?: string;
  userAgent?: string;
}

type AuditAction = 
  | 'phi_detected'
  | 'phi_redacted'
  | 'file_uploaded'
  | 'file_downloaded'
  | 'data_accessed'
  | 'data_exported'
  | 'compliance_report_generated'
  | 'system_login'
  | 'system_logout'
  | 'permission_denied'
  | 'security_violation';

interface ComplianceMetrics {
  totalEvents: number;
  phiDetections: number;
  redactions: number;
  highRiskEvents: number;
  complianceViolations: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private readonly maxEvents = 10000; // Keep last 10k events in memory
  
  constructor() {
    // In a real implementation, this would connect to a secure logging service
    this.loadPersistedEvents();
  }

  // Log a new audit event
  async log(
    userId: string,
    action: AuditAction,
    resourceType: 'file' | 'data' | 'system',
    resourceId: string,
    details: Record<string, any> = {},
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      action,
      resourceType,
      resourceId,
      details,
      riskLevel,
      complianceFlags: this.generateComplianceFlags(action, details, riskLevel),
      ipAddress: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent()
    };

    this.events.unshift(event); // Add to beginning for chronological order
    
    // Maintain size limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Persist to storage
    await this.persistEvent(event);

    // Handle high-risk events immediately
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await this.handleHighRiskEvent(event);
    }
  }

  // Log PHI detection event
  async logPHIDetection(
    userId: string,
    resourceId: string,
    phiTypes: string[],
    confidence: string,
    matchCount: number
  ): Promise<void> {
    await this.log(
      userId,
      'phi_detected',
      'data',
      resourceId,
      {
        phiTypes,
        confidence,
        matchCount,
        detectionMethod: 'automated_scan'
      },
      confidence === 'high' ? 'high' : 'medium'
    );
  }

  // Log PHI redaction event
  async logPHIRedaction(
    userId: string,
    resourceId: string,
    redactionCount: number,
    redactionMethod: string
  ): Promise<void> {
    await this.log(
      userId,
      'phi_redacted',
      'data',
      resourceId,
      {
        redactionCount,
        redactionMethod,
        timestamp: new Date().toISOString()
      },
      'medium'
    );
  }

  // Log file operations
  async logFileOperation(
    userId: string,
    action: 'file_uploaded' | 'file_downloaded',
    fileName: string,
    fileSize: number,
    fileType: string
  ): Promise<void> {
    await this.log(
      userId,
      action,
      'file',
      fileName,
      {
        fileSize,
        fileType,
        fileName
      },
      'low'
    );
  }

  // Get events with filtering
  getEvents(
    filter: {
      userId?: string;
      action?: AuditAction;
      riskLevel?: 'low' | 'medium' | 'high' | 'critical';
      dateRange?: { start: Date; end: Date };
      limit?: number;
    } = {}
  ): AuditEvent[] {
    let filteredEvents = [...this.events];

    if (filter.userId) {
      filteredEvents = filteredEvents.filter(e => e.userId === filter.userId);
    }

    if (filter.action) {
      filteredEvents = filteredEvents.filter(e => e.action === filter.action);
    }

    if (filter.riskLevel) {
      filteredEvents = filteredEvents.filter(e => e.riskLevel === filter.riskLevel);
    }

    if (filter.dateRange) {
      filteredEvents = filteredEvents.filter(e => 
        e.timestamp >= filter.dateRange!.start && 
        e.timestamp <= filter.dateRange!.end
      );
    }

    return filter.limit ? filteredEvents.slice(0, filter.limit) : filteredEvents;
  }

  // Generate compliance metrics
  getComplianceMetrics(dateRange?: { start: Date; end: Date }): ComplianceMetrics {
    const events = dateRange ? 
      this.getEvents({ dateRange }) : 
      this.events;

    const phiDetections = events.filter(e => e.action === 'phi_detected').length;
    const redactions = events.filter(e => e.action === 'phi_redacted').length;
    const highRiskEvents = events.filter(e => 
      e.riskLevel === 'high' || e.riskLevel === 'critical'
    ).length;
    
    const complianceViolations = events.filter(e => 
      e.complianceFlags.some(flag => 
        flag.includes('violation') || flag.includes('breach')
      )
    ).length;

    const timeRange = dateRange || {
      start: events.length > 0 ? events[events.length - 1].timestamp : new Date(),
      end: events.length > 0 ? events[0].timestamp : new Date()
    };

    return {
      totalEvents: events.length,
      phiDetections,
      redactions,
      highRiskEvents,
      complianceViolations,
      timeRange
    };
  }

  // Export audit log for compliance reporting
  exportAuditLog(
    format: 'json' | 'csv' = 'json',
    filter?: Parameters<typeof this.getEvents>[0]
  ): string {
    const events = this.getEvents(filter);

    if (format === 'csv') {
      const headers = [
        'ID', 'Timestamp', 'User ID', 'Action', 'Resource Type', 
        'Resource ID', 'Risk Level', 'Compliance Flags', 'IP Address'
      ];
      
      const csvRows = events.map(event => [
        event.id,
        event.timestamp.toISOString(),
        event.userId,
        event.action,
        event.resourceType,
        event.resourceId,
        event.riskLevel,
        event.complianceFlags.join(';'),
        event.ipAddress || ''
      ]);

      return [headers, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    }

    return JSON.stringify(events, null, 2);
  }

  // Search audit logs
  searchLogs(query: string, fields: (keyof AuditEvent)[] = ['action', 'resourceId']): AuditEvent[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.events.filter(event => 
      fields.some(field => {
        const value = event[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowercaseQuery);
        }
        if (Array.isArray(value)) {
          return value.some(item => 
            typeof item === 'string' && item.toLowerCase().includes(lowercaseQuery)
          );
        }
        return false;
      })
    );
  }

  private generateId(): string {
    return 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateComplianceFlags(
    action: AuditAction, 
    details: Record<string, any>, 
    riskLevel: string
  ): string[] {
    const flags: string[] = [];

    // HIPAA-related flags
    if (action === 'phi_detected') {
      flags.push('hipaa_phi_detection');
      if (riskLevel === 'high') {
        flags.push('hipaa_high_risk_phi');
      }
    }

    if (action === 'phi_redacted') {
      flags.push('hipaa_phi_redaction');
    }

    if (action === 'data_exported' && details.containsPHI) {
      flags.push('hipaa_phi_export');
    }

    // Access control flags
    if (action === 'permission_denied') {
      flags.push('access_control_violation');
    }

    // Data handling flags
    if (action === 'file_uploaded' && details.fileType && 
        ['xlsx', 'csv', 'txt'].includes(details.fileType)) {
      flags.push('structured_data_upload');
    }

    return flags;
  }

  private getCurrentIP(): string {
    // In a real implementation, this would get the actual client IP
    return '127.0.0.1';
  }

  private getCurrentUserAgent(): string {
    // In a real implementation, this would get the actual user agent
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  }

  private async persistEvent(event: AuditEvent): Promise<void> {
    // In a real implementation, this would send to a secure logging service
    // For now, we'll use localStorage as a demo
    try {
      const existingLogs = localStorage.getItem('phi_audit_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.unshift(event);
      
      // Keep only last 1000 events in localStorage
      if (logs.length > 1000) {
        logs.splice(1000);
      }
      
      localStorage.setItem('phi_audit_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to persist audit event:', error);
    }
  }

  private loadPersistedEvents(): void {
    try {
      const stored = localStorage.getItem('phi_audit_logs');
      if (stored) {
        const parsedEvents = JSON.parse(stored);
        this.events = parsedEvents.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load persisted audit events:', error);
    }
  }

  private async handleHighRiskEvent(event: AuditEvent): Promise<void> {
    // In a real implementation, this would:
    // 1. Send immediate alerts to security team
    // 2. Log to high-priority security monitoring
    // 3. Trigger automated response workflows
    console.warn('High-risk audit event detected:', event);
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

export default auditLogger;