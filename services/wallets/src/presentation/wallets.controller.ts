import { Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { CreateWalletUseCase } from "../application/create-wallet.use-case";
import { GetWalletUseCase } from "../application/get-wallet.use-case";
import { ApiResponseDto } from "../utils/api-response.dto";
import { PlayerId } from "../utils/jwt.decorator";

class WalletResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "player-uuid" })
  playerId: string;

  @ApiProperty({ example: "5000", description: "Balance in cents (e.g. 5000 = R$ 50.00)" })
  balanceCents: string;
}

@ApiTags("wallets")
@ApiBearerAuth()
@ApiExtraModels(WalletResponseDto)
@Controller("wallets")
export class WalletsController {
  constructor(
    private readonly createWallet: CreateWalletUseCase,
    private readonly getWallet: GetWalletUseCase,
  ) {}

  @ApiOperation({ summary: "Create a wallet for the authenticated player" })
  @ApiOkResponse({
    description: "Wallet created (or already exists) for this player",
    schema: {
      properties: {
        data: { $ref: getSchemaPath(WalletResponseDto) },
        meta: { type: "object", nullable: true },
        error: { type: "object", nullable: true },
      },
    },
  })
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(
    @PlayerId() playerId: string,
  ): Promise<ApiResponseDto<WalletResponseDto, null, null>> {
    const result = await this.createWallet.execute(playerId);
    return ApiResponseDto.ok({ id: result.id, playerId: result.playerId, balanceCents: result.balanceCents });
  }

  @ApiOperation({ summary: "Get the balance of the authenticated player's wallet" })
  @ApiOkResponse({
    description: "Current wallet balance",
    schema: {
      properties: {
        data: { $ref: getSchemaPath(WalletResponseDto) },
        meta: { type: "object", nullable: true },
        error: { type: "object", nullable: true },
      },
    },
  })
  @Get("me")
  async getBalance(
    @PlayerId() playerId: string,
  ): Promise<ApiResponseDto<WalletResponseDto, null, null>> {
    const result = await this.getWallet.execute(playerId);
    return ApiResponseDto.ok(result);
  }
}
