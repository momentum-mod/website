import { Test, TestingModule } from '@nestjs/testing';
import { UserRepo } from './user.repo';

describe('UserRepo', () => {
  let service: UserRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRepo],
    }).compile();

    service = module.get<UserRepo>(UserRepo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
