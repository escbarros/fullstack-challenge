import { Injectable } from "@nestjs/common";
import { EventEmitter } from "node:events";
import { Round } from "../../domain";

type RoundListener = (round: Round) => void;

@Injectable()
export class RoundLifecycleBus {
  private readonly emitter = new EventEmitter();

  onActivePhaseStarted(listener: RoundListener): void {
    this.emitter.on("active-phase-started", listener);
  }

  emitActivePhaseStarted(round: Round): void {
    this.emitter.emit("active-phase-started", round);
  }

  onBettingRoundCreated(listener: RoundListener): void {
    this.emitter.on("betting-round-created", listener);
  }

  emitBettingRoundCreated(round: Round): void {
    this.emitter.emit("betting-round-created", round);
  }
}
