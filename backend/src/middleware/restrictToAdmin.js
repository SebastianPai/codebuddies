// src/middleware/restrictToAdmin.js
export const restrictToAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Acceso denegado: Solo administradores" });
  }
  next();
};
