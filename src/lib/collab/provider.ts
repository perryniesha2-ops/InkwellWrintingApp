import * as Y from "yjs";
import {
  Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates,
} from "y-protocols/awareness";

/**
 * Live collaboration for one chapter: a Yjs document kept in sync between
 * browsers over a broadcast channel, and saved to the database as an
 * append-only log of updates (compacted into a snapshot as it grows).
 *
 * Every local change is broadcast immediately and persisted within
 * FLUSH_DELAY_MS, so work is saved to the cloud almost keystroke by keystroke.
 */

export interface StoredUpdate { id: number; update: string }

export interface CollabStore {
  load(): Promise<{ snapshot: string | null; upto: number; seeded: boolean; updates: StoredUpdate[] }>;
  loadSince(afterId: number): Promise<StoredUpdate[]>;
  append(update: string): Promise<number>;
  /** Atomically claim the right to seed the doc from legacy HTML. */
  claimSeed(): Promise<boolean>;
  /**
   * Highest update id ≤ maxId that is old enough to be safely compacted.
   * (Sequence ids are assigned before commit, so a very recent lower id could
   * still become visible later; settled ids can't.)
   */
  settledUpto(maxId: number): Promise<number>;
  /**
   * Replace the snapshot if nobody compacted since `prevUpto`, dropping the
   * merged updates. Resolves to the snapshot's `upto` afterwards (ours if we
   * won, the other compactor's otherwise).
   */
  compact(snapshot: string, upto: number, prevUpto: number): Promise<number>;
}

export type Message =
  | { event: "update"; payload: { u: string } }
  | { event: "sync-req"; payload: { from: number; sv: string } }
  | { event: "sync-res"; payload: { to: number; u: string } }
  | { event: "awareness"; payload: { u: string } };

export const MESSAGE_EVENTS = ["update", "sync-req", "sync-res", "awareness"] as const;

export interface CollabTransport {
  /** Subscribe; `onStatus(true)` each time the channel is (re)connected. */
  connect(onMessage: (msg: Message) => void, onStatus: (connected: boolean) => void): void;
  send(msg: Message): void;
  disconnect(): void;
}

export type ConnectionStatus = "connecting" | "online" | "offline";

