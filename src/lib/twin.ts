/**
 * Digital twin data layer. A `TwinSource` pushes machine snapshots; the page does not care
 * whether they come from the built-in simulator or a real plant feed over WebSocket.
 *
 * Real feed message format (JSON, one message per update):
 *   { "machines": [ { "id": "cnc-1", "status": "running", "temperature": 61.2,
 *                     "throughput": 42, "vibration": 2.1 } ] }
 * `status` is one of: running | idle | warning | fault. Unknown ids are ignored.
 */
export type MachineStatus = 'running' | 'idle' | 'warning' | 'fault';
/** Status colours (always shown with an icon and a label, never on their own). */
export const STATUS_COLOR: Record<MachineStatus, string> = {
  running: '#0ca30c',
  idle: '#94a3b8',
  warning: '#fab219',
  fault: '#d03b3b',
};
export type MachineKind = 'cnc' | 'robot' | 'press' | 'qc' | 'pack';

export interface MachineSpec {
  id: string;
  kind: MachineKind;
  /** Display code shown on the floor, e.g. "CNC-01". */
  code: string;
  /** Position on the factory floor in metres (x, z). */
  position: [number, number];
  /** Temperature at which a warning is raised (°C). */
  tempWarn: number;
  /** Nominal output in units per minute. */
  nominalRate: number;
}

export interface MachineReading {
  id: string;
  status: MachineStatus;
  temperature: number;
  throughput: number;
  vibration: number;
}

export interface TwinSnapshot {
  time: number;
  machines: MachineReading[];
}

export type SourceState = { kind: 'simulated' } | { kind: 'live'; connected: boolean; url: string };

export interface TwinSource {
  readonly state: SourceState;
  subscribe(onSnapshot: (s: TwinSnapshot) => void, onState?: (s: SourceState) => void): () => void;
  /** Clears a fault (simulator only; a live plant would expose its own command). */
  reset(id: string): void;
  /** Makes a machine fault, to demonstrate alarms (simulator only). */
  injectFault?(id: string): void;
}

