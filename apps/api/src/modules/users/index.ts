import { FastifyInstance } from 'fastify';
import { UsersController } from './controllers/users-controller';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';

export async function usersRoutes(fastify: FastifyInstance) {
  // Ensure user is authenticated for all routes
  fastify.addHook('onRequest', fastify.authenticate);

  // Initialize controller
  const usersController = new UsersController(fastify);

  // Get users with pagination
  fastify.get('/', {
    schema: {
      tags: ['Users'],
      summary: 'Get all users with pagination',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
          search: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'SELLER'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  wallet_balance: { type: 'number' },
                  plan: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                  profile: {
                    type: 'object',
                    properties: {
                      company_name: { type: 'string' },
                      phone: { type: 'string' },
                      address: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      pincode: { type: 'string' },
                    },
                  },
                  _count: {
                    type: 'object',
                    properties: {
                      orders: { type: 'integer' },
                      shipments: { type: 'integer' },
                      invoice_transactions: { type: 'integer' },
                      weight_disputes: { type: 'integer' },
                      shipment_transactions: { type: 'integer' },
                      wallet_recharge_transactions: { type: 'integer' },
                    },
                  },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    preHandler: authorizeRoles([Role.ADMIN]),
    handler: (request, reply) => usersController.getUsersWithPagination(request, reply),
  });

  // Get user by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Get user by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                role: { type: 'string' },
                is_active: { type: 'boolean' },
                is_verified: { type: 'boolean' },
                plan_id: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
                wallet_balance: { type: 'number' },
                plan: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
                profile: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: { type: 'string' },
                    user_id: { type: 'string' },
                    wallet_type: { type: 'string', enum: ['WALLET', 'REMITTANCE_WALLET', 'POSTPAID'] },
                    business_type: { type: 'string' },
                    pan: { type: 'string' },
                    adhaar: { type: 'string' },
                    gst_no: { type: 'string' },
                    kyc_submitted: { type: 'boolean' },
                    kyc_verified: { type: 'boolean' },
                    acc_holder_name: { type: 'string' },
                    acc_number: { type: 'string' },
                    ifsc_number: { type: 'string' },
                    acc_type: { type: 'string' },
                    is_d2c: { type: 'boolean' },
                    is_b2b: { type: 'boolean' },
                    is_prepaid: { type: 'boolean' },
                    is_fw: { type: 'boolean' },
                    is_rto: { type: 'boolean' },
                    is_cod: { type: 'boolean' },
                    is_cod_reversal: { type: 'boolean' },
                    notification_settings: { type: 'object' },
                    company: { type: 'string' },
                    company_name: { type: 'string' },
                    logo_url: { type: 'string' },
                    payment_method: { type: 'string', enum: ['PREPAID', 'WALLET', 'CARD', 'BANK_TRANSFER', 'COD', 'UPI'] },
                    remittance_cycle: { type: 'string', enum: ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL'] },
                    remittance_min_amount: { type: 'number' },
                    cod_remittance_pending: { type: 'number' },
                    remittance_days_of_week: { type: 'array', items: { type: 'integer' } },
                    remittance_days_after_delivery: { type: 'integer' },
                    early_remittance_charge: { type: 'number' },
                    ndr_boost: { type: 'object' },
                    billing_cycle_start_date: { type: 'string', format: 'date-time' },
                    billing_cycle_end_date: { type: 'string', format: 'date-time' },
                    billing_cycle_type: { type: 'string', enum: ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL'] },
                    label_format: { type: 'string', enum: ['THERMAL', 'A4'] },
                    manifest_format: { type: 'string', enum: ['THERMAL', 'A4'] },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                  },
                },
                _count: {
                  type: 'object',
                  properties: {
                    orders: { type: 'integer' },
                    shipments: { type: 'integer' },
                    invoice_transactions: { type: 'integer' },
                    weight_disputes: { type: 'integer' },
                    shipment_transactions: { type: 'integer' },
                    wallet_recharge_transactions: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: authorizeRoles([Role.ADMIN]),
    handler: (request, reply) => usersController.getUserById(request, reply),
  });

  // Update user
  fastify.put('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Update user',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          company_name: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          pincode: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                role: { type: 'string' },
                is_active: { type: 'boolean' },
                is_verified: { type: 'boolean' },
                plan_id: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
                wallet_balance: { type: 'number' },
                plan: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
                profile: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: { type: 'string' },
                    user_id: { type: 'string' },
                    wallet_type: { type: 'string', enum: ['WALLET', 'REMITTANCE_WALLET', 'POSTPAID'] },
                    business_type: { type: 'string' },
                    pan: { type: 'string' },
                    adhaar: { type: 'string' },
                    gst_no: { type: 'string' },
                    kyc_submitted: { type: 'boolean' },
                    kyc_verified: { type: 'boolean' },
                    acc_holder_name: { type: 'string' },
                    acc_number: { type: 'string' },
                    ifsc_number: { type: 'string' },
                    acc_type: { type: 'string' },
                    is_d2c: { type: 'boolean' },
                    is_b2b: { type: 'boolean' },
                    is_prepaid: { type: 'boolean' },
                    is_fw: { type: 'boolean' },
                    is_rto: { type: 'boolean' },
                    is_cod: { type: 'boolean' },
                    is_cod_reversal: { type: 'boolean' },
                    notification_settings: { type: 'object' },
                    company: { type: 'string' },
                    company_name: { type: 'string' },
                    logo_url: { type: 'string' },
                    payment_method: { type: 'string', enum: ['PREPAID', 'WALLET', 'CARD', 'BANK_TRANSFER', 'COD', 'UPI'] },
                    remittance_cycle: { type: 'string', enum: ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL'] },
                    remittance_min_amount: { type: 'number' },
                    cod_remittance_pending: { type: 'number' },
                    remittance_days_of_week: { type: 'array', items: { type: 'integer' } },
                    remittance_days_after_delivery: { type: 'integer' },
                    early_remittance_charge: { type: 'number' },
                    ndr_boost: { type: 'object' },
                    billing_cycle_start_date: { type: 'string', format: 'date-time' },
                    billing_cycle_end_date: { type: 'string', format: 'date-time' },
                    billing_cycle_type: { type: 'string', enum: ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL'] },
                    label_format: { type: 'string', enum: ['THERMAL', 'A4'] },
                    manifest_format: { type: 'string', enum: ['THERMAL', 'A4'] },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                  },
                },
                _count: {
                  type: 'object',
                  properties: {
                    orders: { type: 'integer' },
                    shipments: { type: 'integer' },
                    invoice_transactions: { type: 'integer' },
                    weight_disputes: { type: 'integer' },
                    shipment_transactions: { type: 'integer' },
                    wallet_recharge_transactions: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: authorizeRoles([Role.ADMIN]),
    handler: (request, reply) => usersController.updateUser(request, reply),
  });

  // Update user profile
  fastify.put('/:id/profile', {
    schema: {
      tags: ['Users'],
      summary: 'Update user profile',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          // Company Details
          company: { type: 'string' },
          company_name: { type: 'string' },
          logo_url: { type: 'string' },
          
          // Notification Settings
          notification_settings: {
            type: 'object',
            properties: {
              email: { type: 'boolean' },
              whatsapp: { type: 'boolean' },
              system: { type: 'boolean' },
            },
          },
          
          // KYC Details
          business_type: { type: 'string' },
          pan: { type: 'string' },
          adhaar: { type: 'string' },
          gst_no: { type: 'string' },
          kyc_submitted: { type: 'boolean' },
          kyc_verified: { type: 'boolean' },
          
          // Bank Details
          acc_holder_name: { type: 'string' },
          acc_number: { type: 'string' },
          ifsc_number: { type: 'string' },
          acc_type: { type: 'string' },
          
          // Seller Config
          is_d2c: { type: 'boolean' },
          is_b2b: { type: 'boolean' },
          is_prepaid: { type: 'boolean' },
          is_cod: { type: 'boolean' },
          is_fw: { type: 'boolean' },
          is_rto: { type: 'boolean' },
          is_cod_reversal: { type: 'boolean' },
          
          // Billing and Remittance
          payment_method: { type: 'string', enum: ['PREPAID', 'WALLET', 'CARD', 'BANK_TRANSFER', 'COD', 'UPI'] },
          remittance_cycle: { type: 'string', enum: ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL'] },
          remittance_min_amount: { type: 'number' },
          remittance_days_after_delivery: { type: 'number' },
          early_remittance_charge: { type: 'number' },
          remittance_days_of_week: { type: 'array', items: { type: 'integer' } },
          billing_cycle_type: { type: 'string', enum: ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL'] },
          
          // Label/Manifest Format
          label_format: { type: 'string', enum: ['THERMAL', 'A4'] },
          manifest_format: { type: 'string', enum: ['THERMAL', 'A4'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            profile: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                user_id: { type: 'string' },
                wallet_type: { type: 'string', enum: ['WALLET', 'REMITTANCE_WALLET', 'POSTPAID'] },
                business_type: { type: 'string' },
                pan: { type: 'string' },
                adhaar: { type: 'string' },
                gst_no: { type: 'string' },
                kyc_submitted: { type: 'boolean' },
                kyc_verified: { type: 'boolean' },
                acc_holder_name: { type: 'string' },
                acc_number: { type: 'string' },
                ifsc_number: { type: 'string' },
                acc_type: { type: 'string' },
                is_d2c: { type: 'boolean' },
                is_b2b: { type: 'boolean' },
                is_prepaid: { type: 'boolean' },
                is_fw: { type: 'boolean' },
                is_rto: { type: 'boolean' },
                is_cod: { type: 'boolean' },
                is_cod_reversal: { type: 'boolean' },
                notification_settings: { type: 'object' },
                company: { type: 'string' },
                company_name: { type: 'string' },
                logo_url: { type: 'string' },
                payment_method: { type: 'string', enum: ['PREPAID', 'WALLET', 'CARD', 'BANK_TRANSFER', 'COD', 'UPI'] },
                remittance_cycle: { type: 'string', enum: ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL'] },
                remittance_min_amount: { type: 'number' },
                cod_remittance_pending: { type: 'number' },
                remittance_days_of_week: { type: 'array', items: { type: 'integer' } },
                remittance_days_after_delivery: { type: 'integer' },
                early_remittance_charge: { type: 'number' },
                ndr_boost: { type: 'object' },
                billing_cycle_start_date: { type: 'string', format: 'date-time' },
                billing_cycle_end_date: { type: 'string', format: 'date-time' },
                billing_cycle_type: { type: 'string', enum: ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL'] },
                label_format: { type: 'string', enum: ['THERMAL', 'A4'] },
                manifest_format: { type: 'string', enum: ['THERMAL', 'A4'] },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: authorizeRoles([Role.ADMIN]),
    handler: (request, reply) => usersController.updateUserProfile(request, reply),
  });
} 