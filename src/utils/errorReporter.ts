/**
 * Real-time error reporter for browser console and remote logging
 * This ensures all errors are visible in the browser console immediately
 */

interface ErrorReport {
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  timestamp: string;
  url: string;
  userAgent: string;
  componentStack?: string;
}

const ERROR_ENDPOINT = '/api/v1/client-errors';
const MAX_QUEUE_SIZE = 50;
const FLUSH_INTERVAL = 5000;

let errorQueue: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let isInitialized = false;

function getComponentStack(): string | undefined {
  // Try to get React component stack if available
  if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    return undefined; // React DevTools doesn't expose component stack easily
  }
  return undefined;
}

function formatError(error: Error | Event | string): ErrorReport {
  const timestamp = new Date().toISOString();
  const url = typeof window !== 'undefined' ? window.location.href : 'unknown';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

  if (typeof error === 'string') {
    return {
      message: error,
      timestamp,
      url,
      userAgent,
      componentStack: getComponentStack(),
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      timestamp,
      url,
      userAgent,
      componentStack: getComponentStack(),
    };
  }

  // Handle ErrorEvent (from window.onerror)
  if (error instanceof Event && 'message' in error) {
    const errEvent = error as ErrorEvent;
    return {
      message: errEvent.message,
      stack: errEvent.error?.stack,
      source: errEvent.filename,
      lineno: errEvent.lineno,
      colno: errEvent.colno,
      timestamp,
      url,
      userAgent,
      componentStack: getComponentStack(),
    };
  }

  return {
    message: 'Unknown error',
    timestamp,
    url,
    userAgent,
    componentStack: getComponentStack(),
  };
}

function logToConsole(report: ErrorReport): void {
  // Always log to console immediately for real-time visibility
  const style = 'color: #6B1025; font-weight: bold; font-size: 12px;';
  console.groupCollapsed('%c[ERROR REPORTER]', style);
  console.error('Message:', report.message);
  if (report.stack) console.error('Stack:', report.stack);
  if (report.source) console.error('Source:', report.source, ':', report.lineno, ':', report.colno);
  console.error('URL:', report.url);
  console.error('Time:', report.timestamp);
  console.groupEnd();
}

async function sendToServer(reports: ErrorReport[]): Promise<void> {
  try {
    await fetch(ERROR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors: reports }),
      keepalive: true,
    });
  } catch {
    // Silently fail - we don't want to cause more errors
  }
}

function flushQueue(): void {
  if (errorQueue.length === 0) return;
  
  const toSend = [...errorQueue];
  errorQueue = [];
  
  sendToServer(toSend).catch(() => {
    // Re-queue on failure (but limit size)
    errorQueue = [...toSend, ...errorQueue].slice(-MAX_QUEUE_SIZE);
  });
}

function queueError(report: ErrorReport): void {
  errorQueue.push(report);
  
  // Limit queue size
  if (errorQueue.length > MAX_QUEUE_SIZE) {
    errorQueue = errorQueue.slice(-MAX_QUEUE_SIZE);
  }
  
  // Schedule flush
  if (!flushTimer) {
    flushTimer = setInterval(flushQueue, FLUSH_INTERVAL);
  }
}

export function initErrorReporter(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const report = formatError(event.reason instanceof Error ? event.reason : String(event.reason));
    report.message = `Unhandled Promise Rejection: ${report.message}`;
    logToConsole(report);
    queueError(report);
  });

  // Capture global errors
  window.addEventListener('error', (event) => {
    const report = formatError(event);
    logToConsole(report);
    queueError(report);
  });

  // Capture React errors via console.error override
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalConsoleError(...args);
    
    // Check if this looks like a React error
    const errorArg = args.find(arg => arg instanceof Error);
    if (errorArg) {
      const report = formatError(errorArg);
      report.message = `Console Error: ${report.message}`;
      queueError(report);
    } else if (args.length > 0) {
      const message = args.map(String).join(' ');
      const report = formatError(message);
      report.message = `Console Error: ${report.message}`;
      queueError(report);
    }
  };

  // Periodic flush on page unload
  window.addEventListener('beforeunload', () => {
    flushQueue();
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  });

  console.log('%c[ERROR REPORTER] Initialized - all errors will appear in console', 'color: #8b7340; font-weight: bold;');
}

export function reportError(error: Error | string, context?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  
  const report = formatError(error);
  if (context) {
    report.message += ` | Context: ${JSON.stringify(context)}`;
  }
  logToConsole(report);
  queueError(report);
}

export function reportWarning(message: string, context?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  
  const style = 'color: #8b7340; font-weight: bold; font-size: 11px;';
  console.warn('%c[WARNING]', style, message, context || '');
}

export function reportInfo(message: string, context?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  
  const style = 'color: #264D3A; font-weight: bold; font-size: 11px;';
  console.info('%c[INFO]', style, message, context || '');
}