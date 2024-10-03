"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/services/whatsappServices.ts
var whatsappServices_exports = {};
__export(whatsappServices_exports, {
  default: () => whatsappServices_default,
  disconnectClient: () => disconnectClient,
  getClient: () => getClient,
  getClientStatus: () => getClientStatus,
  initializeWhatsAppAuth: () => initializeWhatsAppAuth,
  restoreClients: () => restoreClients,
  sendMessage: () => sendMessage
});
module.exports = __toCommonJS(whatsappServices_exports);

// src/authStore.ts
var import_client = require("@prisma/client");
var import_baileys = require("@whiskeysockets/baileys");

// src/infra/credSerialization.ts
var encodeCreds = (creds) => {
  return JSON.stringify(creds, (key, value) => {
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      return {
        type: "Buffer",
        data: Array.from(value)
        // Converte Buffer ou Uint8Array em array
      };
    }
    return value;
  });
};
var decodeCreds = (credsString) => {
  return JSON.parse(credsString, (key, value) => {
    if (value && value.type && value.data && Array.isArray(value.data)) {
      return Buffer.from(value.data);
    }
    return value;
  });
};

// src/authStore.ts
var prisma = new import_client.PrismaClient();
var usePrismaAuthState = async (userId) => {
  const existingAuth = await prisma.whatsAppAuth.findUnique({
    where: { userId }
  });
  let state;
  if (!existingAuth) {
    state = {
      creds: (0, import_baileys.initAuthCreds)(),
      keys: {
        get: async (type, ids) => {
          const result = {};
          const keys = await prisma.key.findMany({
            where: {
              userId,
              type,
              keyId: { in: ids }
            }
          });
          keys.forEach((key) => {
            const rawValue = key.value;
            if (typeof rawValue === "string") {
              result[key.keyId] = decodeCreds(rawValue);
            } else {
              console.error(`Valor inv\xE1lido para a chave ${key.keyId}`);
            }
          });
          return result;
        },
        set: async (data) => {
          for (const type in data) {
            for (const id in data[type]) {
              const rawValue = data[type][id];
              const value = encodeCreds(rawValue);
              if (value !== null && value !== void 0) {
                await prisma.key.upsert({
                  where: { userId_type_keyId: { userId, type, keyId: id } },
                  // Certifique-se de usar o id como string
                  update: { value },
                  create: {
                    userId,
                    type,
                    keyId: id,
                    value
                  }
                });
              }
            }
          }
        },
        clear: async () => {
          await prisma.key.deleteMany({
            where: { userId }
          });
        }
      }
    };
  } else {
    state = {
      creds: decodeCreds(existingAuth.creds),
      // Decodifica as credenciais armazenadas como string
      keys: {
        get: async (type, ids) => {
          const result = {};
          const keys = await prisma.key.findMany({
            where: {
              userId,
              type,
              keyId: { in: ids }
              // Usando `keyId` corretamente
            }
          });
          keys.forEach((key) => {
            const rawValue = key.value;
            if (typeof rawValue === "string") {
              result[key.keyId] = decodeCreds(rawValue);
            } else {
              console.error(`Valor inv\xE1lido para a chave ${key.keyId}`);
            }
          });
          return result;
        },
        set: async (data) => {
          for (const type in data) {
            for (const id in data[type]) {
              const rawValue = data[type][id];
              const value = encodeCreds(rawValue);
              if (value !== null && value !== void 0) {
                await prisma.key.upsert({
                  where: { userId_type_keyId: { userId, type, keyId: id } },
                  update: { value },
                  create: {
                    userId,
                    type,
                    keyId: id,
                    value
                  }
                });
              }
            }
          }
        },
        clear: async () => {
          await prisma.key.deleteMany({
            where: { userId }
          });
        }
      }
    };
  }
  const saveCreds = async () => {
    await prisma.whatsAppAuth.upsert({
      where: { userId },
      update: {
        creds: encodeCreds(state.creds),
        // Codifica antes de armazenar
        isConnected: true
        // ou false, dependendo do estado atual
      },
      create: {
        userId,
        creds: encodeCreds(state.creds),
        // Codifica antes de armazenar
        isConnected: false,
        // ou true, dependendo da lógica de criação
        qrCode: null,
        // Inclua qualquer valor default para o QR Code, se necessário
        lastMessage: /* @__PURE__ */ new Date(),
        // Você pode configurar esse campo com o valor atual
        createdAt: /* @__PURE__ */ new Date(),
        // Preenche a data de criação, se necessário
        updatedAt: /* @__PURE__ */ new Date()
        // Preenche a data de atualização
      }
    });
  };
  return {
    state,
    saveCreds
  };
};

