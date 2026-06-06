import { Injectable } from "@nestjs/common";
import { Round, RoundRepository } from "../../domain";

export interface RoundHistoryResult {
  items: Round[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class GetRoundHistoryUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(page: number, limit: number): Promise<RoundHistoryResult> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const { items, total } = await this.roundRepository.findHistory(safeLimit, offset);

    return { items, total, page: safePage, limit: safeLimit };
  }
}
