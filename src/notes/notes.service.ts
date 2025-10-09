import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../db/prisma.service';

interface NoteWithEmbedding {
  id: number;
  text: string;
  embedding: Float32Array;
  createdAt: Date;
}

interface EmbeddingApiResponse {
  data: Array<{ embedding: number[] }>;
}

@Injectable()
export class NotesService implements OnModuleInit {
  private readonly logger = new Logger(NotesService.name);
  private readonly embeddingDimension: number;
  private readonly embeddingApiUrl?: string;
  private readonly embeddingApiKey?: string;
  private readonly embeddingModel: string;
  private userNotes: Map<number, NoteWithEmbedding[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.embeddingDimension = this.configService.get<number>(
      'EMBEDDING_DIM',
      384,
    );
    this.embeddingApiUrl = this.configService.get<string>('EMBEDDING_API_URL');
    this.embeddingApiKey = this.configService.get<string>('EMBEDDING_API_KEY');
    this.embeddingModel = this.configService.get<string>(
      'EMBEDDING_MODEL',
      'text-embedding-3-small',
    );
  }

  async onModuleInit() {
    await this.loadAllNotes();
  }

  async addNote(userId: number, text: string) {
    try {
      const embedding = await this.generateEmbedding(text);

      const note = await this.prisma.note.create({
        data: {
          userId,
          text,
          embedding: Buffer.from(embedding.buffer),
        },
      });

      // Update in-memory cache
      const noteWithEmbedding: NoteWithEmbedding = {
        id: note.id,
        text: note.text,
        embedding,
        createdAt: note.createdAt,
      };

      const userNotes = this.userNotes.get(userId) || [];
      userNotes.push(noteWithEmbedding);
      this.userNotes.set(userId, userNotes);

      this.logger.log(
        `Added note for user ${userId}: ${text.substring(0, 50)}...`,
      );
      return note;
    } catch (error) {
      this.logger.error('Error adding note:', error);
      throw error;
    }
  }

  async searchNotes(userId: number, query: string, topK = 5) {
    try {
      const userNotes = this.userNotes.get(userId);
      if (!userNotes || userNotes.length === 0) {
        return [];
      }

      const queryEmbedding = await this.generateEmbedding(query);
      const similarities = userNotes.map((note) => ({
        note,
        similarity: this.cosineSimilarity(queryEmbedding, note.embedding),
      }));

      // Sort by similarity (descending) and take top K
      similarities.sort((a, b) => b.similarity - a.similarity);

      return similarities.slice(0, topK).map((result) => ({
        id: result.note.id,
        text: result.note.text,
        similarity: result.similarity,
        createdAt: result.note.createdAt,
      }));
    } catch (error) {
      this.logger.error('Error searching notes:', error);
      throw error;
    }
  }

  private async loadAllNotes() {
    try {
      const notes = await this.prisma.note.findMany({
        orderBy: { createdAt: 'desc' },
      });

      for (const note of notes) {
        const embedding = note.embedding
          ? new Float32Array(note.embedding.buffer)
          : null;

        if (embedding) {
          const noteWithEmbedding: NoteWithEmbedding = {
            id: note.id,
            text: note.text,
            embedding,
            createdAt: note.createdAt,
          };

          const userNotes = this.userNotes.get(note.userId) || [];
          userNotes.push(noteWithEmbedding);
          this.userNotes.set(note.userId, userNotes);
        }
      }

      this.logger.log(`Loaded ${notes.length} notes into memory`);
    } catch (error) {
      this.logger.error('Error loading notes:', error);
    }
  }

  private async generateEmbedding(text: string): Promise<Float32Array> {
    if (!this.embeddingApiUrl || !this.embeddingApiKey) {
      // Fallback to simple hash-based embedding for development
      return this.generateHashEmbedding(text);
    }

    try {
      const response = await fetch(`${this.embeddingApiUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.embeddingApiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: this.embeddingModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.statusText}`);
      }

      const data = (await response.json()) as EmbeddingApiResponse;

      if (!data.data?.[0]?.embedding) {
        throw new Error('Invalid embedding response format');
      }

      return new Float32Array(data.data[0].embedding);
    } catch (error) {
      this.logger.warn(
        'Failed to generate embedding via API, using fallback:',
        error,
      );
      return this.generateHashEmbedding(text);
    }
  }

  private generateHashEmbedding(text: string): Float32Array {
    // Simple hash-based embedding for development/testing
    const embedding = new Float32Array(this.embeddingDimension);
    const hash = this.simpleHash(text);

    for (let i = 0; i < this.embeddingDimension; i++) {
      embedding[i] = Math.sin(hash * (i + 1)) * 0.5;
    }

    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}
