import { prisma } from '@lorrigo/db';
export async function safeGlobalSearch(searchTerm: string, type?: 'ORDER' | 'SHIPMENT' | 'USER' | 'CUSTOMER') {
  if (type) {
    return prisma.$queryRaw`
       SELECT * FROM global_search 
       WHERE type = ${type} AND search_key LIKE ${'%' + searchTerm + '%'}
       ORDER BY "createdAt" DESC 
       LIMIT 50
     `;
  } else {
    return prisma.$queryRaw`
       SELECT * FROM global_search 
       WHERE search_key LIKE ${'%' + searchTerm + '%'}
       ORDER BY "createdAt" DESC 
       LIMIT 50
     `;
  }
}
