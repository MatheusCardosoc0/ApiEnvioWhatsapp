import express from 'express'
import cors from 'cors'
import path from 'path'
import whatsappRoutes from "./routes/whatsappRoutes"
import { restoreClients } from './services/whatsappServices';

const app = express();
app.use(cors());

app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json());

app.use('/api/whatsapp', whatsappRoutes);

const port = 3000;
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

restoreClients().then(() => {
    console.log('Todos os clientes conectados foram restaurados.');
  }).catch((error) => {
    console.error('Erro ao restaurar clientes:', error);
  });

module.exports = app;
