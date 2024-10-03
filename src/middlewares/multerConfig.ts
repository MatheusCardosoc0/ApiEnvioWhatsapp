import multer, { StorageEngine } from 'multer';

const storage: StorageEngine = multer.memoryStorage(); 

const limits = {
  fileSize: 20 * 1024 * 1024, // 20 MB
};

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  console.log(file.size)
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Arquivo inválido! Apenas PDFs são permitidos.'));
  }
};

const upload = multer({
  storage, 
  limits, 
  fileFilter, 
});

export default upload;
