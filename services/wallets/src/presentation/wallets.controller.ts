import { Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CreateWalletUseCase } from "../application/create-wallet.use-case";
import { GetWalletUseCase } from "../application/get-wallet.use-case";
import { ApiResponseDto } from "../utils/api-response.dto";
import { PlayerId } from "../utils/jwt.decorator";

interface WalletResponseData {
  id: string;
  playerId: string;
  balanceCents: string;
}

@Controller("wallets")
export class WalletsController {
  constructor(
    private readonly createWallet: CreateWalletUseCase,
    private readonly getWallet: GetWalletUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(
    @PlayerId() playerId: string,
  ): Promise<ApiResponseDto<WalletResponseData, null, null>> {
    const result = await this.createWallet.execute(playerId);
    return ApiResponseDto.ok({ id: result.id, playerId: result.playerId, balanceCents: result.balanceCents });
  }

  @Get("me")
  async getBalance(
    @PlayerId() playerId: string,
  ): Promise<ApiResponseDto<WalletResponseData, null, null>> {
    const result = await this.getWallet.execute(playerId);
    return ApiResponseDto.ok(result);
  }
}