// src/infra/prisma.ts
var import_client2 = require("@prisma/client");
var prisma2 = new import_client2.PrismaClient();

// src/services/whatsappServices.ts
var import_baileys2 = require("@whiskeysockets/baileys");
var clients = {};
var initializeWhatsAppAuth = async (userId) => {
  try {
    if (clients[userId]?.isConnected) {
      return {
        status: "connected",
        message: `Usu\xE1rio ${userId} j\xE1 est\xE1 conectado.`
      };
    }
    console.log(`Iniciando WhatsApp para o usu\xE1rio: ${userId}`);
    const { state, saveCreds } = await usePrismaAuthState(userId);
    const { version } = await (0, import_baileys2.fetchLatestBaileysVersion)();
    let client = await prisma2.whatsAppAuth.findUnique({
      where: { userId }
    });
    console.log("Estado inicial recuperado:", { clientExists: !!client });
    if (!client) {
      const keysToCreate = [];
      console.log("Coletando preKeys");
      const preKeyData = await state.keys.get("pre-key", []);
      Object.keys(preKeyData).forEach((keyId) => {
        keysToCreate.push({
          type: "pre-key",
          keyId,
          value: encodeCreds(preKeyData[keyId])
        });
      });
      console.log("Coletando sessions");
      const sessionData = await state.keys.get("session", []);
      Object.keys(sessionData).forEach((keyId) => {
        keysToCreate.push({
          type: "session",
          keyId,
          value: encodeCreds(sessionData[keyId])
        });
      });
      console.log("Coletando senderKeys");
      const senderKeyData = await state.keys.get("sender-key", []);
      Object.keys(senderKeyData).forEach((keyId) => {
        keysToCreate.push({
          type: "sender-key",
          keyId,
          value: encodeCreds(senderKeyData[keyId])
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
          value: encodeCreds(appStateSyncKeyData[keyId])
        });
      });
      console.log("Criando registro no banco de dados para o usu\xE1rio:", userId);
      client = await prisma2.whatsAppAuth.create({
        data: {
          userId,
          isConnected: false,
          qrCode: null,
          creds: encodeCreds(state.creds),
          Keys: {
            create: keysToCreate
          }
        }
      });
    }
    console.log("Credenciais antes da criptografia:", state.creds);
    console.log(
      "Tipo de noiseKey private:",
      typeof state.creds.noiseKey.private
    );
    console.log("NoiseKey Private Data:", state.creds.noiseKey.private);
    const sock = (0, import_baileys2.makeWASocket)({
      version,
      auth: state,
      printQRInTerminal: false
    });
    clients[userId] = { sock, isConnected: false };
    return new Promise((resolve) => {
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          console.log("QR Code gerado para o usu\xE1rio:", userId);
          await prisma2.whatsAppAuth.update({
            where: { userId },
            data: { qrCode: qr }
          });
          resolve({ status: "qr", qrCode: qr });
        }
        if (connection === "close") {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== import_baileys2.DisconnectReason.loggedOut;
          if (lastDisconnect?.error?.output?.statusCode === 409) {
            console.log("Conflito detectado, for\xE7ando logout e reconex\xE3o...");
            await sock.logout();
            setTimeout(() => initializeWhatsAppAuth(userId), 1e3);
          } else if (shouldReconnect) {
            console.log("Tentando reconectar o usu\xE1rio:", userId);
            setTimeout(() => initializeWhatsAppAuth(userId), 1e3);
          } else {
            console.log("Usu\xE1rio desconectado e removido:", userId);
            delete clients[userId];
            await prisma2.whatsAppAuth.delete({
              where: { userId }
            });
          }
        }
        if (connection === "open") {
          console.log(`Usu\xE1rio ${userId} conectado com sucesso!`);
          clients[userId].isConnected = true;
          await prisma2.whatsAppAuth.update({
            where: { userId },
            data: { isConnected: true, qrCode: null }
          });
          resolve({
            status: "connected",
            message: `Usu\xE1rio ${userId} conectado com sucesso!`
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
var getClient = (userId) => {
  return clients[userId];
};
var sendMessage = async (userId, number, fileData, timeout = 6e4) => {
  const jid = `${number}@s.whatsapp.net`;
  const clientData = getClient(userId);
  if (!clientData || !clientData.sock) {
    throw new Error("Cliente n\xE3o encontrado. Autentique-se primeiro.");
  }
  await initializeWhatsAppAuth(userId);
  try {
    if (fileData) {
      console.log("Tamanho do buffer a ser enviado:", fileData.buffer.length);
      await sendMessageWithTimeout(clientData, jid, {
        document: fileData.buffer,
        mimetype: fileData.mimeType,
        fileName: fileData.name
      }, timeout);
    } else {
      await sendMessageWithTimeout(clientData, jid, { text: "Sua mensagem" }, timeout);
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    throw new Error("Erro ao enviar mensagem.");
  }
};
var sendMessageWithTimeout = async (clientData, jid, messageContent, timeout) => {
  const sendMessagePromise = clientData.sock.sendMessage(jid, messageContent);
  const timeoutPromise = new Promise(
    (_, reject) => setTimeout(() => reject(new Error("Tempo limite de envio excedido")), timeout)
  );
  return Promise.race([sendMessagePromise, timeoutPromise]);
};
var getClientStatus = async (userId) => {
  const clientData = getClient(userId);
  if (!clientData || !clientData.sock) {
    return "disconnected";
  }
  if (clientData.sock?.state === "open") {
    return "connected";
  }
  return "disconnected";
};
var disconnectClient = async (userId) => {
  try {
    const clientData = getClient(userId);
    if (!clientData || !clientData.sock) {
      console.log(`Usu\xE1rio ${userId} j\xE1 est\xE1 desconectado.`);
      return { message: `Cliente ${userId} j\xE1 est\xE1 desconectado.` };
    }
    let client = await prisma2.whatsAppAuth.findUnique({
      where: { userId }
    });
    if (!client) {
      console.log("N\xE3o foi encontrada conex\xE3o para esse usu\xE1rio");
      return { message: "N\xE3o foi encontrada conex\xE3o para esse usu\xE1rio" };
    }
    if (clientData?.sock) {
      await clientData.sock.logout();
      console.log(`Cliente ${userId} foi desconectado com sucesso no WhatsApp.`);
    }
    delete clients[userId];
    await prisma2.whatsAppAuth.delete({ where: { userId } });
    console.log(`Registro do cliente ${userId} foi removido do banco de dados.`);
    return { message: `Cliente ${userId} foi desconectado com sucesso.` };
  } catch (error) {
    console.error(`Erro ao desconectar o cliente ${userId}:`, error);
    throw new Error(`Erro ao desconectar o cliente ${userId}.`);
  }
};
var restoreClients = async () => {
  const allClients = await prisma2.whatsAppAuth.findMany({
    where: { isConnected: true }
  });
  for (const client of allClients) {
    if (!clients[client.userId]?.isConnected) {
      console.log(`Restaurando cliente ${client.userId}`);
      await initializeWhatsAppAuth(client.userId);
    }
  }
};
var whatsappServices_default = {
  disconnectClient,
  initializeWhatsAppAuth,
  sendMessage,
  restoreClients,
  getClientStatus
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  disconnectClient,
  getClient,
  getClientStatus,
  initializeWhatsAppAuth,
  restoreClients,
  sendMessage
});
