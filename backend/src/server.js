require("dotenv").config();

const app = require("./app");

const PORT = Number(process.env.PORT || 5001);

const server = app.listen(PORT, () => {
  console.log(`KKCommerce backend listening on port ${PORT}`);
  console.log(
    `Environment: ${process.env.NODE_ENV || "development"} | Payments: ${
      String(process.env.PAYMENTS_ENABLED || "false").toLowerCase() === "true"
        ? "enabled"
        : "disabled"
    }`
  );
});

function shutdown(signal) {
  console.log(`${signal} received. Closing HTTP server...`);
  server.close(() => process.exit(0));

  const timer = setTimeout(() => process.exit(1), 10000);
  if (typeof timer.unref === "function") timer.unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
