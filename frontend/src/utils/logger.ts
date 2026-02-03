import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  details?: any;
}

class Logger {
  private static instance: Logger;
  private logCache: LogEntry[] = [];
  private syncQueue: LogEntry[] = [];
  private isSyncing = false;
  private readonly MAX_CACHE_SIZE = 100;
  private readonly STORAGE_KEY = 'agrisarathi_logs';
  private readonly SYNC_INTERVAL = 5000; // Sync every 5 seconds if queue has items

  private constructor() {
    this.loadFromStorage();
    this.startSyncTimer();
  }

  private startSyncTimer() {
    if (Platform.OS === 'web') {
      setInterval(() => this.processSyncQueue(), this.SYNC_INTERVAL);
    }
  }

  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    const batch = [...this.syncQueue];
    this.syncQueue = [];

    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      // Batch sync if possible, or just sync critical ones
      for (const entry of batch) {
        await fetch(`${backendUrl}/api/usage`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: entry.message,
            details: JSON.stringify(entry.details || {}),
            level: entry.level,
            module: entry.module
          }) 
        }).catch(() => {
          // If individual sync fails, don't retry to avoid loops
        });
      }
    } catch (e) {
      // Silent fail
    } finally {
      this.isSyncing = false;
    }
  }

  private async loadFromStorage() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.logCache = JSON.parse(stored);
      }
    } catch (e) {
      // Ignore
    }
  }

  private async saveToStorage() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logCache));
    } catch (e) {
      // Ignore
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(entry: LogEntry): string {
    const detailsStr = entry.details ? ` | Details: ${JSON.stringify(entry.details)}` : '';
    return `[${entry.timestamp}] [${entry.level}] [${entry.module}] ${entry.message}${detailsStr}`;
  }

  private async persistLog(entry: LogEntry) {
    // In a real app, we might send this to a backend or save to local file
    // For now, we'll use console and a small in-memory cache
    this.logCache.push(entry);
    if (this.logCache.length > this.MAX_CACHE_SIZE) {
      this.logCache.shift();
    }

    // Output to console with colors
    const formatted = this.formatMessage(entry);
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }

    this.saveToStorage();

    // Try to sync to backend if it's an error or important info
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
      this.syncToBackend(entry);
    }
  }

  private async syncToBackend(entry: LogEntry) {
    // Only queue ERROR and WARN logs for backend sync
    // And skip syncing if it's a network-related error to avoid infinite loops
    if ((entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) && entry.module !== 'Network') {
      this.syncQueue.push(entry);
      // Limit queue size to avoid memory issues if backend is down for a long time
      if (this.syncQueue.length > 50) {
        this.syncQueue.shift();
      }
    }
  }

  public initGlobalErrorHandling() {
    if (Platform.OS === 'web') {
      window.onerror = (message, source, lineno, colno, error) => {
        this.error('Global', `Uncaught Error: ${message}`, { source, lineno, colno, error });
        return false;
      };

      window.onunhandledrejection = (event) => {
        this.error('Global', `Unhandled Rejection: ${event.reason}`);
      };

      // Specifically intercept network aborts if possible
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
        
        // Skip logging for noisy domains (Analytics, etc.)
        const isNoisyDomain = url.includes('google-analytics.com') || 
                            url.includes('googletagmanager.com') ||
                            url.includes('doubleclick.net');

        try {
          return await originalFetch(input, init);
        } catch (error: any) {
          const errorMessage = error.message || '';
          const isAbort = error.name === 'AbortError' || 
                         errorMessage.includes('aborted') || 
                         errorMessage.includes('net::ERR_ABORTED') ||
                         errorMessage.includes('Failed to fetch'); // Often aborted in dev

          const isDevServerNoise = url.includes('localhost:8081') || url.includes('127.0.0.1:8081');

          if (isNoisyDomain || (isAbort && isDevServerNoise)) {
            // Silently log noisy domains or dev server aborts as debug only
            this.debug('Network', `Suppressed noise: ${url}`, { error: errorMessage });
          } else if (isAbort) {
            // Downgrade other aborts to DEBUG instead of WARN/ERROR
            this.debug('Network', 'Request aborted', { url });
          } else {
            this.error('Network', 'Fetch error', { url, error: errorMessage });
          }
          throw error;
        }
      };
    }
  }

  public debug(module: string, message: string, details?: any) {
    this.persistLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      module,
      message,
      details,
    });
  }

  public info(module: string, message: string, details?: any) {
    this.persistLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      module,
      message,
      details,
    });
  }

  public warn(module: string, message: string, details?: any) {
    this.persistLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      module,
      message,
      details,
    });
  }

  public error(module: string, message: string, details?: any) {
    this.persistLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      module,
      message,
      details,
    });
  }

  public getRecentLogs(): LogEntry[] {
    return [...this.logCache];
  }

  public async clearLogs() {
    this.logCache = [];
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }

  public exportLogs(): string {
    return this.logCache.map(this.formatMessage).join('\n');
  }
}

export const logger = Logger.getInstance();
