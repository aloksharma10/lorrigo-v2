import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TransactionService } from '../services/transaction-service';
import { PaymentGatewayFactory, PaymentGatewayType } from '../services/payment-gateway.factory';

/**
 * Controller for handling payment gateway webhooks
 */
export class WebhookController {
  private transactionService: TransactionService;

  constructor(fastify: FastifyInstance) {
    this.transactionService = new TransactionService(fastify);
  }

  /**
   * Handle Cashfree webhook for payment notifications
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async handleCashfreeWebhook(request: FastifyRequest, reply: FastifyReply) {
    try {
      const signature = (request.headers['x-webhook-signature'] || request.headers['x-webhook-signature-v2']) as string;
      const timestamp = (request.headers['x-webhook-timestamp'] || request.headers['x-webhook-timestamp-v2']) as string;
      const rawBody = JSON.stringify(request.body);

      // Verify webhook signature
      const paymentGateway = PaymentGatewayFactory.getPaymentGateway(PaymentGatewayType.CASHFREE, request.server);
      
      if (paymentGateway.verifyWebhookSignature && !paymentGateway.verifyWebhookSignature(signature, rawBody, timestamp)) {
        request.log.warn('Invalid Cashfree webhook signature');
        return reply.code(400).send({ success: false, error: 'Invalid signature' });
      }

      const webhookData = request.body as any;
      request.log.info(`Received Cashfree webhook: ${JSON.stringify(webhookData)}`);

      // Process the webhook based on type
      const { type, data } = webhookData;

      switch ((type || webhookData?.event)?.toString()) {
        case 'PAYMENT_SUCCESS_WEBHOOK':
        case 'PAYMENT_FAILED_WEBHOOK':
        case 'PAYMENT_USER_DROPPED_WEBHOOK':
        case 'ORDER.PAID':
        case 'ORDER.FAILED':
          await this.handlePaymentWebhook(data, request);
          break;
        default:
          request.log.warn(`Unhandled Cashfree webhook type: ${type}`);
      }

      return reply.code(200).send({ success: true });
    } catch (error) {
      request.log.error(`Error processing Cashfree webhook: ${error}`);
      return reply.code(500).send({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Handle payment webhook data
   * @param paymentData Payment data from webhook
   * @param request Fastify request for logging
   */
  private async handlePaymentWebhook(paymentData: any, request: FastifyRequest) {
    const { orderId, txStatus, order_id, order_status } = paymentData || {};
    const id = orderId || order_id;
    const status = (txStatus || order_status || '').toString().toUpperCase();

    if (!id) {
      request.log.warn('Missing orderId in payment webhook data');
      return;
    }

    try {
      // Check if this is a wallet recharge transaction
      if (id.startsWith('WT-')) {
        await this.transactionService.verifyWalletRecharge(id);
        request.log.info(`Processed wallet recharge webhook for transaction: ${id} [${status}]`);
      }
      // Check if this is an invoice payment transaction
      else if (id.startsWith('IV-')) {
        // For invoice payments, we need to extract invoice ID from order meta or use a different approach
        // Since we can't easily get the invoice ID from webhook, we'll handle this in the verification endpoint
        request.log.info(`Received invoice payment webhook for transaction: ${id} [${status}]`);
      }
      else {
        request.log.warn(`Unknown transaction type for order: ${id}`);
      }
    } catch (error) {
      request.log.error(`Error processing payment webhook for order ${orderId}: ${error}`);
    }
  }

  /**
   * Handle payment return/redirect from Cashfree
   * This is called when user is redirected back from payment page
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async handlePaymentReturn(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { order_id, order_token } = request.query as any;

      if (!order_id) {
        return reply.code(400).send({ success: false, error: 'Missing order_id' });
      }

      // Verify the payment status
      const paymentGateway = PaymentGatewayFactory.getPaymentGateway(PaymentGatewayType.CASHFREE, request.server);
      const statusResult = await paymentGateway.checkPaymentStatus(order_id);

      // For wallet recharge
      if (order_id.startsWith('WT-')) {
        const verificationResult = await this.transactionService.verifyWalletRecharge(order_id);
        
        // Redirect to frontend with status
        const status = verificationResult.success ? 'success' : 'failure';
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/seller/wallet/callback?status=${status}&merchantTransactionId=${order_id}`;
        
        return reply.redirect(redirectUrl);
      }
      // For invoice payment
      else if (order_id.startsWith('IV-')) {
        // Extract invoice ID from the transaction record or use order meta
        // For now, redirect to a generic invoice callback
        const status = statusResult.success && statusResult.paymentStatus === 'SUCCESS' ? 'success' : 'failure';
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/seller/invoice/callback?status=${status}&merchantTransactionId=${order_id}`;
        
        return reply.redirect(redirectUrl);
      }
      else {
        return reply.code(400).send({ success: false, error: 'Invalid transaction type' });
      }
    } catch (error) {
      request.log.error(`Error handling payment return: ${error}`);
      return reply.code(500).send({ success: false, error: 'Internal server error' });
    }
  }
}