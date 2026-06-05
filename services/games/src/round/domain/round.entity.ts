import { Entity, Enum, PrimaryKey, Property } from "@mikro-orm/core";

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
  crashPoint!: string;

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
}
