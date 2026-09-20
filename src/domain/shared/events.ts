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
  readonly owner: 'player' | 'cylon';
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

export interface CyclePhaseChanged {
  readonly type: 'CyclePhaseChanged';
  readonly phase: 'arriving' | 'building' | 'spooling' | 'jumping' | 'recovering';
  readonly cycleIndex: number;
}

export interface ShotsCleared {
  readonly type: 'ShotsCleared';
}

export interface ViperEjected {
  readonly type: 'ViperEjected';
  readonly x: number;
  readonly y: number;
}

export interface ViperRecovered {
  readonly type: 'ViperRecovered';
  readonly x: number;
  readonly y: number;
}

export type DomainEvent =
  | ViperSpawned
  | ShotFired
  | RaiderSpawned
  | RaiderDestroyed
  | CyclePhaseChanged
  | ShotsCleared
  | ViperEjected
  | ViperRecovered;
