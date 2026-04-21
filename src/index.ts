const PORT = parseInt(process.env.PORT ?? "3000");

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    if (url.pathname === "/") {
      return Response.json({
        name: "kids-tales",
        version: process.env.APP_VERSION ?? "dev",
        message: "Welcome to Kids Tales!",
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Kids Tales server running on port ${server.port}`);
