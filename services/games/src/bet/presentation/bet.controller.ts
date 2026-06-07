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
import { PlaceBetUseCase } from "../application/place-bet.use-case";
import { CashoutUseCase } from "../application/cashout.use-case";
import { ApiResponseDto } from "../../utils/api-response.dto";
import { PlayerId, Username } from "../../utils/jwt.decorator";

import { IsNumber, IsNotEmpty } from 'class-validator';

class PlaceBetDto {
  @IsNumber()
  @IsNotEmpty()
  amountCents: number;
}

@Controller("bets")
export class BetController {
  private readonly logger = new Logger(BetController.name)
  constructor(
    private readonly placeBet: PlaceBetUseCase,
    private readonly cashout: CashoutUseCase,
  ) {}

  @Post()
  async place(
    @PlayerId() playerId: string,
    @Username() username: string,
    @Body() body: PlaceBetDto,
  ): Promise<ApiResponseDto<object, null, null>> {
    this.logger.debug(body)
    const result = await this.placeBet.execute({
      playerId,
      username,
      amountCents: body.amountCents,
    });
    return ApiResponseDto.ok(result);
  }

  @Post(":betId/cashout")
  @HttpCode(HttpStatus.OK)
  async cashOut(
    @PlayerId() playerId: string,
    @Param("betId", ParseUUIDPipe) betId: string,
  ): Promise<ApiResponseDto<object, null, null>> {
    const result = await this.cashout.execute({ betId, playerId });
    return ApiResponseDto.ok(result);
  }
}
