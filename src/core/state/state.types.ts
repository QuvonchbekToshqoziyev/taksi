export enum DriverState {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  FULL = 'FULL',
  EN_ROUTE = 'EN_ROUTE',
}

export enum ClientRequestState {
  NEW = 'NEW',
  PARTIAL_MATCH = 'PARTIAL_MATCH',
  MATCHED = 'MATCHED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum RideState {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface StateTransition {
  from: string;
  to: string;
  allowed: boolean;
}

export const DRIVER_TRANSITIONS: StateTransition[] = [
  { from: DriverState.OFFLINE, to: DriverState.AVAILABLE, allowed: true },
  { from: DriverState.AVAILABLE, to: DriverState.FULL, allowed: true },
  { from: DriverState.AVAILABLE, to: DriverState.EN_ROUTE, allowed: true },
  { from: DriverState.AVAILABLE, to: DriverState.OFFLINE, allowed: true },
  { from: DriverState.FULL, to: DriverState.AVAILABLE, allowed: true },
  { from: DriverState.FULL, to: DriverState.OFFLINE, allowed: true },
  { from: DriverState.EN_ROUTE, to: DriverState.AVAILABLE, allowed: true },
  { from: DriverState.EN_ROUTE, to: DriverState.OFFLINE, allowed: true },
];

export const CLIENT_REQUEST_TRANSITIONS: StateTransition[] = [
  { from: ClientRequestState.NEW, to: ClientRequestState.PARTIAL_MATCH, allowed: true },
  { from: ClientRequestState.NEW, to: ClientRequestState.MATCHED, allowed: true },
  { from: ClientRequestState.NEW, to: ClientRequestState.EXPIRED, allowed: true },
  { from: ClientRequestState.NEW, to: ClientRequestState.CANCELLED, allowed: true },
  { from: ClientRequestState.PARTIAL_MATCH, to: ClientRequestState.MATCHED, allowed: true },
  { from: ClientRequestState.PARTIAL_MATCH, to: ClientRequestState.EXPIRED, allowed: true },
  { from: ClientRequestState.PARTIAL_MATCH, to: ClientRequestState.CANCELLED, allowed: true },
  { from: ClientRequestState.MATCHED, to: ClientRequestState.EXPIRED, allowed: true },
  { from: ClientRequestState.MATCHED, to: ClientRequestState.CANCELLED, allowed: true },
];

export const RIDE_TRANSITIONS: StateTransition[] = [
  { from: RideState.CREATED, to: RideState.IN_PROGRESS, allowed: true },
  { from: RideState.CREATED, to: RideState.CANCELLED, allowed: true },
  { from: RideState.IN_PROGRESS, to: RideState.COMPLETED, allowed: true },
  { from: RideState.IN_PROGRESS, to: RideState.CANCELLED, allowed: true },
];
