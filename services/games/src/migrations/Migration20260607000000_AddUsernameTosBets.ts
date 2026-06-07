import { Migration } from '@mikro-orm/migrations';

export class Migration20260607000000_AddUsernameTosBets extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "bets" add column "username" varchar(255) not null default '';`);
    this.addSql(`alter table "bets" alter column "username" drop default;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "bets" drop column "username";`);
  }

}