const FLUSH_DELAY_MS = 400;
const FLUSH_MAX_WAIT_MS = 2000;
const RETRY_DELAY_MS = 3000;
const CATCH_UP_INTERVAL_MS = 30_000;
/** Compact once this many updates sit on top of the snapshot. */
const COMPACT_AFTER = 300;
/** Minimum gap between compaction attempts (recent updates must settle first). */
const COMPACT_RETRY_MS = 30_000;
/** Skip broadcasting very large payloads; peers get them from the database. */
const MAX_BROADCAST_BYTES = 200_000;

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function fromBase64(s: string): Uint8Array {
  const binary = atob(s);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export class ChapterCollabProvider {
  readonly awareness: Awareness;
  /** Resolves once the stored state has been loaded into the doc. */
  readonly synced: Promise<{ seeded: boolean }>;
  status: ConnectionStatus = "connecting";
  /** True while local changes are waiting to be saved. */
  get hasPendingChanges() { return this.pending.length > 0 || this.flushing; }

  private lastSeenId = 0;
  private snapshotUpto = 0;
  private sinceSnapshot = 0;
  private pending: Uint8Array[] = [];
  private flushing = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private firstPendingAt = 0;
  private catchUpTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private resolveSynced!: (v: { seeded: boolean }) => void;
  private listeners = new Set<(s: ConnectionStatus) => void>();

  constructor(
    readonly doc: Y.Doc,
    private readonly transport: CollabTransport,
    private readonly store: CollabStore,
  ) {
    this.awareness = new Awareness(doc);
    this.synced = new Promise((resolve) => { this.resolveSynced = resolve; });
    doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);
  }

  onStatus(cb: (s: ConnectionStatus) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async start() {
    const state = await this.store.load();
    if (this.destroyed) return;
    this.snapshotUpto = state.upto;
    this.lastSeenId = state.upto;
    Y.transact(this.doc, () => {
      if (state.snapshot) Y.applyUpdate(this.doc, fromBase64(state.snapshot), this);
      this.applyStored(state.updates);
    }, this);
    this.sinceSnapshot = state.updates.length;
    this.resolveSynced({ seeded: state.seeded });
    void this.maybeCompact();

    this.transport.connect(this.onMessage, (connected) => {
      this.setStatus(connected ? "online" : "offline");
      if (!connected) return;
      // Ask peers for anything we're missing, announce ourselves, and pick up
      // anything saved while we were disconnected.
      this.transport.send({ event: "sync-req", payload: { from: this.doc.clientID, sv: toBase64(Y.encodeStateVector(this.doc)) } });
      this.broadcastAwareness([this.doc.clientID]);
      void this.catchUp();
    });
    this.catchUpTimer = setInterval(() => void this.catchUp(), CATCH_UP_INTERVAL_MS);
  }

  /** Persist anything pending now (e.g. before switching chapters). */
  async flush(): Promise<void> {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    if (this.flushing || this.pending.length === 0) return;
    this.flushing = true;
    const batch = this.pending;
    this.pending = [];
    try {
      await this.store.append(toBase64(Y.mergeUpdates(batch)));
      this.sinceSnapshot++;
      void this.maybeCompact();
    } catch {
      // Keep the changes and retry; they're already applied locally.
      this.pending = [...batch, ...this.pending];
      if (!this.destroyed) this.flushTimer = setTimeout(() => void this.flush(), RETRY_DELAY_MS);
    } finally {
      this.flushing = false;
    }
    if (this.pending.length && !this.flushTimer && !this.destroyed) this.scheduleFlush();
  }

  claimSeed() { return this.store.claimSeed(); }

  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.catchUpTimer) clearInterval(this.catchUpTimer);
    removeAwarenessStates(this.awareness, [this.doc.clientID], "destroy");
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    await this.flush();
    this.transport.disconnect();
    this.awareness.destroy();
    this.listeners.clear();
  }

  // ── internals ────────────────────────────────────────────────────────────

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.listeners.forEach((cb) => cb(s));
  }

  private applyStored(updates: StoredUpdate[]) {
    for (const u of updates) {
      Y.applyUpdate(this.doc, fromBase64(u.update), this);
      this.lastSeenId = Math.max(this.lastSeenId, u.id);
    }
  }

  private async catchUp() {
    if (this.destroyed) return;
    try {
      const updates = await this.store.loadSince(this.lastSeenId);
      if (updates.length) Y.transact(this.doc, () => this.applyStored(updates), this);
    } catch { /* next interval retries */ }
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return; // came from the database or a peer
    if (update.length <= MAX_BROADCAST_BYTES) {
      this.transport.send({ event: "update", payload: { u: toBase64(update) } });
    }
    this.pending.push(update);
    this.scheduleFlush();
  };

  private scheduleFlush() {
    if (!this.firstPendingAt || !this.flushTimer) this.firstPendingAt = Date.now();
    if (this.flushTimer) clearTimeout(this.flushTimer);
    const waited = Date.now() - this.firstPendingAt;
    this.flushTimer = setTimeout(() => void this.flush(), Math.max(0, Math.min(FLUSH_DELAY_MS, FLUSH_MAX_WAIT_MS - waited)));
  }

  private onMessage = (msg: Message) => {
    if (this.destroyed) return;
    switch (msg.event) {
      case "update":
        Y.applyUpdate(this.doc, fromBase64(msg.payload.u), this);
        break;
      case "sync-req": {
        const diff = Y.encodeStateAsUpdate(this.doc, fromBase64(msg.payload.sv));
        // An empty diff is 2 bytes; only reply when we have something to add.
        if (diff.length > 2 && diff.length <= MAX_BROADCAST_BYTES) {
          this.transport.send({ event: "sync-res", payload: { to: msg.payload.from, u: toBase64(diff) } });
        }
        this.broadcastAwareness([this.doc.clientID]);
        break;
      }
      case "sync-res":
        if (msg.payload.to === this.doc.clientID) Y.applyUpdate(this.doc, fromBase64(msg.payload.u), this);
        break;
      case "awareness":
        applyAwarenessUpdate(this.awareness, fromBase64(msg.payload.u), this);
        break;
    }
  };

  private onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this) return;
    this.broadcastAwareness([...added, ...updated, ...removed]);
  };

  private broadcastAwareness(clients: number[]) {
    if (!clients.length) return;
    this.transport.send({ event: "awareness", payload: { u: toBase64(encodeAwarenessUpdate(this.awareness, clients)) } });
  }

  private compacting = false;
  private lastCompactAt = 0;

  private async maybeCompact() {
    if (this.sinceSnapshot < COMPACT_AFTER || this.compacting || this.destroyed) return;
    if (Date.now() - this.lastCompactAt < COMPACT_RETRY_MS) return;
    this.compacting = true;
    this.lastCompactAt = Date.now();
    try {
      // The doc holds everything we've seen, so its full state covers every
      // stored update up to `upto` (plus extras, which re-apply harmlessly).
      await this.catchUp();
      const upto = await this.store.settledUpto(this.lastSeenId);
      if (upto <= this.snapshotUpto) return;
      this.snapshotUpto = await this.store.compact(toBase64(Y.encodeStateAsUpdate(this.doc)), upto, this.snapshotUpto);
      // Unsettled updates may remain; keep counting so we come back for them.
      if (this.snapshotUpto >= this.lastSeenId) this.sinceSnapshot = 0;
    } catch {
      /* retried after the next flush */
    } finally {
      this.compacting = false;
    }
  }
}
