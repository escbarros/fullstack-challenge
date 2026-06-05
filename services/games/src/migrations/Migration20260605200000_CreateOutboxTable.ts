import { Migration } from '@mikro-orm/migrations';

export class Migration20260605200000_CreateOutboxTable extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "outbox" ("id" uuid not null, "event_type" text check ("event_type" in ('wallet.debit', 'wallet.credit', 'bet.cancelled')) not null, "payload" jsonb not null, "status" text check ("status" in ('pending', 'sent', 'failed')) not null default 'pending', "idempotency_key" varchar(255) not null, "retry_count" int not null default 0, "created_at" timestamptz not null, "sent_at" timestamptz null, constraint "outbox_pkey" primary key ("id"));`);
    this.addSql(`create index "outbox_status_created_at_index" on "outbox" ("status", "created_at");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "outbox" cascade;`);
  }

}
