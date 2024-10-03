import express, { Request, Response } from 'express';
import multerConfig from '../middlewares/multerConfig';
import * as whatsappController from '../controllers/WhatsappController';

const router = express.Router();


router.get('/qr/:userId', (req: Request, res: Response) => {
  whatsappController.generateQrCode(req, res);
});


router.post('/send-message/:userId', multerConfig.single('pdf'), (req: Request, res: Response) => {
  whatsappController.sendMessage(req, res);
});


router.get('/disconnect/:userId', (req: Request, res: Response) => {
  whatsappController.disconnectClient(req, res);
});

export default router;
