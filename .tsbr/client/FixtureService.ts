import { tsbr } from "./runtime";

type ServiceContract = import("../../services/FixtureService").FixtureService;

export class FixtureService {
  constructor(private readonly runtime: typeof tsbr = tsbr) {}

  async create(name: string): Promise<Awaited<ReturnType<ServiceContract["create"]>>> {
    return this.runtime.call<Awaited<ReturnType<ServiceContract["create"]>>>(1, 0, [name]);
  }

  async listAll(): Promise<Awaited<ReturnType<ServiceContract["listAll"]>>> {
    return this.runtime.call<Awaited<ReturnType<ServiceContract["listAll"]>>>(1, 1, []);
  }

  async updateScore(
    id: number,
    score: number,
  ): Promise<Awaited<ReturnType<ServiceContract["updateScore"]>>> {
    return this.runtime.call<Awaited<ReturnType<ServiceContract["updateScore"]>>>(1, 2, [
      id,
      score,
    ]);
  }

  async uploadIcon(
    name: string,
    stream: ReadableStream<Uint8Array>,
  ): Promise<Awaited<ReturnType<ServiceContract["uploadIcon"]>>> {
    return this.runtime.streamCall<Awaited<ReturnType<ServiceContract["uploadIcon"]>>>(1, 3, [
      name,
    ], stream);
  }
}
