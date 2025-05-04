import Fastify from 'fastify';
import { prisma } from '@lorrigo/db';

const port = parseInt(process.env.PORT || '4000', 10);
const server = Fastify();

server.get('/', async (request, reply) => {
  return { hello: 'world' };
});

server.get('/create', async (request, reply) => {
  const user = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: `john${Date.now()}@example.com`,
    },
  });
  return { hello: 'world', user };
});

server.get('/users', async (request, reply) => {
  const users = await prisma.user.findMany();
  return { users };
});

const start = async () => {
  try {
    await server.listen({ port: port, host: '0.0.0.0' });
    console.log(`API server listening on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
