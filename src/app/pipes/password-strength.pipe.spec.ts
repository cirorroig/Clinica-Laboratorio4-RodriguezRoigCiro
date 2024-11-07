import { PasswordStrengthPipe } from './password-strength.pipe';

describe('PasswordStrengthPipe', () => {
  it('create an instance', () => {
    const pipe = new PasswordStrengthPipe();
    expect(pipe).toBeTruthy();
  });
});
