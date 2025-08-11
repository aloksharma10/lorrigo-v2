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

      // Normalize event type
      const rawType = (webhookData?.type || webhookData?.event || webhookData?.event_type || '').toString().toUpperCase();
      const data = webhookData?.data || webhookData?.payload || webhookData;

      // Map multiple variants to our internal actions
      const isSuccessPayment = ['PAYMENT_SUCCESS_WEBHOOK', 'ORDER.PAID', 'PAYMENT_SUCCESS', 'ORDER PAID'].some((t) => rawType.includes(t.replace(/\./g, '')) || rawType === t);
      const isFailedPayment = ['PAYMENT_FAILED_WEBHOOK', 'ORDER.FAILED', 'PAYMENT_FAILED', 'ORDER FAILED'].some((t) => rawType.includes(t.replace(/\./g, '')) || rawType === t);
      const isUserDropped = ['PAYMENT_USER_DROPPED_WEBHOOK', 'USER.DROPPED', 'USER_DROPPED'].some((t) => rawType.includes(t.replace(/\./g, '')) || rawType === t);
      const isVerificationUpdate = ['VERIFICATION', 'PAYMENT_VERIFICATION', 'PAYMENT.VERIFICATION'].some((t) => rawType.includes(t.replace(/\./g, '')));
      const isRefundEvent = ['REFUND', 'AUTO_REFUND'].some((t) => rawType.includes(t));
      const isSettlementEvent = ['SETTLEMENT'].some((t) => rawType.includes(t));

      if (isSuccessPayment || isFailedPayment || isUserDropped || isVerificationUpdate) {
        await this.handlePaymentWebhook(data, request, rawType);
      } else if (isRefundEvent) {
        await this.handleRefundWebhook(data, request);
      } else if (isSettlementEvent) {
        await this.handleSettlementWebhook(data, rawType, request);
      } else {
        request.log.warn(`Unhandled Cashfree webhook type: ${rawType}`);
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
  private async handlePaymentWebhook(paymentData: any, request: FastifyRequest, rawType?: string) {
    const { orderId, txStatus, order_id, order_status } = paymentData || {};
    const id = orderId || order_id;
    const status = (txStatus || order_status || '').toString().toUpperCase();
    const typeNorm = (rawType || '').toUpperCase();
    const isAbandoned = typeNorm.includes('ABANDON') || typeNorm.includes('DROPPED') || status === 'ABANDONED' || status === 'DROPPED';

    if (!id) {
      request.log.warn('Missing orderId in payment webhook data');
      return;
    }

    try {
      // Check if this is a wallet recharge transaction
      if (id.startsWith('WT-')) {
        if (status === 'PAID' || status === 'SUCCESS') {
          await this.transactionService.verifyWalletRecharge(id, 'SUCCESS');
        } else if (status === 'FAILED' || status === 'FAILURE' || status === 'CANCELLED') {
          await this.transactionService.verifyWalletRecharge(id, 'FAILURE');
        } else if (isAbandoned) {
          // Treat abandoned/dropped checkout as pending and start recovery flow (retry + refund chain)
          await this.transactionService.verifyWalletRecharge(id, 'PENDING');
        } else {
          await this.transactionService.verifyWalletRecharge(id);
        }
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
      request.log.error(`Error processing payment webhook for order ${id}: ${error}`);
    }
  }

  /**
   * Handle refund webhooks (success/failed/auto-refund)
   */
  private async handleRefundWebhook(refundData: any, request: FastifyRequest) {
    try {
      const { order_id, orderId, refund_id, refundId, refund_status, status } = refundData || {};
      const id = orderId || order_id;
      const refundIdNorm = refundId || refund_id;
      const refundStatus = (refund_status || status || '').toString().toUpperCase();

      if (!id) return;
      if (!id.startsWith('WT-')) return; // only wallet context for now

      // If refund succeeded, ensure transaction is FAILED (non-credit)
      if (refundStatus.includes('SUCCESS')) {
        const prisma = (request.server as any).prisma;
        await prisma.walletRechargeTransaction.updateMany({
          where: { merchant_transaction_id: id, status: { not: 'FAILED' } },
          data: { status: 'FAILED' },
        });
        request.log.info(`Marked transaction ${id} FAILED after refund ${refundIdNorm}`);
      }
    } catch (e) {
      request.log.error(`Refund webhook handling error: ${e}`);
    }
  }

  /**
   * Handle settlement events (processed/reversed/initiated/failed)
   * We only log them for now as settlements are gateway-level post-processing
   */
  private async handleSettlementWebhook(settlementData: any, rawType: string, request: FastifyRequest) {
    try {
      const { order_id, orderId, settlement_id, status } = settlementData || {};
      const id = orderId || order_id;
      request.log.info(`Settlement event ${rawType} for ${id || 'n/a'} with settlement ${settlement_id || 'n/a'} status ${status || ''}`);
    } catch (e) {
      request.log.error(`Settlement webhook handling error: ${e}`);
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