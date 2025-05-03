import Fastify from 'fastify';

const port = parseInt(process.env.PORT || '4000', 10);
const server = Fastify();

server.get('/', async (request, reply) => {
  return { hello: 'world' };
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
