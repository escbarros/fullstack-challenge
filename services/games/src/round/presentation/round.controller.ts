import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiExtraModels,
  getSchemaPath,
} from "@nestjs/swagger";
import { GetCurrentRoundUseCase } from "../application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "../application/use-cases/get-round-history.use-case";
import { VerifyRoundUseCase } from "../application/use-cases/verify-round.use-case";
import { ApiResponseDto, PaginationMeta } from "../../utils/api-response.dto";
import { RoundResponseDto } from "./dto/round-response.dto";
import { RoundHistoryItemDto } from "./dto/round-history-item.dto";
import { RoundVerifyResponseDto } from "./dto/round-verify-response.dto";

@ApiTags("rounds")
@ApiExtraModels(RoundResponseDto, RoundHistoryItemDto, RoundVerifyResponseDto, PaginationMeta)
@Controller("rounds")
export class RoundController {
  constructor(
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
    private readonly verifyRoundUseCase: VerifyRoundUseCase,
  ) {}

  @ApiOperation({ summary: "Get the current active or betting round" })
  @ApiOkResponse({
    description: "Returns the current round, or null if no round is in progress",
    schema: {
      properties: {
        data: { nullable: true, oneOf: [{ $ref: getSchemaPath(RoundResponseDto) }] },
        meta: { type: "object", nullable: true },
        error: { type: "object", nullable: true },
      },
    },
  })
  @Get("current")
  async getCurrent(): Promise<ApiResponseDto<RoundResponseDto | null, null, null>> {
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

  @ApiOperation({ summary: "List crashed rounds with pagination" })
  @ApiQuery({ name: "page", required: false, example: 1, description: "1-based page number" })
  @ApiQuery({ name: "limit", required: false, example: 20, description: "Items per page (max 100)" })
  @ApiOkResponse({
    description: "Paginated list of completed rounds",
    schema: {
      properties: {
        data: { type: "array", items: { $ref: getSchemaPath(RoundHistoryItemDto) } },
        meta: { $ref: getSchemaPath(PaginationMeta) },
        error: { type: "object", nullable: true },
      },
    },
  })
  @Get("history")
  async getHistory(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ): Promise<ApiResponseDto<RoundHistoryItemDto[], PaginationMeta, null>> {
    const result = await this.getRoundHistoryUseCase.execute(
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );

    const data: RoundHistoryItemDto[] = result.items.map((round) => ({
      id: round.id,
      crashPoint: round.crashPoint,
      seedHash: round.seedHash,
      startedAt: round.startedAt!.toISOString(),
      crashedAt: round.crashedAt!.toISOString(),
    }));

    return ApiResponseDto.okWithMeta(data, { pagination: { page: result.page, limit: result.limit, total: result.total } });
  }

  @ApiOperation({ summary: "Verify the provably fair result of a crashed round" })
  @ApiOkResponse({
    description: "Full audit trail for the round crash point computation",
    schema: {
      properties: {
        data: { $ref: getSchemaPath(RoundVerifyResponseDto) },
        meta: { type: "object", nullable: true },
        error: { type: "string", nullable: true },
      },
    },
  })
  @ApiNotFoundResponse({ description: "Round not found or seed not yet revealed" })
  @Get(":roundId/verify")
  async verify(@Param("roundId", ParseUUIDPipe) roundId: string): Promise<ApiResponseDto<RoundVerifyResponseDto, null, null>> {
    const result = await this.verifyRoundUseCase.execute(roundId);
    return ApiResponseDto.ok(result);
  }
}
