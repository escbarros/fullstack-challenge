import { Migration } from '@mikro-orm/migrations';

export class Migration20260607141921_CreateWalletsTable extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "wallets" ("id" uuid not null, "player_id" uuid not null, "balance_cents" bigint not null default '10000', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "wallets_pkey" primary key ("id"));`);
    this.addSql(`alter table "wallets" add constraint "wallets_player_id_unique" unique ("player_id");`);

    this.addSql(`create table "wallet_transactions" ("id" uuid not null, "wallet_id" uuid not null, "idempotency_key" varchar(255) not null, "operation" text check ("operation" in ('debit', 'credit')) not null, "amount_cents" bigint not null, "balance_before_cents" bigint not null, "balance_after_cents" bigint not null, "created_at" timestamptz not null, constraint "wallet_transactions_pkey" primary key ("id"));`);
    this.addSql(`alter table "wallet_transactions" add constraint "wallet_transactions_idempotency_key_unique" unique ("idempotency_key");`);

    this.addSql(`alter table "wallet_transactions" add constraint "wallet_transactions_wallet_id_foreign" foreign key ("wallet_id") references "wallets" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "wallet_transactions" drop constraint "wallet_transactions_wallet_id_foreign";`);

    this.addSql(`drop table if exists "wallets" cascade;`);

    this.addSql(`drop table if exists "wallet_transactions" cascade;`);
  }

}
