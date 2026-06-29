import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type ConfigRow = {
  configKey: string;
  configValue?: unknown;
  isLocked?: boolean | string | null;
  lastModified?: string | null;
};

@Component({
  selector: 'app-db-monitor',
  templateUrl: './db-monitor.html',
  styleUrl: './db-monitor.css',
})
export class DbMonitor implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private eventSource: EventSource | null = null;

  readonly configs = signal<ConfigRow[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isConnected = signal<boolean>(false);
  readonly statusLabel = signal<string>('Cargando...');

  ngOnInit(): void {
    this.loadInitial();
    this.openStream();
  }

  ngOnDestroy(): void {
    this.closeStream();
  }

  private loadInitial(): void {
    this.isLoading.set(true);

    this.http.get<unknown>('http://localhost:8080/api/config/all').subscribe({
      next: (payload) => {
        const rows = this.normalizeArray(payload);
        this.configs.set(rows);
        this.isLoading.set(false);
        this.isConnected.set(true);
        this.statusLabel.set(rows.length ? 'Conectado' : 'Sin datos');
      },
      error: () => {
        this.isLoading.set(false);
        this.isConnected.set(false);
        this.statusLabel.set('Sin conexión');
      },
    });
  }

  private openStream(): void {
    if (typeof EventSource === 'undefined') {
      this.statusLabel.set('SSE no soportado');
      this.isConnected.set(false);
      return;
    }

    this.closeStream();

    this.eventSource = new EventSource('http://localhost:8080/api/dashboard/stream');

    const handleIncomingEvent = (event: Event): void => {
      try {
        const payload = this.extractPayload(event);
        if (!payload) {
          return;
        }

        this.upsert(payload);
        this.isConnected.set(true);
        this.statusLabel.set('Conectado');
      } catch {
        // ignorar payload inválido
      }
    };

    this.eventSource.onmessage = handleIncomingEvent;
    this.eventSource.addEventListener('config-update', handleIncomingEvent);
    this.eventSource.addEventListener('message', handleIncomingEvent);

    this.eventSource.onopen = () => {
      this.isConnected.set(true);
      this.statusLabel.set('Conectado');
    };

    this.eventSource.onerror = () => {
      this.isConnected.set(false);
      this.statusLabel.set('Desconectado');
    };
  }

  private closeStream(): void {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }
  }

  private extractPayload(event: Event): unknown {
    const messageEvent = event as MessageEvent;
    const rawData = messageEvent.data ?? (event as { detail?: unknown }).detail;

    if (typeof rawData === 'string') {
      try {
        return JSON.parse(rawData);
      } catch {
        return rawData;
      }
    }

    return rawData;
  }

  private upsert(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const row = this.toRow(payload);

    if (!row.configKey) {
      return;
    }

    this.configs.update((current) => {
      const idx = current.findIndex((r) => r.configKey === row.configKey);
      if (idx >= 0) {
        const next = [...current];
        next[idx] = { ...next[idx], ...row };
        return next;
      }
      return [...current, row];
    });
  }

  private normalizeArray(payload: unknown): ConfigRow[] {
    if (Array.isArray(payload)) {
      return payload.map((p) => this.toRow(p));
    }

    if (payload && typeof payload === 'object') {
      const rec = payload as Record<string, unknown>;
      const list =
        (rec['items'] as unknown[]) ??
        (rec['data'] as unknown[]) ??
        (rec['configs'] as unknown[]);

      if (Array.isArray(list)) {
        return list.map((p) => this.toRow(p));
      }

      if (this.hasConfigShape(rec)) {
        return [this.toRow(rec)];
      }
    }

    return [];
  }

  private toRow(payload: unknown): ConfigRow {
    const rec = (payload ?? {}) as Record<string, unknown>;

    return {
      configKey: String(rec['configKey'] ?? rec['config_key'] ?? rec['key'] ?? ''),
      configValue: rec['configValue'] ?? rec['config_value'] ?? rec['value'],
      isLocked: this.asBooleanOrNull(rec['isLocked'] ?? rec['is_locked'] ?? rec['locked']),
      lastModified: this.asStringOrNull(rec['lastModified'] ?? rec['last_modified'] ?? rec['updatedAt'] ?? rec['timestamp']),
    };
  }

  private hasConfigShape(rec: Record<string, unknown>): boolean {
    return (
      rec['configKey'] !== undefined ||
      rec['config_key'] !== undefined ||
      rec['key'] !== undefined ||
      rec['configValue'] !== undefined ||
      rec['config_value'] !== undefined ||
      rec['value'] !== undefined ||
      rec['isLocked'] !== undefined ||
      rec['is_locked'] !== undefined ||
      rec['locked'] !== undefined
    );
  }

  private asStringOrNull(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return null;
  }

  private asBooleanOrNull(value: unknown): boolean | string | null {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
      return value;
    }

    return null;
  }

  formatValue(v: unknown): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
}