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
  readonly identityId: number;
  readonly x: number;
  readonly y: number;
  readonly returned: boolean;
  readonly deaths: number;
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

export interface FleetHit {
  readonly type: 'FleetHit';
  readonly damage: number;
  readonly integrity: number;
  readonly x: number;
  readonly shipId: number;
  readonly kind: 'stray' | 'strafe';
}

export interface FleetRepaired {
  readonly type: 'FleetRepaired';
  readonly integrity: number;
}

export interface ResurrectionShipArrived {
  readonly type: 'ResurrectionShipArrived';
  readonly x: number;
  readonly y: number;
}

export interface ResurrectionShipExposed {
  readonly type: 'ResurrectionShipExposed';
  readonly x: number;
  readonly y: number;
}

export interface ResurrectionShipDestroyed {
  readonly type: 'ResurrectionShipDestroyed';
  readonly x: number;
  readonly y: number;
}

export interface RunWon {
  readonly type: 'RunWon';
}

export interface MissileFired {
  readonly type: 'MissileFired';
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export interface SpeechStarted {
  readonly type: 'SpeechStarted';
}

export interface SpeechEnded {
  readonly type: 'SpeechEnded';
}

export interface UpgradePicked {
  readonly type: 'UpgradePicked';
  readonly cardId: string;
}

export interface UpgradeRerolled {
  readonly type: 'UpgradeRerolled';
}

export interface ViperDownloaded {
  readonly type: 'ViperDownloaded';
  readonly x: number;
  readonly y: number;
}

export interface GhostDelayed {
  readonly type: 'GhostDelayed';
  readonly identityId: number;
  readonly remainingSeconds: number;
  readonly x: number;
  readonly y: number;
}

export interface FlakIntercepted {
  readonly type: 'FlakIntercepted';
  readonly x: number;
  readonly y: number;
}

export interface RunLost {
  readonly type: 'RunLost';
}

export type DomainEvent =
  | ViperSpawned
  | ShotFired
  | RaiderSpawned
  | RaiderDestroyed
  | CyclePhaseChanged
  | ShotsCleared
  | ViperEjected
  | ViperRecovered
  | ViperDownloaded
  | GhostDelayed
  | FlakIntercepted
  | FleetHit
  | FleetRepaired
  | ResurrectionShipArrived
  | ResurrectionShipExposed
  | ResurrectionShipDestroyed
  | MissileFired
  | SpeechStarted
  | SpeechEnded
  | UpgradePicked
  | UpgradeRerolled
  | RunWon
  | RunLost;
