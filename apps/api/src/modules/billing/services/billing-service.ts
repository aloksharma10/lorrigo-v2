import { FastifyInstance } from 'fastify';
import { format } from 'date-fns';
import { ShipmentStatus, PaymentMethod } from '@lorrigo/db';
import { addJob, QueueNames } from '@/lib/queue';
import { randomUUID } from 'crypto';



export interface BillingCSVRow {
  awb: string;
  weight: number;
}

export interface BillingProcessingResult {
  success: boolean;
  message: string;
  totalRecords: number;
  processedCount: number;
  errorCount: number;
  bulkOperationId?: string;
}

export class BillingService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Upload and process billing CSV
   */
  async uploadBillingCSV(
    csvData: Buffer,
    userId: string,
    filename: string
  ): Promise<BillingProcessingResult> {
    try {
      // Parse CSV data
      const csvString = csvData.toString('utf8');
      const lines = csvString.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least header and one data row');
      }

      const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || [];
      const expectedHeaders = ['awb', 'weight'];
      
      // Validate headers
      const missingHeaders = expectedHeaders.filter(
        header => !headers.includes(header)
      );
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Parse data rows
      const billingRows: BillingCSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim());
        if (values.length < 2 || !values[0]) continue;

        const weightValue = values[1];
        if (!weightValue) continue;

        billingRows.push({
          awb: values[0].replace(/(\.\d+)$/, ''),
          weight: parseFloat(weightValue) || 0
        });
      }

      if (billingRows.length === 0) {
        throw new Error('No valid billing data found in CSV');
      }

      // Create bulk operation record
      const bulkOperation = await this.fastify.prisma.bulkOperation.create({
        data: {
          type: 'BILLING_CSV_UPLOAD',
          status: 'PENDING',
          code: `BLK-${randomUUID().slice(0, 8)}`,
          user_id: userId,
          total_count: billingRows.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
        },
      });

      // Add job to queue for background processing
      await addJob(
        QueueNames.BILLING_CSV_PROCESSING,
        'process-billing-csv',
        {
          bulkOperationId: bulkOperation.id,
          billingRows,
          userId
        },
        {
          jobId: `billing-csv-${bulkOperation.id}`,
          priority: 1
        }
      );

      return {
        success: true,
        message: 'Billing CSV uploaded successfully and is being processed',
        totalRecords: billingRows.length,
        processedCount: 0,
        errorCount: 0,
        bulkOperationId: bulkOperation.id
      };

    } catch (error: any) {
      this.fastify.log.error(`Error uploading billing CSV: ${error.message}`);
      throw new Error(`Failed to upload billing CSV: ${error.message}`);
    }
  }

  /**
   * Get billing summary by month for admin
   */
  async getBillingSummaryByMonth(month: string, page = 1, limit = 20) {
    try {
      const userBillingData = await this.fastify.prisma.billing.findMany({
        where: {
          billing_month: month
        },
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit
      });

      // Group by user and calculate payment status amounts
      const userSummaryMap = new Map();
      let totalAmount = 0;
      let totalOrders = 0;

      userBillingData.forEach(billing => {
        const userId = billing.order.user_id;
        const userInfo = billing.order.user;
        
        if (!userSummaryMap.has(userId)) {
          userSummaryMap.set(userId, {
            user_id: userId,
            user_name: userInfo.name,
            user_email: userInfo.email,
            total_orders: 0,
            total_billing_amount: 0,
            pending_amount: 0,
            paid_amount: 0,
            disputed_amount: 0
          });
        }

        const userSummary = userSummaryMap.get(userId);
        userSummary.total_orders += 1;
        userSummary.total_billing_amount += billing.billing_amount;

        // Categorize amounts by payment status
        switch (billing.payment_status.toUpperCase()) {
          case 'PAID':
            userSummary.paid_amount += billing.billing_amount;
            break;
          case 'DISPUTED':
            userSummary.disputed_amount += billing.billing_amount;
            break;
          case 'NOT_PAID':
          default:
            userSummary.pending_amount += billing.billing_amount;
            break;
        }

        totalOrders += 1;
        totalAmount += billing.billing_amount;
      });

      const users = Array.from(userSummaryMap.values());

      return {
        billing_month: month,
        users,
        total_amount: totalAmount,
        total_orders: totalOrders,
        pagination: {
          page,
          pageSize: limit,
          total: users.length,
          pageCount: Math.ceil(users.length / limit)
        }
      };

    } catch (error: any) {
      this.fastify.log.error(`Error getting billing summary: ${error.message}`);
      throw new Error(`Failed to get billing summary: ${error.message}`);
    }
  }

  /**
   * Get user billing details for a specific month
   */
  async getUserBillingByMonth(userId: string, month: string) {
    try {
      const billingRecords = await this.fastify.prisma.billing.findMany({
        where: {
          billing_month: month,
          order: {
            user_id: userId
          }
        },
        include: {
          order: {
            include: {
              shipment: true,
              customer: true,
              user: true,
              hub: true
            }
          }
        },
        orderBy: {
          billing_date: 'desc'
        }
      });

      let totalAmount = 0;
      let pendingAmount = 0;
      let paidAmount = 0;
      let disputedAmount = 0;

      const records = billingRecords.map(billing => {
        totalAmount += billing.billing_amount;
        
        // Categorize amounts by payment status
        switch (billing.payment_status.toUpperCase()) {
          case 'PAID':
            paidAmount += billing.billing_amount;
            break;
          case 'DISPUTED':
            disputedAmount += billing.billing_amount;
            break;
          case 'NOT_PAID':
          default:
            pendingAmount += billing.billing_amount;
            break;
        }
        
        return {
          id: billing.id,
          code: billing.code,
          order_id: billing.order_id,
          billing_date: billing.billing_date.toISOString(),
          billing_month: billing.billing_month,
          billing_amount: billing.billing_amount,
          charged_weight: billing.charged_weight,
          fw_excess_charge: billing.fw_excess_charge,
          rto_excess_charge: billing.rto_excess_charge,
          zone_change_charge: billing.zone_change_charge,
          cod_charge: billing.cod_charge,
          is_forward_applicable: billing.is_forward_applicable,
          is_rto_applicable: billing.is_rto_applicable,
          base_price: billing.base_price,
          base_weight: billing.base_weight,
          increment_price: billing.increment_price,
          order_weight: billing.order_weight,
          order_zone: billing.order_zone,
          charged_zone: billing.charged_zone,
          courier_name: billing.courier_name,
          is_processed: billing.is_processed,
          payment_status: billing.payment_status,
          created_at: billing.created_at.toISOString(),
          updated_at: billing.updated_at.toISOString(),
          order: {
            order_number: billing.order.order_number,
            customer: {
              name: billing.order.customer.name,
              phone: billing.order.customer.phone,
              email: billing.order.customer.email || ''
            },
            hub: {
              name: billing.order.hub?.name || ''
            },
            shipment: {
              awb: billing.order.shipment?.awb || '',
              courier: {
                name: billing.courier_name || ''
              }
            }
          }
        };
      });

      return {
        billing_month: month,
        user_id: userId,
        records,
        summary: {
          total_orders: billingRecords.length,
          total_billing_amount: totalAmount,
          pending_amount: pendingAmount,
          paid_amount: paidAmount,
          disputed_amount: disputedAmount
        },
        pagination: {
          page: 1,
          pageSize: records.length,
          total: records.length,
          pageCount: 1
        }
      };

    } catch (error: any) {
      this.fastify.log.error(`Error getting user billing: ${error.message}`);
      throw new Error(`Failed to get user billing: ${error.message}`);
    }
  }

  /**
   * Get available billing months
   */
  async getAvailableBillingMonths(): Promise<string[]> {
    try {
      const months = await this.fastify.prisma.billing.findMany({
        select: {
          billing_month: true
        },
        distinct: ['billing_month'],
        orderBy: {
          billing_month: 'desc'
        }
      });

      return months.map(m => m.billing_month);

    } catch (error: any) {
      this.fastify.log.error(`Error getting billing months: ${error.message}`);
      throw new Error(`Failed to get billing months: ${error.message}`);
    }
  }

  /**
   * Get bulk operation status
   */
  async getBulkOperationStatus(operationId: string, userId: string) {
    try {
      const operation = await this.fastify.prisma.bulkOperation.findFirst({
        where: {
          id: operationId,
          user_id: userId
        }
      });

      if (!operation) {
        throw new Error('Bulk operation not found');
      }

      const progress = operation.total_count > 0 ? 
        Math.floor((operation.processed_count / operation.total_count) * 100) : 0;

      return {
        ...operation,
        progress
      };

    } catch (error: any) {
      this.fastify.log.error(`Error getting bulk operation status: ${error.message}`);
      throw new Error(`Failed to get bulk operation status: ${error.message}`);
    }
  }
}