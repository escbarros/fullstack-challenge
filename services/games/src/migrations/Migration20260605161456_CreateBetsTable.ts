import { Migration } from '@mikro-orm/migrations';

export class Migration20260605161456_CreateBetsTable extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "bets" ("id" uuid not null, "round_id" uuid not null, "player_id" uuid not null, "amount_cents" bigint not null, "status" text check ("status" in ('pending', 'confirmed', 'cashedout', 'lost', 'cancelled')) not null default 'pending', "cashout_multiplier" numeric(10,2) null, "payout_cents" bigint null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "bets_pkey" primary key ("id"));`);
    this.addSql(`create index "bets_player_id_index" on "bets" ("player_id");`);

    this.addSql(`alter table "bets" add constraint "bets_round_id_foreign" foreign key ("round_id") references "rounds" ("id") on update cascade;`);

    this.addSql(`alter table "rounds" rename column "crash_point" to "_crash_point";`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "bets" cascade;`);

    this.addSql(`alter table "rounds" rename column "_crash_point" to "crash_point";`);
  }

}
