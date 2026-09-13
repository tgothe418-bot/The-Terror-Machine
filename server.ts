import dotenv from 'dotenv';
dotenv.config({ override: true });

async function startServer() {
  // Load application modules only after dotenv has populated process.env. Several
  // provider policies read their startup defaults while those modules initialize.
  const { createApp } = await import('./server/app');
  const app = await createApp();
  const PORT = Number(process.env.PORT) || 3000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
