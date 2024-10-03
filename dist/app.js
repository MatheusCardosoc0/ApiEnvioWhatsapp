"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/app.ts
var import_express2 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_path = __toESM(require("path"));

// src/routes/whatsappRoutes.ts
var import_express = __toESM(require("express"));

// src/middlewares/multerConfig.ts
var import_multer = __toESM(require("multer"));
var storage = import_multer.default.memoryStorage();
var limits = {
  fileSize: 20 * 1024 * 1024
  // 20 MB
};
var fileFilter = (req, file, cb) => {
  console.log(file.size);
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Arquivo inv\xE1lido! Apenas PDFs s\xE3o permitidos."));
  }
};
var upload = (0, import_multer.default)({
  storage,
  limits,
  fileFilter
});
var multerConfig_default = upload;

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

// src/controllers/WhatsappController.ts
var generateQrCode = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await whatsappServices_default.initializeWhatsAppAuth(userId);
    if (result.status === "qr") {
      return res.status(200).json({ qrCode: result.qrCode });
    } else if (result.status === "connected") {
      return res.status(200).json({ message: result.message });
    }
    return res.status(500).json({ message: "N\xE3o foi retornado nenhuma resposta do servidor" });
  } catch (error) {
    console.error("Erro ao inicializar o cliente ou gerar o QR Code:", error);
    return res.status(500).json({ error: "Erro ao gerar QR Code ou conectar o cliente." });
  }
};
var ensureClientConnected = async (userId) => {
  const clientStatus = await whatsappServices_default.getClientStatus(userId);
  if (clientStatus !== "connected") {
    console.log(`Cliente ${userId} desconectado, tentando reconectar...`);
    const reconnectResult = await whatsappServices_default.initializeWhatsAppAuth(userId);
    if (reconnectResult.status !== "connected") {
      throw new Error(`N\xE3o foi poss\xEDvel reconectar o cliente ${userId}.`);
    }
    console.log(`Cliente ${userId} reconectado com sucesso!`);
  }
};
var sendMessage2 = async (req, res) => {
  const { userId } = req.params;
  const { number } = req.body;
  const file = req.file;
  try {
    await ensureClientConnected(userId);
    if (file) {
      console.log("Arquivo recebido no servidor:");
      console.log("Nome:", file.originalname);
      console.log("Tamanho (bytes):", file.size);
      console.log("Tipo MIME:", file.mimetype);
      const result = await whatsappServices_default.sendMessage(userId, number, {
        buffer: file.buffer,
        name: file.originalname,
        mimeType: file.mimetype
      });
      return res.status(200).json({ message: "Arquivo enviado com sucesso!" });
    } else {
      return res.status(400).json({ error: "Arquivo PDF n\xE3o foi encontrado na requisi\xE7\xE3o." });
    }
  } catch (error) {
    console.error(`Erro ao enviar a mensagem para o usu\xE1rio ${userId}:`, error);
    return res.status(500).json({ error: "Erro ao enviar mensagem." });
  }
};
var disconnectClient2 = async (req, res) => {
  const { userId } = req.params;
  await ensureClientConnected(userId);
  try {
    const result = await whatsappServices_default.disconnectClient(userId);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`Erro ao desconectar o cliente ${userId}:`, error);
    return res.status(500).json({ error: "Erro ao desconectar o cliente." });
  }
};

// src/routes/whatsappRoutes.ts
var router = import_express.default.Router();
router.get("/qr/:userId", (req, res) => {
  generateQrCode(req, res);
});
router.post("/send-message/:userId", multerConfig_default.single("pdf"), (req, res) => {
  sendMessage2(req, res);
});
router.get("/disconnect/:userId", (req, res) => {
  disconnectClient2(req, res);
});
var whatsappRoutes_default = router;

// src/app.ts
var app = (0, import_express2.default)();
app.use((0, import_cors.default)());
app.use(import_express2.default.static(import_path.default.join(__dirname, "../public")));
app.use(import_express2.default.json());
app.use("/api/whatsapp", whatsappRoutes_default);
var port = 3e3;
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
restoreClients().then(() => {
  console.log("Todos os clientes conectados foram restaurados.");
}).catch((error) => {
  console.error("Erro ao restaurar clientes:", error);
});
module.exports = app;
