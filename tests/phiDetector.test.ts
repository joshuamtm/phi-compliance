import { PHIDetector } from '../src/utils/phiDetector';

describe('PHIDetector', () => {
  let detector: PHIDetector;

  beforeEach(() => {
    detector = new PHIDetector();
  });

  describe('SSN Detection', () => {
    test('should detect formatted SSN', () => {
      const text = 'Patient SSN: 123-45-6789';
      const matches = detector.detect(text);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('SSN');
      expect(matches[0].value).toBe('123-45-6789');
      expect(matches[0].confidence).toBe('high');
    });

    test('should detect unformatted SSN', () => {
      const text = 'Social Security Number 123456789';
      const matches = detector.detect(text);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('SSN');
      expect(matches[0].value).toBe('123456789');
    });
  });

  describe('Email Detection', () => {
    test('should detect email addresses', () => {
      const text = 'Contact: patient@hospital.com for questions';
      const matches = detector.detect(text);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('Email');
      expect(matches[0].value).toBe('patient@hospital.com');
      expect(matches[0].confidence).toBe('medium');
    });
  });

  describe('Phone Number Detection', () => {
    test('should detect formatted phone numbers', () => {
      const text = 'Call (555) 123-4567 for appointments';
      const matches = detector.detect(text);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('Phone Number');
      expect(matches[0].confidence).toBe('medium');
    });

    test('should detect various phone formats', () => {
      const texts = [
        '555-123-4567',
        '555.123.4567',
        '555 123 4567',
        '(555) 123-4567'
      ];

      texts.forEach(text => {
        const matches = detector.detect(text);
        expect(matches).toHaveLength(1);
        expect(matches[0].type).toBe('Phone Number');
      });
    });
  });

  describe('Medical Record Number Detection', () => {
    test('should detect MRN patterns', () => {
      const text = 'MRN: MED123456789';
      const matches = detector.detect(text);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('Medical Record Number');
      expect(matches[0].confidence).toBe('high');
    });
  });

  describe('Date of Birth Detection', () => {
    test('should detect DOB patterns', () => {
      const text = 'DOB: 01/15/1990';
      const matches = detector.detect(text);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('Date of Birth');
      expect(matches[0].confidence).toBe('high');
    });
  });

  describe('Risk Analysis', () => {
    test('should identify high risk content', () => {
      const text = 'Patient: John Doe, SSN: 123-45-6789, DOB: 01/15/1990, MRN: MED123456';
      const risk = detector.analyzeRisk(text);
      
      expect(risk.riskLevel).toBe('high');
      expect(risk.phiCount).toBeGreaterThan(2);
      expect(risk.highConfidenceCount).toBeGreaterThan(1);
    });

    test('should identify medium risk content', () => {
      const text = 'Contact patient@email.com or call 555-123-4567';
      const risk = detector.analyzeRisk(text);
      
      expect(risk.riskLevel).toBe('medium');
      expect(risk.phiCount).toBe(2);
    });

    test('should identify low risk content', () => {
      const text = 'Patient seems to be recovering well';
      const risk = detector.analyzeRisk(text);
      
      expect(risk.riskLevel).toBe('none');
      expect(risk.phiCount).toBe(0);
    });
  });

  describe('Summary Statistics', () => {
    test('should provide accurate summary', () => {
      const text = 'Patient SSN: 123-45-6789, Email: test@test.com, Phone: 555-123-4567';
      const summary = detector.getSummary(text);
      
      expect(summary.totalMatches).toBe(3);
      expect(summary.byConfidence.high).toBe(1); // SSN
      expect(summary.byConfidence.medium).toBe(2); // Email + Phone
      expect(summary.byCategory.identifier).toBe(1);
      expect(summary.byCategory.contact).toBe(2);
    });
  });

  describe('containsPHI', () => {
    test('should return true for text with PHI', () => {
      const text = 'Patient SSN: 123-45-6789';
      expect(detector.containsPHI(text)).toBe(true);
    });

    test('should return false for text without PHI', () => {
      const text = 'This is just regular text';
      expect(detector.containsPHI(text)).toBe(false);
    });
  });

  describe('Multiple Matches', () => {
    test('should detect multiple PHI instances', () => {
      const text = `
        Patient Information:
        Name: John Doe
        SSN: 123-45-6789
        Email: john.doe@email.com
        Phone: (555) 123-4567
        DOB: 01/15/1990
        MRN: MED123456789
      `;
      
      const matches = detector.detect(text);
      expect(matches.length).toBeGreaterThan(3);
      
      const types = matches.map(m => m.type);
      expect(types).toContain('SSN');
      expect(types).toContain('Email');
      expect(types).toContain('Phone Number');
      expect(types).toContain('Date of Birth');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string', () => {
      const matches = detector.detect('');
      expect(matches).toHaveLength(0);
    });

    test('should handle special characters', () => {
      const text = 'SSN: 123-45-6789! Email: test@test.com.';
      const matches = detector.detect(text);
      expect(matches.length).toBeGreaterThan(0);
    });

    test('should maintain order of matches', () => {
      const text = 'First: 123-45-6789, Second: test@test.com, Third: 555-123-4567';
      const matches = detector.detect(text);
      
      expect(matches[0].startIndex).toBeLessThan(matches[1].startIndex);
      expect(matches[1].startIndex).toBeLessThan(matches[2].startIndex);
    });
  });
});