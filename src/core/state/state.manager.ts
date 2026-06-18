import { Injectable, Logger } from '@nestjs/common';
import {
  DriverState,
  ClientRequestState,
  RideState,
  StateTransition,
  DRIVER_TRANSITIONS,
  CLIENT_REQUEST_TRANSITIONS,
  RIDE_TRANSITIONS,
} from './state.types';

@Injectable()
export class StateManager {
  private readonly logger = new Logger(StateManager.name);

  /**
   * Validate and transition driver state
   */
  transitionDriverState(current: DriverState, target: DriverState): boolean {
    const isValid = this.isValidTransition(DRIVER_TRANSITIONS, current, target);
    if (!isValid) {
      this.logger.warn(`Invalid driver state transition: ${current} -> ${target}`);
      return false;
    }
    this.logger.log(`Driver state transition: ${current} -> ${target}`);
    return true;
  }

  /**
   * Validate and transition client request state
   */
  transitionClientRequestState(current: ClientRequestState, target: ClientRequestState): boolean {
    const isValid = this.isValidTransition(CLIENT_REQUEST_TRANSITIONS, current, target);
    if (!isValid) {
      this.logger.warn(`Invalid client request state transition: ${current} -> ${target}`);
      return false;
    }
    this.logger.log(`Client request state transition: ${current} -> ${target}`);
    return true;
  }

  /**
   * Validate and transition ride state
   */
  transitionRideState(current: RideState, target: RideState): boolean {
    const isValid = this.isValidTransition(RIDE_TRANSITIONS, current, target);
    if (!isValid) {
      this.logger.warn(`Invalid ride state transition: ${current} -> ${target}`);
      return false;
    }
    this.logger.log(`Ride state transition: ${current} -> ${target}`);
    return true;
  }

  /**
   * Get allowed transitions for a given state
   */
  getAllowedTransitions(transitions: StateTransition[], from: string): string[] {
    return transitions
      .filter(t => t.from === from && t.allowed)
      .map(t => t.to);
  }

  /**
   * Check if a transition is valid
   */
  private isValidTransition(transitions: StateTransition[], from: string, to: string): boolean {
    return transitions.some(t => t.from === from && t.to === to && t.allowed);
  }
}
