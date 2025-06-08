/**
 * Channel Configuration Types
 */

export interface ChannelConfigData {
  name: string;
  nickname: string;
  is_active?: boolean;
}

// export interface ChannelConfigResponse {
//   id: string;
//   name: string;
//   nickname: string;
//   is_active: boolean;
//   created_at: Date;
//   updated_at: Date;
//   couriers?: CourierSummary[];
//   _count?: {
//     couriers: number;
//   };
// }

// export interface ChannelConfigSummary {
//   id: string;
//   name: string;
//   nickname: string;
//   _count: {
//     couriers: number;
//   };
// }

// export interface CourierSummary {
//   id: string;
//   code: string;
//   name: string;
//   courier_code?: string;
//   is_active: boolean;
//   type?: string;
//   created_at?: Date;
// }

// export interface ChannelConfigListResponse {
//   channelConfigs: ChannelConfigResponse[];
//   total: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }

// export interface ChannelConfigQueryParams {
//   page?: number;
//   limit?: number;
//   search?: string;
//   is_active?: boolean;
// }

// export interface ErrorResponse {
//   error: string;
//   status: number;
// }

// export interface SuccessResponse {
//   message: string;
// }

// // Request/Response interfaces for API endpoints
// export interface CreateChannelConfigRequest {
//   name: string;
//   nickname: string;
//   is_active?: boolean;
// }

// export interface UpdateChannelConfigRequest {
//   name?: string;
//   nickname?: string;
//   is_active?: boolean;
// }

// export interface ChannelConfigCreatedResponse {
//   id: string;
//   name: string;
//   nickname: string;
//   is_active: boolean;
//   couriers_count: number;
//   created_at: Date;
// }

// export interface ChannelConfigUpdatedResponse {
//   id: string;
//   name: string;
//   nickname: string;
//   is_active: boolean;
//   couriers_count: number;
//   updated_at: Date;
// }

// // Validation error types
// export interface ValidationError {
//   message: string;
//   errors: Array<{
//     path: string[];
//     message: string;
//     code: string;
//   }>;
// }

// // Service method result types
// export type ServiceResult<T> = T | ErrorResponse;

// // Common API response wrapper
// export interface ApiResponse<T> {
//   success: boolean;
//   data?: T;
//   error?: string;
//   timestamp: Date;
// } 