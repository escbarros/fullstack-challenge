import { Entity, Enum, PrimaryKey, Property } from "@mikro-orm/core";
import { InvalidTransitionError } from "./invalid-transition.error";

export enum RoundStatus {
  BETTING = "betting",
  ACTIVE = "active",
  CRASHED = "crashed",
}

@Entity({ tableName: "rounds" })
export class Round {
  @PrimaryKey({ type: "uuid" })
  id: string = crypto.randomUUID();

  @Enum({ items: () => RoundStatus, default: RoundStatus.BETTING })
  status: RoundStatus = RoundStatus.BETTING;

  @Property({ type: "decimal", precision: 10, scale: 2 })
  private _crashPoint!: string;

  get crashPoint(): string {
    return this._crashPoint;
  }

  @Property({ length: 255 })
  seedHash!: string;

  @Property({ length: 255 })
  serverSeed!: string;

  @Property({ length: 255 })
  clientSeed!: string;

  @Property()
  bettingEndsAt!: Date;

  @Property({ nullable: true })
  startedAt?: Date;

  @Property({ nullable: true })
  crashedAt?: Date;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  static create(params: {
    crashPoint: string;
    seedHash: string;
    serverSeed: string;
    clientSeed: string;
    bettingEndsAt: Date;
  }): Round {
    const round = new Round();
    round._crashPoint = params.crashPoint;
    round.seedHash = params.seedHash;
    round.serverSeed = params.serverSeed;
    round.clientSeed = params.clientSeed;
    round.bettingEndsAt = params.bettingEndsAt;
    return round;
  }

  start(): void {
    if (this.status !== RoundStatus.BETTING) {
      throw new InvalidTransitionError(this.status, RoundStatus.ACTIVE);
    }
    this.status = RoundStatus.ACTIVE;
    this.startedAt = new Date();
  }

  crash(): void {
    if (this.status !== RoundStatus.ACTIVE) {
      throw new InvalidTransitionError(this.status, RoundStatus.CRASHED);
    }
    this.status = RoundStatus.CRASHED;
    this.crashedAt = new Date();
  }

  isBettingOpen(now: Date = new Date()): boolean {
    return now < this.bettingEndsAt;
  }
}
