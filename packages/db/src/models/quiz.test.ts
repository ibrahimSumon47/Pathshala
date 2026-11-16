import { describe, expect, it } from 'vitest';
import { scoreQuiz } from './quiz';

describe('scoreQuiz', () => {
  const questions = [
    { correctIndexes: [0], points: 1 },
    { correctIndexes: [0, 2], points: 2 },
  ];

  it('awards points only for an exact answer on each question', () => {
    expect(scoreQuiz(questions, [[0], [0, 2]])).toEqual({ score: 3, maxScore: 3, passed: true });
    expect(scoreQuiz(questions, [[0], [0]])).toEqual({ score: 1, maxScore: 3, passed: false });
  });

  it('ignores duplicate selections and order', () => {
    expect(scoreQuiz(questions, [[0, 0], [2, 0]])).toEqual({ score: 3, maxScore: 3, passed: true });
  });

  it('passes at sixty percent and fails below it', () => {
    expect(scoreQuiz([{ correctIndexes: [0], points: 6 }, { correctIndexes: [1], points: 4 }], [[0], [0]]).passed).toBe(true);
    expect(scoreQuiz([{ correctIndexes: [0], points: 5 }, { correctIndexes: [1], points: 5 }, { correctIndexes: [2], points: 5 }], [[0], [0], [0]]).passed).toBe(false);
  });

  it('never passes an empty quiz', () => {
    expect(scoreQuiz([], [])).toEqual({ score: 0, maxScore: 0, passed: false });
  });
});
