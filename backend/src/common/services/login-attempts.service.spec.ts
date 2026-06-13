import { LoginAttemptsService } from './login-attempts.service';

const IP = '1.2.3.4';

describe('LoginAttemptsService', () => {
  let service: LoginAttemptsService;

  beforeEach(() => {
    service = new LoginAttemptsService();
  });

  it('isLocked returns false for an unknown IP', () => {
    expect(service.isLocked(IP)).toBe(false);
  });

  it.each([
    { failures: 1, expected: false },
    { failures: 2, expected: false },
    { failures: 3, expected: false },
    { failures: 4, expected: false },
    { failures: 5, expected: true },
  ])(
    'isLocked is $expected after $failures failure(s)',
    ({ failures, expected }) => {
      for (let i = 0; i < failures; i++) service.recordFailure(IP);
      expect(service.isLocked(IP)).toBe(expected);
    },
  );

  it('isLocked returns false and clears the record after the lockout period expires', () => {
    jest.useFakeTimers();
    try {
      for (let i = 0; i < 5; i++) service.recordFailure(IP);
      expect(service.isLocked(IP)).toBe(true);

      jest.advanceTimersByTime(15 * 60 * 1000 + 1);

      expect(service.isLocked(IP)).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('resetAttempts prevents lockout even after 5 failures', () => {
    for (let i = 0; i < 5; i++) service.recordFailure(IP);
    service.resetAttempts(IP);
    expect(service.isLocked(IP)).toBe(false);
  });

  it('getLockoutRemainingSeconds returns 0 for an unlocked IP', () => {
    expect(service.getLockoutRemainingSeconds(IP)).toBe(0);
  });

  it('getLockoutRemainingSeconds returns a positive number when locked', () => {
    for (let i = 0; i < 5; i++) service.recordFailure(IP);
    expect(service.getLockoutRemainingSeconds(IP)).toBeGreaterThan(0);
  });
});
