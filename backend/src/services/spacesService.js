// backend/src/services/spacesService.js
import AWS from "aws-sdk";
import multer from "multer";
import path from "path";

// Configurar el cliente de Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.SPACES_ACCESS_KEY,
  secretAccessKey: process.env.SPACES_SECRET_KEY,
});

// Configurar Multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes JPG, JPEG o PNG"));
    }
  },
});

// Función para subir archivo a Spaces
const uploadFileToSpaces = async (file) => {
  const fileName = `images/${Date.now()}_${file.originalname}`;
  const params = {
    Bucket: process.env.SPACES_NAME,
    Key: fileName,
    Body: file.buffer,
    ACL: "public-read",
    ContentType: file.mimetype,
    CacheControl: "max-age=3600", // 1 hora de caché
  };

  const result = await s3.upload(params).promise();
  return {
    Location: `https://${process.env.SPACES_CDN_ENDPOINT}/${fileName}`,
    Key: fileName,
  };
};

export { upload, uploadFileToSpaces };
