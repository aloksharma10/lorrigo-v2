import { FastifyInstance } from 'fastify';
import { PlanController } from './controllers/plan.controller';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';
import { PlanService } from './services/plan.service';
import { CreatePlanSchema, UpdatePlanSchema, CalculateRatesSchema } from './schemas';

export default async function planRoutes(fastify: FastifyInstance) {
   const planService = new PlanService(fastify);
   const planController = new PlanController(planService);

   fastify.addHook('onRequest', fastify.authenticate);

   // Get all plans (accessible by ADMIN and SELLER)
   fastify.get(
      '/',
      {
         preHandler: [authorizeRoles([Role.ADMIN, Role.SELLER, Role.SUBADMIN, Role.SALESPERSON])],
         handler: planController.getAllPlans.bind(planController),
      },
   );

   // Get plan by ID (accessible by ADMIN and SELLER)
   fastify.get<{ Params: { id: string } }>(
      '/:id',
      {
         preHandler: [authorizeRoles([Role.ADMIN, Role.SELLER, Role.SUBADMIN, Role.SALESPERSON])],
         handler: planController.getPlanById.bind(planController),
      },
   );

   // Create new plan (accessible only by ADMIN)
   fastify.post(
      '/',
      {
         preHandler: [authorizeRoles([Role.ADMIN])],
         handler: planController.createPlan.bind(planController),
      },
   );

   // Update plan (accessible only by ADMIN)
   fastify.put<{ Params: { id: string } }>(
      '/:id',
      {
         preHandler: [authorizeRoles([Role.ADMIN])],
         handler: planController.updatePlan.bind(planController),
      },
   );

   // Delete plan (accessible only by ADMIN)
   fastify.delete<{ Params: { id: string } }>(
      '/:id',
      {
         preHandler: [authorizeRoles([Role.ADMIN])],
         handler: planController.deletePlan.bind(planController),
      },
   );

   // Assign plan to user (accessible only by ADMIN)
   fastify.post<{ Params: { planId: string; userId: string } }>(
      '/assign/:planId/user/:userId',
      {
         preHandler: [authorizeRoles([Role.ADMIN])],
         handler: planController.assignPlanToUser.bind(planController),
      },
   );

   // Calculate shipping rate based on user's plan
   fastify.post(
      '/calculate-rates',
      {
         preHandler: [authorizeRoles([Role.ADMIN, Role.SELLER, Role.SUBADMIN, Role.SALESPERSON])],
         handler: planController.calculateRates.bind(planController),
      },
   );
} 