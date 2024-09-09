import logger from "../utils/logger.js";

export const serverError = (err, req, res, next) => {
  logger.log({
    level: "error",
    message: err.stack,
  });

  res.status(500).render("error/500.ejs", { error: err.message });
};
