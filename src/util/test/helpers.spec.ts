import { dashToPascalCase } from '../helpers';


describe('util helpers', () => {

  describe('dashToPascalCase', () => {

    it('alloneword => Alloneword', () => {
      expect(dashToPascalCase('alloneword')).toBe('Alloneword');
    });

    it('all-one-word => AllOneWord', () => {
      expect(dashToPascalCase('all-one-word')).toBe('AllOneWord');
    });

    it('All-One-Word => AllOneWord', () => {
      expect(dashToPascalCase('all-one-word')).toBe('AllOneWord');
    });

  });

});
