import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { PlaceBetUseCase } from "../application/place-bet.use-case";
import { CashoutUseCase } from "../application/cashout.use-case";
import { ApiResponseDto } from "../../utils/api-response.dto";
import { PlayerId, Username } from "../../utils/jwt.decorator";
import { IsNumber, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PlaceBetResponseDto } from "./dto/place-bet-response.dto";
import { CashoutResponseDto } from "./dto/cashout-response.dto";

class PlaceBetDto {
  @ApiProperty({ example: 1000, description: "Bet amount in cents (e.g. 1000 = R$ 10.00)" })
  @IsNumber()
  @IsNotEmpty()
  amountCents: number;
}

@ApiTags("bets")
@ApiBearerAuth()
@ApiExtraModels(PlaceBetResponseDto, CashoutResponseDto)
@Controller("bets")
export class BetController {
  private readonly logger = new Logger(BetController.name);
  constructor(
    private readonly placeBet: PlaceBetUseCase,
    private readonly cashout: CashoutUseCase,
  ) {}

  @ApiOperation({ summary: "Place a bet on the current betting round" })
  @ApiCreatedResponse({
    description: "Bet placed successfully and pending wallet debit confirmation",
    schema: {
      properties: {
        data: { $ref: getSchemaPath(PlaceBetResponseDto) },
        meta: { type: "object", nullable: true },
        error: { type: "object", nullable: true },
      },
    },
  })
  @Post()
  async place(
    @PlayerId() playerId: string,
    @Username() username: string,
    @Body() body: PlaceBetDto,
  ): Promise<ApiResponseDto<object, null, null>> {
    this.logger.debug(body);
    const result = await this.placeBet.execute({
      playerId,
      username,
      amountCents: body.amountCents,
    });
    return ApiResponseDto.ok(result);
  }

  @ApiOperation({ summary: "Cash out of an active round before it crashes" })
  @ApiParam({ name: "roundId", description: "UUID of the active round", format: "uuid" })
  @ApiOkResponse({
    description: "Cashout applied; payout is queued for wallet credit",
    schema: {
      properties: {
        data: { $ref: getSchemaPath(CashoutResponseDto) },
        meta: { type: "object", nullable: true },
        error: { type: "object", nullable: true },
      },
    },
  })
  @Post(":roundId/cashout")
  @HttpCode(HttpStatus.OK)
  async cashOut(
    @PlayerId() playerId: string,
    @Param("roundId", ParseUUIDPipe) roundId: string,
  ): Promise<ApiResponseDto<object, null, null>> {
    const result = await this.cashout.execute({ roundId, playerId });
    return ApiResponseDto.ok(result);
  }
}
