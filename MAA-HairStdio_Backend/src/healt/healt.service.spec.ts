import { Test, TestingModule } from '@nestjs/testing';
import { HealtService } from './healt.service';

describe('HealtService', () => {
  let service: HealtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealtService],
    }).compile();

    service = module.get<HealtService>(HealtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
