import { StateManager } from './state.manager';
import { DriverState, ClientRequestState, RideState } from './state.types';

describe('StateManager', () => {
  let manager: StateManager;

  beforeEach(() => {
    manager = new StateManager();
  });

  describe('transitionDriverState', () => {
    it('should allow OFFLINE -> AVAILABLE', () => {
      expect(manager.transitionDriverState(DriverState.OFFLINE, DriverState.AVAILABLE)).toBe(true);
    });

    it('should allow AVAILABLE -> FULL', () => {
      expect(manager.transitionDriverState(DriverState.AVAILABLE, DriverState.FULL)).toBe(true);
    });

    it('should allow AVAILABLE -> EN_ROUTE', () => {
      expect(manager.transitionDriverState(DriverState.AVAILABLE, DriverState.EN_ROUTE)).toBe(true);
    });

    it('should allow AVAILABLE -> OFFLINE', () => {
      expect(manager.transitionDriverState(DriverState.AVAILABLE, DriverState.OFFLINE)).toBe(true);
    });

    it('should allow FULL -> AVAILABLE', () => {
      expect(manager.transitionDriverState(DriverState.FULL, DriverState.AVAILABLE)).toBe(true);
    });

    it('should allow EN_ROUTE -> AVAILABLE', () => {
      expect(manager.transitionDriverState(DriverState.EN_ROUTE, DriverState.AVAILABLE)).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(manager.transitionDriverState(DriverState.OFFLINE, DriverState.EN_ROUTE)).toBe(false);
      expect(manager.transitionDriverState(DriverState.FULL, DriverState.EN_ROUTE)).toBe(false);
    });
  });

  describe('transitionClientRequestState', () => {
    it('should allow NEW -> MATCHED', () => {
      expect(manager.transitionClientRequestState(ClientRequestState.NEW, ClientRequestState.MATCHED)).toBe(true);
    });

    it('should allow NEW -> PARTIAL_MATCH', () => {
      expect(manager.transitionClientRequestState(ClientRequestState.NEW, ClientRequestState.PARTIAL_MATCH)).toBe(true);
    });

    it('should allow NEW -> EXPIRED', () => {
      expect(manager.transitionClientRequestState(ClientRequestState.NEW, ClientRequestState.EXPIRED)).toBe(true);
    });

    it('should allow NEW -> CANCELLED', () => {
      expect(manager.transitionClientRequestState(ClientRequestState.NEW, ClientRequestState.CANCELLED)).toBe(true);
    });

    it('should allow PARTIAL_MATCH -> MATCHED', () => {
      expect(manager.transitionClientRequestState(ClientRequestState.PARTIAL_MATCH, ClientRequestState.MATCHED)).toBe(true);
    });

    it('should reject MATCHED -> NEW', () => {
      expect(manager.transitionClientRequestState(ClientRequestState.MATCHED, ClientRequestState.NEW)).toBe(false);
    });

    it('should reject EXPIRED -> NEW', () => {
      expect(manager.transitionClientRequestState(ClientRequestState.EXPIRED, ClientRequestState.NEW)).toBe(false);
    });
  });

  describe('transitionRideState', () => {
    it('should allow CREATED -> IN_PROGRESS', () => {
      expect(manager.transitionRideState(RideState.CREATED, RideState.IN_PROGRESS)).toBe(true);
    });

    it('should allow CREATED -> CANCELLED', () => {
      expect(manager.transitionRideState(RideState.CREATED, RideState.CANCELLED)).toBe(true);
    });

    it('should allow IN_PROGRESS -> COMPLETED', () => {
      expect(manager.transitionRideState(RideState.IN_PROGRESS, RideState.COMPLETED)).toBe(true);
    });

    it('should allow IN_PROGRESS -> CANCELLED', () => {
      expect(manager.transitionRideState(RideState.IN_PROGRESS, RideState.CANCELLED)).toBe(true);
    });

    it('should reject COMPLETED -> CREATED', () => {
      expect(manager.transitionRideState(RideState.COMPLETED, RideState.CREATED)).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions for OFFLINE driver', () => {
      const transitions = manager.getAllowedTransitions(
        [
          { from: DriverState.OFFLINE, to: DriverState.AVAILABLE, allowed: true },
          { from: DriverState.OFFLINE, to: DriverState.FULL, allowed: false },
        ],
        DriverState.OFFLINE,
      );

      expect(transitions).toContain(DriverState.AVAILABLE);
      expect(transitions).not.toContain(DriverState.FULL);
    });
  });
});