export const MACHINES: MachineSpec[] = [
  { id: 'cnc-1', kind: 'cnc', code: 'CNC-01', position: [-6, -2.2], tempWarn: 75, nominalRate: 18 },
  { id: 'cnc-2', kind: 'cnc', code: 'CNC-02', position: [-6, 2.2], tempWarn: 75, nominalRate: 18 },
  { id: 'robot-1', kind: 'robot', code: 'RBT-01', position: [-2.6, 0.9], tempWarn: 60, nominalRate: 36 },
  { id: 'press-1', kind: 'press', code: 'PRS-01', position: [0.8, -1.4], tempWarn: 85, nominalRate: 36 },
  { id: 'qc-1', kind: 'qc', code: 'QC-01', position: [3.8, 0], tempWarn: 55, nominalRate: 36 },
  { id: 'pack-1', kind: 'pack', code: 'PCK-01', position: [6.6, -1.2], tempWarn: 60, nominalRate: 34 },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Plausible-looking plant behaviour: drift, occasional overheating, rare faults that need a reset. */
export class SimulatedSource implements TwinSource {
  readonly state: SourceState = { kind: 'simulated' };
  private machines = new Map<string, MachineReading & { faultTimer: number; idleTimer: number }>();
  private listeners = new Set<(s: TwinSnapshot) => void>();
  private timer: number | undefined;

  constructor(private intervalMs = 1000) {
    for (const m of MACHINES) {
      this.machines.set(m.id, {
        id: m.id,
        status: 'running',
        temperature: m.tempWarn - 18 + Math.random() * 6,
        throughput: m.nominalRate,
        vibration: 1.5 + Math.random(),
        faultTimer: 0,
        idleTimer: 0,
      });
    }
    // Start with one machine running hot so the demo has something to look at.
    const press = this.machines.get('press-1')!;
    press.temperature = 82;
  }

  private step() {
    const byId = new Map(MACHINES.map((m) => [m.id, m]));
    for (const r of this.machines.values()) {
      const spec = byId.get(r.id)!;
      if (r.status === 'fault') {
        r.faultTimer++;
        r.temperature += (spec.tempWarn - 25 - r.temperature) * 0.05;
        r.throughput = 0;
        r.vibration = 0;
        // Faults clear on their own after a while if nobody resets them.
        if (r.faultTimer > 45) this.reset(r.id);
        continue;
      }
      if (r.status === 'idle') {
        r.idleTimer--;
        r.temperature += (spec.tempWarn - 30 - r.temperature) * 0.05;
        r.throughput = 0;
        r.vibration = 0.2;
        if (r.idleTimer <= 0) r.status = 'running';
        continue;
      }
      // Running / warning: temperature random-walks, with a slow pull toward normal.
      const normal = spec.tempWarn - 14;
      r.temperature = clamp(r.temperature + (Math.random() - 0.46) * 1.6 + (normal - r.temperature) * 0.015, 20, spec.tempWarn + 25);
      r.vibration = clamp(r.vibration + (Math.random() - 0.5) * 0.3, 0.8, 6);
      const hot = r.temperature >= spec.tempWarn;
      r.status = hot ? 'warning' : 'running';
      r.throughput = Math.max(0, Math.round(spec.nominalRate * (hot ? 0.75 : 0.92 + Math.random() * 0.12)));
      if (r.temperature > spec.tempWarn + 10 && Math.random() < 0.25) {
        r.status = 'fault';
        r.faultTimer = 0;
      } else if (Math.random() < 0.004) {
        r.status = 'idle'; // material change-over
        r.idleTimer = 6 + Math.round(Math.random() * 6);
      }
    }
    const snapshot: TwinSnapshot = {
      time: Date.now(),
      machines: [...this.machines.values()].map(({ id, status, temperature, throughput, vibration }) => ({
        id,
        status,
        temperature: Math.round(temperature * 10) / 10,
        throughput,
        vibration: Math.round(vibration * 10) / 10,
      })),
    };
    this.listeners.forEach((l) => l(snapshot));
  }

  subscribe(onSnapshot: (s: TwinSnapshot) => void) {
    this.listeners.add(onSnapshot);
    if (this.timer === undefined) {
      this.step();
      this.timer = window.setInterval(() => this.step(), this.intervalMs);
    }
    return () => {
      this.listeners.delete(onSnapshot);
      if (this.listeners.size === 0 && this.timer !== undefined) {
        window.clearInterval(this.timer);
        this.timer = undefined;
      }
    };
  }

  injectFault(id: string) {
    const r = this.machines.get(id);
    if (!r) return;
    r.status = 'fault';
    r.faultTimer = 0;
    this.step();
  }

  reset(id: string) {
    const r = this.machines.get(id);
    const spec = MACHINES.find((m) => m.id === id);
    if (!r || !spec) return;
    r.status = 'running';
    r.faultTimer = 0;
    r.temperature = spec.tempWarn - 16;
  }
}

/** Connects to a real plant gateway (e.g. an MQTT→WebSocket bridge) and reconnects with backoff. */
export class WebSocketSource implements TwinSource {
  state: SourceState;
  constructor(private url: string) {
    this.state = { kind: 'live', connected: false, url };
  }

  subscribe(onSnapshot: (s: TwinSnapshot) => void, onState?: (s: SourceState) => void) {
    let ws: WebSocket | null = null;
    let retry = 1000;
    let closed = false;
    let timer: number | undefined;
    const known = new Set(MACHINES.map((m) => m.id));
    const statuses = new Set<MachineStatus>(['running', 'idle', 'warning', 'fault']);

    const setConnected = (connected: boolean) => {
      this.state = { kind: 'live', connected, url: this.url };
      onState?.(this.state);
    };

    const connect = () => {
      ws = new WebSocket(this.url);
      ws.onopen = () => {
        retry = 1000;
        setConnected(true);
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(String(e.data)) as { machines?: Partial<MachineReading>[] };
          const machines = (data.machines ?? [])
            .filter((m): m is MachineReading => typeof m.id === 'string' && known.has(m.id) && statuses.has(m.status as MachineStatus))
            .map((m) => ({
              id: m.id,
              status: m.status,
              temperature: Number(m.temperature) || 0,
              throughput: Number(m.throughput) || 0,
              vibration: Number(m.vibration) || 0,
            }));
          if (machines.length) onSnapshot({ time: Date.now(), machines });
        } catch {
          // Ignore malformed messages rather than breaking the view.
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) timer = window.setTimeout(connect, (retry = Math.min(retry * 2, 30000)));
      };
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(timer);
      ws?.close();
    };
  }

  reset() {
    // Resetting real equipment must go through the plant's own control system.
  }
}

export function createTwinSource(): TwinSource {
  const url = (import.meta.env.VITE_TWIN_WS_URL ?? '').trim();
  return /^wss?:\/\//i.test(url) ? new WebSocketSource(url) : new SimulatedSource();
}
