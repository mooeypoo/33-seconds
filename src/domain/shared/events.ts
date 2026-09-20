/**
 * Facts that already happened, emitted by `tick` and consumed by presenters and (later) banter
 * (ADR-0001 D6). The domain does not know who listens.
 */
export interface ViperSpawned {
  readonly type: 'ViperSpawned';
  readonly x: number;
  readonly y: number;
}

export interface ShotFired {
  readonly type: 'ShotFired';
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export interface RaiderSpawned {
  readonly type: 'RaiderSpawned';
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export interface RaiderDestroyed {
  readonly type: 'RaiderDestroyed';
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export type DomainEvent = ViperSpawned | ShotFired | RaiderSpawned | RaiderDestroyed;
