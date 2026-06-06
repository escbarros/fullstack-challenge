import { Injectable } from "@nestjs/common";
import { Round, RoundRepository } from "../../domain";

@Injectable()
export class GetCurrentRoundUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(): Promise<Round | null> {
    return this.roundRepository.findCurrent();
  }
}
