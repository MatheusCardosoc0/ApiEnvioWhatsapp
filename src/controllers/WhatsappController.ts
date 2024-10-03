import { Request, Response } from 'express';
import whatsappService from '../services/whatsappServices';
import { prisma } from '../infra/prisma';

export const generateQrCode = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params;

    try {
        const result = await whatsappService.initializeWhatsAppAuth(userId);

        if (result.status === 'qr') {
            return res.status(200).json({ qrCode: result.qrCode });
        } else if (result.status === 'connected') {
            return res.status(200).json({ message: result.message });
        }

        return res.status(500).json({message: "Não foi retornado nenhuma resposta do servidor"})
    } catch (error) {
        console.error('Erro ao inicializar o cliente ou gerar o QR Code:', error);
        return res.status(500).json({ error: 'Erro ao gerar QR Code ou conectar o cliente.' });
    }
};

const ensureClientConnected = async (userId: string) => {
    // Verificar se o cliente está desconectado
    const clientStatus = await whatsappService.getClientStatus(userId);

    if (clientStatus !== 'connected') {
        console.log(`Cliente ${userId} desconectado, tentando reconectar...`);
        // Tenta reconectar o cliente
        const reconnectResult = await whatsappService.initializeWhatsAppAuth(userId);
        if (reconnectResult.status !== 'connected') {
            throw new Error(`Não foi possível reconectar o cliente ${userId}.`);
        }
        console.log(`Cliente ${userId} reconectado com sucesso!`);
    }
};

// Controlador para processar o arquivo enviado
export const sendMessage = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params;
    const { number } = req.body;
    const file = req.file;

    try {
        await ensureClientConnected(userId);

        if (file) {
            // Verificando o tamanho do arquivo recebido
            console.log("Arquivo recebido no servidor:");
            console.log("Nome:", file.originalname);
            console.log("Tamanho (bytes):", file.size);  // Tamanho do arquivo
            console.log("Tipo MIME:", file.mimetype);

            const result = await whatsappService.sendMessage(userId, number, {
                buffer: file.buffer,
                name: file.originalname,
                mimeType: file.mimetype,
            });

            return res.status(200).json({ message: "Arquivo enviado com sucesso!" });
        } else {
            return res.status(400).json({ error: "Arquivo PDF não foi encontrado na requisição." });
        }
    } catch (error) {
        console.error(`Erro ao enviar a mensagem para o usuário ${userId}:`, error);
        return res.status(500).json({ error: 'Erro ao enviar mensagem.' });
    }
};


export const disconnectClient = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params;
    await ensureClientConnected(userId)
    try {
        const result = await whatsappService.disconnectClient(userId);
        return res.status(200).json(result);
    } catch (error) {
        console.error(`Erro ao desconectar o cliente ${userId}:`, error);
        return res.status(500).json({ error: 'Erro ao desconectar o cliente.' });
    }
};