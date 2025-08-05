import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BucketMappingService } from '../shipments/services/bucket-mapping.service';

interface UpdateBucketMappingBody {
  courier_name: string;
  status_code: string;
  bucket: number;
  status_label?: string;
  status_description?: string;
}

interface GetMappingsQuery {
  courier_name?: string;
  is_mapped?: boolean;
  bucket?: number;
}

/**
 * Admin controller for managing courier status bucket mappings
 */
export class BucketMappingController {
  private bucketMappingService: BucketMappingService;

  constructor(fastify: FastifyInstance) {
    this.bucketMappingService = new BucketMappingService(fastify);
  }

  /**
   * Get all bucket mappings with optional filtering
   */
  public async getMappings(request: FastifyRequest<{ Querystring: GetMappingsQuery }>, reply: FastifyReply) {
    try {
      const { courier_name, is_mapped, bucket } = request.query;

      const mappings = await this.bucketMappingService.getAllMappings({
        courier_name,
        is_mapped,
        bucket,
      });

      return reply.status(200).send({
        success: true,
        data: mappings,
        message: 'Bucket mappings retrieved successfully',
      });
    } catch (error) {
      request.log.error('Error retrieving bucket mappings:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve bucket mappings',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update bucket mapping for a courier status
   */
  public async updateMapping(request: FastifyRequest<{ Body: UpdateBucketMappingBody }>, reply: FastifyReply) {
    try {
      const { courier_name, status_code, bucket, status_label, status_description } = request.body;

      // Validate required fields
      if (!courier_name || !status_code || bucket === undefined) {
        return reply.status(400).send({
          success: false,
          message: 'courier_name, status_code, and bucket are required',
        });
      }

      // Validate bucket number
      if (!Number.isInteger(bucket) || bucket < 0) {
        return reply.status(400).send({
          success: false,
          message: 'bucket must be a non-negative integer',
        });
      }

      const mapping = await this.bucketMappingService.updateBucketMapping(courier_name.toUpperCase(), status_code, bucket, status_label, status_description);

      return reply.status(200).send({
        success: true,
        data: mapping,
        message: 'Bucket mapping updated successfully',
      });
    } catch (error) {
      request.log.error('Error updating bucket mapping:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to update bucket mapping',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Remove bucket mapping (unmap a status)
   */
  public async removeMapping(
    request: FastifyRequest<{
      Params: { courier_name: string; status_code: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { courier_name, status_code } = request.params;

      await this.bucketMappingService.removeBucketMapping(courier_name.toUpperCase(), status_code);

      return reply.status(200).send({
        success: true,
        message: 'Bucket mapping removed successfully',
      });
    } catch (error) {
      request.log.error('Error removing bucket mapping:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to remove bucket mapping',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Flush all bucket cache
   */
  public async flushCache(request: FastifyRequest, reply: FastifyReply) {
    try {
      await this.bucketMappingService.flushAllCache();

      return reply.status(200).send({
        success: true,
        message: 'All bucket cache flushed successfully',
      });
    } catch (error) {
      request.log.error('Error flushing bucket cache:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to flush bucket cache',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get unmapped statuses for admin review
   */
  public async getUnmappedStatuses(request: FastifyRequest<{ Querystring: { courier_name?: string } }>, reply: FastifyReply) {
    try {
      const { courier_name } = request.query;

      const unmappedStatuses = await this.bucketMappingService.getAllMappings({
        courier_name: courier_name?.toUpperCase(),
        is_mapped: false,
      });

      return reply.status(200).send({
        success: true,
        data: unmappedStatuses,
        message: 'Unmapped statuses retrieved successfully',
      });
    } catch (error) {
      request.log.error('Error retrieving unmapped statuses:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve unmapped statuses',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Bulk update bucket mappings
   */
  public async bulkUpdateMappings(
    request: FastifyRequest<{
      Body: {
        mappings: UpdateBucketMappingBody[];
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { mappings } = request.body;

      if (!Array.isArray(mappings) || mappings.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'mappings array is required and cannot be empty',
        });
      }

      const results = [];
      for (const mapping of mappings) {
        try {
          const result = await this.bucketMappingService.updateBucketMapping(
            mapping.courier_name.toUpperCase(),
            mapping.status_code,
            mapping.bucket,
            mapping.status_label,
            mapping.status_description
          );
          results.push({ success: true, mapping: result });
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            input: mapping,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return reply.status(200).send({
        success: true,
        data: results,
        message: `Bulk update completed: ${successCount} successful, ${failureCount} failed`,
        summary: {
          total: mappings.length,
          successful: successCount,
          failed: failureCount,
        },
      });
    } catch (error) {
      request.log.error('Error in bulk update bucket mappings:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to bulk update bucket mappings',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Register bucket mapping admin routes
 */
export async function registerBucketMappingRoutes(fastify: FastifyInstance) {
  const controller = new BucketMappingController(fastify);

  // Get all mappings
  fastify.get(
    '/admin/bucket-mappings',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            courier_name: { type: 'string' },
            is_mapped: { type: 'boolean' },
            bucket: { type: 'number' },
          },
        },
      },
    },
    controller.getMappings.bind(controller)
  );

  // Update bucket mapping
  fastify.put(
    '/admin/bucket-mappings',
    {
      schema: {
        body: {
          type: 'object',
          required: ['courier_name', 'status_code', 'bucket'],
          properties: {
            courier_name: { type: 'string' },
            status_code: { type: 'string' },
            bucket: { type: 'number' },
            status_label: { type: 'string' },
            status_description: { type: 'string' },
          },
        },
      },
    },
    controller.updateMapping.bind(controller)
  );

  // Remove bucket mapping
  fastify.delete(
    '/admin/bucket-mappings/:courier_name/:status_code',
    {
      schema: {
        params: {
          type: 'object',
          required: ['courier_name', 'status_code'],
          properties: {
            courier_name: { type: 'string' },
            status_code: { type: 'string' },
          },
        },
      },
    },
    controller.removeMapping.bind(controller)
  );

  // Flush all cache
  fastify.post('/admin/bucket-mappings/flush-cache', controller.flushCache.bind(controller));

  // Get unmapped statuses
  fastify.get(
    '/admin/bucket-mappings/unmapped',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            courier_name: { type: 'string' },
          },
        },
      },
    },
    controller.getUnmappedStatuses.bind(controller)
  );

  // Bulk update mappings
  fastify.put(
    '/admin/bucket-mappings/bulk',
    {
      schema: {
        body: {
          type: 'object',
          required: ['mappings'],
          properties: {
            mappings: {
              type: 'array',
              items: {
                type: 'object',
                required: ['courier_name', 'status_code', 'bucket'],
                properties: {
                  courier_name: { type: 'string' },
                  status_code: { type: 'string' },
                  bucket: { type: 'number' },
                  status_label: { type: 'string' },
                  status_description: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    controller.bulkUpdateMappings.bind(controller)
  );
}
