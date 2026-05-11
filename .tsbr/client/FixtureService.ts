import { tsbr } from "./runtime";
type ServiceContract = import("../../services/FixtureService").FixtureService;

export class FixtureService {
  constructor(private readonly runtime: typeof tsbr = tsbr) {}

  async create(name: string): Promise<Awaited<ReturnType<ServiceContract["create"]>>> {
    return this.runtime.call<Awaited<ReturnType<ServiceContract["create"]>>>(0, 0, [name]);
  }

  async listAll(): Promise<Awaited<ReturnType<ServiceContract["listAll"]>>> {
    return this.runtime.call<Awaited<ReturnType<ServiceContract["listAll"]>>>(0, 1, []);
  }

  async updateScore(id: number, score: number): Promise<Awaited<ReturnType<ServiceContract["updateScore"]>>> {
    return this.runtime.call<Awaited<ReturnType<ServiceContract["updateScore"]>>>(0, 2, [id, score]);
  }

  async uploadIcon(name: string, stream: ReadableStream<Uint8Array>): Promise<Awaited<ReturnType<ServiceContract["uploadIcon"]>>> {
    return this.runtime.streamCall<Awaited<ReturnType<ServiceContract["uploadIcon"]>>>(0, 3, [name], stream);
  }
}
