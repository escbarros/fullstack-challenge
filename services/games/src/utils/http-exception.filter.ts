import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from "@nestjs/common";
import { ApiResponseDto, ApiError } from "./api-response.dto";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status(code: number): { json(body: unknown): void } }>();
    const statusCode = exception.getStatus();
    const body = exception.getResponse();
    const isObject = typeof body === "object" && body !== null;

    const errorText = isObject && "error" in body ? (body as { error: string }).error : "Error";
    const rawMessage = isObject && "message" in body ? (body as { message: unknown }).message : exception.message;
    const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : String(rawMessage);

    const error: ApiError = { statusCode, error: errorText, message };

    response.status(statusCode).json(ApiResponseDto.error(error));
  }
}
