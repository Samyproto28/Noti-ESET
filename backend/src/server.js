// Importación ES6 para consistencia con el resto del proyecto
import app from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor backend NotiESET escuchando en puerto ${PORT}`);
});
