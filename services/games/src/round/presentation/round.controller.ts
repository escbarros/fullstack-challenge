import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";
import { ApiExtraModels } from "@nestjs/swagger";
import { GetCurrentRoundUseCase } from "../application/use-cases/get-current-round.use-case";
import { ApiResponseDto } from "../../utils/api-response.dto";
import { RoundResponseDto } from "./dto/round-response.dto";

@ApiTags("rounds")
@ApiExtraModels(RoundResponseDto)
@Controller("rounds")
export class RoundController {
  constructor(
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
  ) {}

  @ApiOperation({ summary: "Get the current active or betting round" })
  @ApiOkResponse({
    description: "Returns the current round, or null if no round is in progress",
    schema: {
      properties: {
        data: {
          nullable: true,
          oneOf: [{ $ref: getSchemaPath(RoundResponseDto) }],
        },
        meta: { type: "object", nullable: true },
        error: { type: "string", nullable: true },
      },
    },
  })
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
