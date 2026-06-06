import { Controller, Get } from "@nestjs/common";
import { GetCurrentRoundUseCase } from "../application/use-cases/get-current-round.use-case";
import { ApiResponseDto } from "../../common/api-response.dto";
import { RoundResponseDto } from "./dto/round-response.dto";

@Controller("rounds")
export class RoundController {
  constructor(
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
  ) {}

  @Get("current")
  async getCurrent(): Promise<ApiResponseDto<RoundResponseDto | null>> {
    const round = await this.getCurrentRoundUseCase.execute();

    if (!round) {
      return ApiResponseDto.ok(null);
    }

    const data: RoundResponseDto = {
      id: round.id,
      status: round.status,
      seedHash: round.seedHash,
      bettingEndsAt: round.bettingEndsAt.toISOString(),
      startedAt: round.startedAt?.toISOString() ?? null,
      crashedAt: round.crashedAt?.toISOString() ?? null,
      bets: [],
    };

    return ApiResponseDto.ok(data);
  }
}
