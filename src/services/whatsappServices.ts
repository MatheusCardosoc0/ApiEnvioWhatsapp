import { usePrismaAuthState } from "../authStore";
import { prisma } from "../infra/prisma";
import {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  SignalKeyStore,
  prepareWAMessageMedia,
} from "@whiskeysockets/baileys";
import { encodeCreds } from "../infra/credSerialization";
import fs from "fs";
import pino from "pino";

interface ClientData {
  sock: any;
  isConnected: boolean;
}

let clients: Record<string, ClientData> = {};

export const initializeWhatsAppAuth = async (
  userId: string
): Promise<{ status: string; qrCode?: string; message?: string }> => {
  try {
    if (clients[userId]?.isConnected) {
      return {
        status: "connected",
        message: `Usuário ${userId} já está conectado.`,
      };
    }

    console.log(`Iniciando WhatsApp para o usuário: ${userId}`);

    const { state, saveCreds } = await usePrismaAuthState(userId);
    const { version } = await fetchLatestBaileysVersion();

    let client = await prisma.whatsAppAuth.findUnique({
      where: { userId },
    });

    console.log("Estado inicial recuperado:", { clientExists: !!client });

    if (!client) {
      const keysToCreate: Array<{
        type: string;
        keyId: string;
        value: string;
      }> = [];

      console.log("Coletando preKeys");
      const preKeyData = await state.keys.get("pre-key", []);
      Object.keys(preKeyData).forEach((keyId) => {
        keysToCreate.push({
          type: "pre-key",
          keyId,
          value: encodeCreds(preKeyData[keyId]),
        });
      });

      console.log("Coletando sessions");
      const sessionData = await state.keys.get("session", []);
      Object.keys(sessionData).forEach((keyId) => {
        keysToCreate.push({
          type: "session",
          keyId,
          value: encodeCreds(sessionData[keyId]),
        });
      });

      console.log("Coletando senderKeys");
      const senderKeyData = await state.keys.get("sender-key", []);
      Object.keys(senderKeyData).forEach((keyId) => {
        keysToCreate.push({
          type: "sender-key",
          keyId,
          value: encodeCreds(senderKeyData[keyId]),
        });
      });

      console.log("Coletando appStateSyncKeys");
      const appStateSyncKeyData = await state.keys.get(
        "app-state-sync-key",
        []
      );
      Object.keys(appStateSyncKeyData).forEach((keyId) => {
        keysToCreate.push({
          type: "app-state-sync-key",
          keyId,
          value: encodeCreds(appStateSyncKeyData[keyId]),
        });
      });

      console.log("Criando registro no banco de dados para o usuário:", userId);
      client = await prisma.whatsAppAuth.create({
        data: {
          userId,
          isConnected: false,
          qrCode: null,
          creds: encodeCreds(state.creds),
          Keys: {
            create: keysToCreate,
          },
        },
      });
    }

    console.log("Credenciais antes da criptografia:", state.creds);
    console.log(
      "Tipo de noiseKey private:",
      typeof state.creds.noiseKey.private
    );
    console.log("NoiseKey Private Data:", state.creds.noiseKey.private);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
    });

    clients[userId] = { sock, isConnected: false };

    return new Promise((resolve) => {
      sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log("QR Code gerado para o usuário:", userId);
          await prisma.whatsAppAuth.update({
            where: { userId },
            data: { qrCode: qr },
          });
          resolve({ status: "qr", qrCode: qr });
        }

        if (connection === "close") {
          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !==
            DisconnectReason.loggedOut;

          if (lastDisconnect?.error?.output?.statusCode === 409) {
            console.log("Conflito detectado, forçando logout e reconexão...");
            await sock.logout();
            // Agora usando setTimeout para evitar chamadas rápidas repetitivas
            setTimeout(() => initializeWhatsAppAuth(userId), 1000);
          } else if (shouldReconnect) {
            console.log("Tentando reconectar o usuário:", userId);
            setTimeout(() => initializeWhatsAppAuth(userId), 1000);
          } else {
            console.log("Usuário desconectado e removido:", userId);
            delete clients[userId];
            await prisma.whatsAppAuth.delete({
              where: { userId },
            });
          }
        }

        if (connection === "open") {
          console.log(`Usuário ${userId} conectado com sucesso!`);
          clients[userId].isConnected = true;
          await prisma.whatsAppAuth.update({
            where: { userId },
            data: { isConnected: true, qrCode: null },
          });
          resolve({
            status: "connected",
            message: `Usuário ${userId} conectado com sucesso!`,
          });
        }
      });

      sock.ev.on("creds.update", saveCreds);
    });
  } catch (error) {
    console.error("Erro ao inicializar o WhatsApp Auth:", error);
    throw new Error("Falha ao inicializar o WhatsApp Auth.");
  }
};

