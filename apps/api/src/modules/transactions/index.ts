import { FastifyInstance } from 'fastify';
import { TransactionController } from './controllers/transaction-controller';
import { TransactionService, TransactionType, TransactionEntityType } from './services/transaction-service';
import { Role } from '@lorrigo/db';
import { initTransactionWorker } from './queues/transaction-worker';

/**
 * Register the transactions module with the Fastify instance
 * @param fastify Fastify instance
 */
export default async function transactionRoutes(fastify: FastifyInstance): Promise<void> {
  // Create controller instance
  initTransactionWorker(fastify);
  const transactionController = new TransactionController(fastify);

  // Create shipment transaction
  fastify.post('/shipment', {
    schema: {
      tags: ['Transactions'],
      summary: 'Create a shipment transaction',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transaction: { type: 'object' },
            walletBalance: { type: 'number' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => transactionController.createShipmentTransaction(request, reply),
  });

  // Create invoice transaction
  fastify.post('/invoice', {
    schema: {
      tags: ['Transactions'],
      summary: 'Create an invoice transaction',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transaction: { type: 'object' },
            walletBalance: { type: 'number' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => transactionController.createInvoiceTransaction(request, reply),
  });

  // Create wallet recharge transaction
  fastify.post('/wallet', {
    schema: {
      tags: ['Transactions'],
      summary: 'Create a wallet recharge transaction',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transaction: { type: 'object' },
            walletBalance: { type: 'number' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => transactionController.createWalletRechargeTransaction(request, reply),
  });

  // Recharge wallet
  fastify.post('/wallet/recharge', {
    schema: {
      tags: ['Transactions'],
      summary: 'Recharge wallet using payment gateway',
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            url: { type: 'string' },
            merchantTransactionId: { type: 'string' },
            transaction: { type: 'object' },
          },
        },
        400: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => transactionController.rechargeWallet(request, reply),
  });

  // Verify wallet recharge
  fastify.get('/wallet/verify', {
    schema: {
      tags: ['Transactions'],
      summary: 'Verify wallet recharge from payment gateway callback',
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            transaction: { type: 'object' },
          },
        },
        400: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => transactionController.verifyWalletRecharge(request, reply),
  });

  // Get wallet balance
  fastify.get('/wallet/balance', {
    schema: {
      tags: ['Transactions'],
      summary: 'Get user wallet balance',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            balance: { type: 'number' },
            hold_amount: { type: 'number' },
            usable_amount: { type: 'number' },
            max_negative_amount: { type: 'number' },
            available_amount: { type: 'number' },
            can_create_shipment: { type: 'boolean' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => transactionController.getWalletBalance(request, reply),
  });

  // Get transaction history
  fastify.get('/history', {
    schema: {
      tags: ['Transactions'],
      summary: 'Get user transaction history',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transactions: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
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
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => transactionController.getTransactionHistory(request, reply),
  });

  // Refetch failed transactions
  fastify.get('/refetch-failed', {
    schema: {
      tags: ['Transactions'],
      summary: 'Refetch failed transactions',
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            transactions: { type: 'array' },
          },
        },
        400: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => transactionController.refetchFailedTransactions(request, reply),
  });

  // Pay invoice
  fastify.post('/invoice/pay', {
    schema: {
      tags: ['Transactions'],
      summary: 'Pay invoice using payment gateway',
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            url: { type: 'string' },
            merchantTransactionId: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => transactionController.payInvoice(request, reply),
  });

  // Verify invoice payment
  fastify.get('/invoice/verify', {
    schema: {
      tags: ['Transactions'],
      summary: 'Verify invoice payment',
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            updateInvoice: { type: 'object' },
          },
        },
        400: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize([Role.SELLER, Role.ADMIN])],
    handler: (request, reply) => transactionController.verifyInvoicePayment(request, reply),
  });

  // Log that the module has been registered
  fastify.log.info('Transactions module registered');
}

// Export types and services for use in other modules
export { TransactionService, TransactionType, TransactionEntityType };
