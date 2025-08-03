function chooseServer() {
  let server = {};

  if (process.env.NODE_ENV === "development") {
    server.socket = "wss://localhost:4858";
    server.api = "https://localhost:4000";
    // server.socket = "wss://sharethepie.app:4858";
    // server.api = "https://api.sharethepie.app";
  } else {
    server.socket = "wss://share-the-pie-server.fcc.lol:3110";
    server.api = "https://api.share-the-pie.fcc.lol";
  }

  return server;
}

export default chooseServer;
