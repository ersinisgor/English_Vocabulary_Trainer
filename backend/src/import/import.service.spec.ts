import { Test, TestingModule } from '@nestjs/testing';
import { ImportService } from './import.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ImportService.parseExampleSentence', () => {
  let service: ImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get(ImportService);
  });

  it('extracts hidden words and builds numbered placeholders', () => {
    const result = service.parseExampleSentence(
      'I {{noticed}} that she {{noticed}} the mistake.',
    );

    expect(result.sentence).toBe('I noticed that she noticed the mistake.');
    expect(result.clozeTemplate).toBe('I {{1}} that she {{2}} the mistake.');
    expect(result.answers).toEqual(['noticed', 'noticed']);
  });

  it('handles a single hidden word', () => {
    const result = service.parseExampleSentence('She {{ran}} home.');

    expect(result.sentence).toBe('She ran home.');
    expect(result.clozeTemplate).toBe('She {{1}} home.');
    expect(result.answers).toEqual(['ran']);
  });

  it('returns no cloze template when there are no markers', () => {
    const result = service.parseExampleSentence('A plain sentence.');

    expect(result.sentence).toBe('A plain sentence.');
    expect(result.clozeTemplate).toBeUndefined();
    expect(result.answers).toEqual([]);
  });

  it('trims whitespace inside markers', () => {
    const result = service.parseExampleSentence('He {{ went }} away.');

    expect(result.sentence).toBe('He went away.');
    expect(result.answers).toEqual(['went']);
  });

  it('handles empty input', () => {
    const result = service.parseExampleSentence('');

    expect(result.sentence).toBe('');
    expect(result.clozeTemplate).toBeUndefined();
    expect(result.answers).toEqual([]);
  });
});

describe('ImportService.extractWordFamily', () => {
  let service: ImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportService, { provide: PrismaService, useValue: {} }],
    }).compile();
    service = module.get(ImportService);
  });

  it('reads the canonical word_family header', () => {
    expect(
      service.extractWordFamily({ word_family: ' notice, noticeable ' } as any),
    ).toBe('notice, noticeable');
  });

  it('tolerates alternative header spellings', () => {
    expect(service.extractWordFamily({ wordFamily: 'a, b' } as any)).toBe('a, b');
    expect(service.extractWordFamily({ 'Word Family': 'c, d' } as any)).toBe(
      'c, d',
    );
  });

  it('returns undefined when missing or empty', () => {
    expect(service.extractWordFamily({} as any)).toBeUndefined();
    expect(service.extractWordFamily({ word_family: '   ' } as any)).toBeUndefined();
  });

  it('reads the canonical word_family_meaning header', () => {
    expect(
      service.extractWordFamilyMeaning({
        word_family_meaning: ' fark etmek, gözle görülür ',
      } as any),
    ).toBe('fark etmek, gözle görülür');
  });

  it('tolerates alternative word_family_meaning header spellings', () => {
    expect(
      service.extractWordFamilyMeaning({ wordFamilyMeaning: 'a, b' } as any),
    ).toBe('a, b');
    expect(
      service.extractWordFamilyMeaning({ 'Word Family Meaning': 'c, d' } as any),
    ).toBe('c, d');
  });

  it('returns undefined when word_family_meaning is missing or empty', () => {
    expect(service.extractWordFamilyMeaning({} as any)).toBeUndefined();
    expect(
      service.extractWordFamilyMeaning({ word_family_meaning: '   ' } as any),
    ).toBeUndefined();
  });
});
