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

// src/authStore.ts
var authStore_exports = {};
__export(authStore_exports, {
  usePrismaAuthState: () => usePrismaAuthState
});
module.exports = __toCommonJS(authStore_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  usePrismaAuthState
});