export const getClient = (userId: string) => {
  return clients[userId];
};

type FileData = { buffer: Buffer, name: string, mimeType: string };

// Função principal para enviar a mensagem
export const sendMessage = async (
  userId: string, 
  number: string, 
  fileData?: FileData, 
  timeout: number = 60000 // Timeout padrão de 60 segundos
): Promise<void> => {
  const jid = `${number}@s.whatsapp.net`;
  const clientData = getClient(userId) as ClientData;

  if (!clientData || !clientData.sock) {
    throw new Error('Cliente não encontrado. Autentique-se primeiro.');
  }

  await initializeWhatsAppAuth(userId);

  try {
    if (fileData) {
      console.log("Tamanho do buffer a ser enviado:", fileData.buffer.length); // Verificar tamanho antes do envio
      
      // Enviar mensagem com controle de timeout
      await sendMessageWithTimeout(clientData, jid, {
        document: fileData.buffer, 
        mimetype: fileData.mimeType, 
        fileName: fileData.name
      }, timeout);
    } else {
      await sendMessageWithTimeout(clientData, jid, { text: 'Sua mensagem' }, timeout);
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw new Error('Erro ao enviar mensagem.');
  }
};

// Função auxiliar para implementar o timeout com tipagem adequada
const sendMessageWithTimeout = async (
  clientData: ClientData, 
  jid: string, 
  messageContent: any, 
  timeout: number
): Promise<void> => {
  // Promise que envia a mensagem
  const sendMessagePromise = clientData.sock.sendMessage(jid, messageContent);

  // Promise que rejeita após o tempo limite
  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('Tempo limite de envio excedido')), timeout)
  );

  // Retorna a primeira Promise que se resolve ou rejeita
  return Promise.race([sendMessagePromise, timeoutPromise]);
};


export const getClientStatus = async (userId: string): Promise<string> => {
  const clientData = getClient(userId); // Função para pegar o cliente autenticado
  
  if (!clientData || !clientData.sock) {
      return 'disconnected'; // Cliente não está conectado ou não foi encontrado
  }

  // Verifique se o socket está ativo
  if (clientData.sock?.state === 'open') {
      return 'connected'; // Cliente está conectado
  }

  return 'disconnected'; // Cliente não está conectado
};





export const disconnectClient = async (
  userId: string
): Promise<{ message: string }> => {
  try {
    const clientData = getClient(userId);

    // Verifica se o cliente está desconectado
    if (!clientData || !clientData.sock) {
      console.log(`Usuário ${userId} já está desconectado.`);
      return { message: `Cliente ${userId} já está desconectado.` };
    }

    // Busca o cliente no banco de dados
    let client = await prisma.whatsAppAuth.findUnique({
      where: { userId },
    });

    // Caso não encontre o cliente no banco de dados
    if (!client) {
      console.log("Não foi encontrada conexão para esse usuário");
      return { message: "Não foi encontrada conexão para esse usuário" };
    }

    // Se o cliente estiver conectado, realiza o logout
    if (clientData?.sock) {
      await clientData.sock.logout();
      console.log(`Cliente ${userId} foi desconectado com sucesso no WhatsApp.`);
    }

    // Remove o cliente da memória
    delete clients[userId];

    // Remove o cliente do banco de dados
    await prisma.whatsAppAuth.delete({ where: { userId } });
    console.log(`Registro do cliente ${userId} foi removido do banco de dados.`);

    return { message: `Cliente ${userId} foi desconectado com sucesso.` };
  } catch (error) {
    console.error(`Erro ao desconectar o cliente ${userId}:`, error);
    throw new Error(`Erro ao desconectar o cliente ${userId}.`);
  }
};


export const restoreClients = async () => {
  const allClients = await prisma.whatsAppAuth.findMany({
    where: { isConnected: true },
  });

  for (const client of allClients) {
    if (!clients[client.userId]?.isConnected) {
      console.log(`Restaurando cliente ${client.userId}`);
      await initializeWhatsAppAuth(client.userId);
    }
  }
};

export default {
  disconnectClient,
  initializeWhatsAppAuth,
  sendMessage,
  restoreClients,
  getClientStatus
};
