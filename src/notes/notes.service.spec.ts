import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../db/prisma.service';
import { NotesService } from './notes.service';

describe('NotesService', () => {
  let service: NotesService;

  const mockNote = {
    id: 1,
    userId: 1,
    text: 'Test note',
    embedding: Buffer.from(new Float32Array([0.1, 0.2, 0.3]).buffer),
    createdAt: new Date(),
  };

  const mockPrismaService = {
    note: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);

    // Mock config values
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'EMBEDDING_DIM':
          return 384;
        case 'EMBEDDING_API_URL':
          return undefined;
        case 'EMBEDDING_API_KEY':
          return undefined;
        default:
          return undefined;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addNote', () => {
    it('should successfully add a note', async () => {
      mockPrismaService.note.create.mockResolvedValue(mockNote);

      const result = await service.addNote(1, 'Test note');

      expect(result).toEqual(mockNote);
      expect(mockPrismaService.note.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          text: 'Test note',
          embedding: expect.any(Buffer),
        },
      });
    });

    it('should generate embedding for note text', async () => {
      mockPrismaService.note.create.mockResolvedValue(mockNote);

      await service.addNote(1, 'Test note');

      const createCall = mockPrismaService.note.create.mock.calls[0][0];
      expect(createCall.data.embedding).toBeInstanceOf(Buffer);
      expect(createCall.data.embedding.length).toBe(384 * 4); // 384 floats * 4 bytes
    });
  });

  describe('searchNotes', () => {
    beforeEach(() => {
      // Mock the in-memory notes map
      const mockEmbedding = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        mockEmbedding[i] = Math.sin(i * 0.1) * 0.5;
      }

      (service as any).userNotes.set(1, [
        {
          id: 1,
          text: 'Test note about swords',
          embedding: mockEmbedding,
          createdAt: new Date(),
        },
        {
          id: 2,
          text: 'Another note about magic',
          embedding: new Float32Array(384).fill(0.1),
          createdAt: new Date(),
        },
      ]);
    });

    it('should return search results', async () => {
      const results = await service.searchNotes(1, 'sword', 5);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('text');
      expect(results[0]).toHaveProperty('similarity');
      expect(results[0].similarity).toBeGreaterThanOrEqual(0);
      expect(results[0].similarity).toBeLessThanOrEqual(1);
    });

    it('should return empty array when no notes exist', async () => {
      const results = await service.searchNotes(999, 'query', 5);

      expect(results).toHaveLength(0);
    });

    it('should limit results to topK', async () => {
      const results = await service.searchNotes(1, 'query', 1);

      expect(results).toHaveLength(1);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([1, 0, 0]);
      const c = new Float32Array([0, 1, 0]);

      // Identical vectors should have similarity of 1
      const similarity1 = (service as any).cosineSimilarity(a, b);
      expect(similarity1).toBeCloseTo(1, 5);

      // Orthogonal vectors should have similarity of 0
      const similarity2 = (service as any).cosineSimilarity(a, c);
      expect(similarity2).toBeCloseTo(0, 5);
    });

    it('should throw error for different length vectors', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([1, 0, 0]);

      expect(() => (service as any).cosineSimilarity(a, b)).toThrow(
        'Vectors must have the same length',
      );
    });
  });

  describe('generateHashEmbedding', () => {
    it('should generate consistent embeddings for same text', () => {
      const text = 'Test text';
      const embedding1 = (service as any).generateHashEmbedding(text);
      const embedding2 = (service as any).generateHashEmbedding(text);

      expect(embedding1).toEqual(embedding2);
    });

    it('should generate different embeddings for different text', () => {
      const embedding1 = (service as any).generateHashEmbedding('Text 1');
      const embedding2 = (service as any).generateHashEmbedding('Text 2');

      expect(embedding1).not.toEqual(embedding2);
    });

    it('should generate embeddings of correct dimension', () => {
      const embedding = (service as any).generateHashEmbedding('Test');
      expect(embedding).toHaveLength(384);
    });
  });
});
