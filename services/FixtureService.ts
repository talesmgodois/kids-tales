import { TSBR } from "../tsbr/decorators";

interface FixtureRecord {
  id: number;
  name: string;
  score: number;
}

@TSBR(1)
export class FixtureService {
  private readonly fixtures: FixtureRecord[] = [];
  private nextId = 1;

  create(name: string) {
    const fixture: FixtureRecord = {
      id: this.nextId++,
      name,
      score: 0,
    };

    this.fixtures.push(fixture);
    return fixture;
  }

  listAll() {
    return this.fixtures;
  }

  updateScore(id: number, score: number) {
    const fixture = this.fixtures.find((item) => item.id === id);
    if (!fixture) {
      throw new Error(`Fixture ${id} not found`);
    }

    fixture.score = score;
    return fixture;
  }

  async uploadIcon(name: string, stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    let totalBytes = 0;

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      totalBytes += chunk.value.byteLength;
    }

    return {
      name,
      bytes: totalBytes,
    };
  }
}
