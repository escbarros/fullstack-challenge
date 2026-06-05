import { Migration } from '@mikro-orm/migrations';

export class Migration20260605135044_CreateRoundsTable extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "rounds" ("id" uuid not null, "status" text check ("status" in ('betting', 'active', 'crashed')) not null default 'betting', "crash_point" numeric(10,2) not null, "seed_hash" varchar(255) not null, "server_seed" varchar(255) not null, "client_seed" varchar(255) not null, "betting_ends_at" timestamptz not null, "started_at" timestamptz null, "crashed_at" timestamptz null, "created_at" timestamptz not null, constraint "rounds_pkey" primary key ("id"));`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "rounds" cascade;`);
  }

}
