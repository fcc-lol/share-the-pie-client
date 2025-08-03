function chooseServer() {
  let server = {};

  if (process.env.NODE_ENV === "development") {
    server.socket = "wss://localhost:4858";
    server.api = "https://localhost:4000";
  } else {
    server.socket = "wss://share-the-pie-server.fcc.lol";
    server.api = "https://share-the-pie-server.fcc.lol";
  }

  return server;
}

export default chooseServer;
