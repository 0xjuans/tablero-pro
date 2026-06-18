import app from './app';

const PORT = process.env.PORT || 4004;

app.listen(PORT, () => {
  console.warn(`✓ Notifications service corriendo en el puerto ${PORT}`);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
