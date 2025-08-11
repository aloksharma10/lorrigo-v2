import { FastifyInstance } from 'fastify';
import { PaymentGatewayInterface, PaymentGatewayType } from '../interfaces/payment-gateway.interface';
import { CashfreeService } from './cashfree-service';

// Re-export PaymentGatewayType for convenience
export { PaymentGatewayType } from '../interfaces/payment-gateway.interface';

/**
 * Factory class for creating payment gateway service instances
 * This follows the Factory pattern to provide a centralized way to create payment gateway services
 */
export class PaymentGatewayFactory {
  private static instances: Map<PaymentGatewayType, PaymentGatewayInterface> = new Map();

  /**
   * Get payment gateway service instance
   * @param type Payment gateway type
   * @param fastify Fastify instance
   * @returns Payment gateway service instance
   */
  static getPaymentGateway(
    type: PaymentGatewayType,
    fastify: FastifyInstance
  ): PaymentGatewayInterface {
    // Check if instance already exists for this type
    if (this.instances.has(type)) {
      return this.instances.get(type)!;
    }

    let instance: PaymentGatewayInterface;

    switch (type) {
      case PaymentGatewayType.CASHFREE:
        instance = new CashfreeService(fastify);
        break;
      default:
        throw new Error(`Unsupported payment gateway type: ${type}`);
    }

    // Cache the instance for reuse
    this.instances.set(type, instance);
    return instance;
  }

  /**
   * Get the default payment gateway service
   * @param fastify Fastify instance
   * @returns Default payment gateway service instance
   */
  static getDefaultPaymentGateway(fastify: FastifyInstance): PaymentGatewayInterface {
    return this.getPaymentGateway(PaymentGatewayType.CASHFREE, fastify);
  }

  /**
   * Clear all cached instances (useful for testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}