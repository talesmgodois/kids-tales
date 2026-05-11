import { FixtureService } from "./services/FixtureService";
import { TSBRServer } from "./tsbr/TSBRServer";

const server = new TSBRServer();
server.register([new FixtureService()]);

const app = server.serve(3000);
console.log(`TSBR server running on port ${app.port}`);
