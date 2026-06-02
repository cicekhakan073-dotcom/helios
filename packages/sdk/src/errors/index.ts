/**
 * @helios/sdk/errors — typed error normalize + toast hub.
 */

export {
  HELIOS_ERROR_CODES,
  HELIOS_ERROR_NAME_BY_CODE,
  isKnownHeliosErrorCode,
  type HeliosErrorCode,
  type HeliosErrorName,
} from "./codes";

export {
  HELIOS_MESSAGES_TR,
  NON_CONTRACT_MESSAGES_TR,
  type NonContractMessageKey,
  type UserMessage,
} from "./messages-tr";

export {
  buildAppError,
  type AppError,
  type AppErrorCategory,
  type AppErrorSeverity,
} from "./app-error";

export { normalizeError } from "./normalize";

export { pushAppError, useToasts, type Toast } from "./toast-store";
