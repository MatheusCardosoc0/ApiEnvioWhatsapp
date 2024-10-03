import { PrismaClient } from '@prisma/client';
import { AuthenticationCreds, initAuthCreds, SignalDataTypeMap, SignalKeyStore } from '@whiskeysockets/baileys';
import { encodeCreds, decodeCreds } from './infra/credSerialization';

const prisma = new PrismaClient();

interface DatabaseAuthState {
    creds: AuthenticationCreds;
    keys: SignalKeyStore;
}

export const usePrismaAuthState = async (userId: string) => {
    const existingAuth = await prisma.whatsAppAuth.findUnique({
        where: { userId },
    });

    let state: DatabaseAuthState;

    if (!existingAuth) {
        state = {
            creds: initAuthCreds(),
            keys: {
                get: async (type, ids) => {
                    const result: { [id: string]: SignalDataTypeMap[typeof type] } = {};
                    const keys = await prisma.key.findMany({
                        where: {
                            userId,
                            type,
                            keyId: { in: ids },
                        },
                    });
                    keys.forEach((key) => {
                        // Verifica se o valor é uma string antes de passar para decodeCreds
                        const rawValue = key.value;
                        if (typeof rawValue === 'string') {
                            result[key.keyId] = decodeCreds(rawValue) as SignalDataTypeMap[typeof type]; // Decodifica o valor recuperado
                        } else {
                            console.error(`Valor inválido para a chave ${key.keyId}`);
                        }
                    });
                    return result;
                },
                set: async (data) => {
                    for (const type in data) {
                        for (const id in data[type as keyof SignalDataTypeMap]) {
                            const rawValue = data[type as keyof SignalDataTypeMap]![id];
                            const value = encodeCreds(rawValue); // Codifica o valor antes de salvar

                            if (value !== null && value !== undefined) {
                                await prisma.key.upsert({
                                    where: { userId_type_keyId: { userId, type, keyId: id } }, // Certifique-se de usar o id como string
                                    update: { value },
                                    create: {
                                        userId,
                                        type,
                                        keyId: id,
                                        value,
                                    },
                                });
                            }
                        }
                    }
                },
                clear: async () => {
                    await prisma.key.deleteMany({
                        where: { userId },
                    });
                },
            },
        };
    } else {
        state = {
            creds: decodeCreds(existingAuth.creds as string) as AuthenticationCreds, // Decodifica as credenciais armazenadas como string
            keys: {
                get: async (type, ids) => {
                    const result: { [id: string]: SignalDataTypeMap[typeof type] } = {};
                    const keys = await prisma.key.findMany({
                        where: {
                            userId,
                            type,
                            keyId: { in: ids }, // Usando `keyId` corretamente
                        },
                    });
                    keys.forEach((key: any) => {
                        // Verifica se o valor é uma string antes de decodificar
                        const rawValue = key.value;
                        if (typeof rawValue === 'string') {
                            result[key.keyId] = decodeCreds(rawValue) as SignalDataTypeMap[typeof type]; // Decodifica os dados
                        } else {
                            console.error(`Valor inválido para a chave ${key.keyId}`);
                        }
                    });
                    return result;
                },
                set: async (data) => {
                    for (const type in data) {
                        for (const id in data[type as keyof SignalDataTypeMap]) {
                            const rawValue = data[type as keyof SignalDataTypeMap]![id];
                            const value = encodeCreds(rawValue); // Codifica antes de armazenar

                            if (value !== null && value !== undefined) {
                                await prisma.key.upsert({
                                    where: { userId_type_keyId: { userId, type, keyId: id } },
                                    update: { value },
                                    create: {
                                        userId,
                                        type,
                                        keyId: id,
                                        value,
                                    },
                                });
                            }
                        }
                    }
                },
                clear: async () => {
                    await prisma.key.deleteMany({
                        where: { userId },
                    });
                },
            },
        };
    }

    const saveCreds = async () => {
        await prisma.whatsAppAuth.upsert({
            where: { userId },
            update: {
                creds: encodeCreds(state.creds), // Codifica antes de armazenar
                isConnected: true, // ou false, dependendo do estado atual
            },
            create: {
                userId,
                creds: encodeCreds(state.creds), // Codifica antes de armazenar
                isConnected: false, // ou true, dependendo da lógica de criação
                qrCode: null, // Inclua qualquer valor default para o QR Code, se necessário
                lastMessage: new Date(), // Você pode configurar esse campo com o valor atual
                createdAt: new Date(), // Preenche a data de criação, se necessário
                updatedAt: new Date(), // Preenche a data de atualização
            },
        });
    };
    

    return {
        state,
        saveCreds,
    };
};
