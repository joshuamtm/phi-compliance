import CryptoJS from 'crypto-js';
import { PHIDetector, PHIMatch } from './phiDetector';

export interface RedactionOptions {
  redactionChar: string;
  preserveLength: boolean;
  showPartial: boolean;
  partialChars: number;
  useHash: boolean;
  hashPrefix: string;
}

export interface RedactionResult {
  redactedText: string;
  matches: PHIMatch[];
  redactionCount: number;
  originalLength: number;
  redactedLength: number;
}

export class PHIRedactor {
  private detector: PHIDetector;
  private defaultOptions: RedactionOptions = {
    redactionChar: '*',
    preserveLength: true,
    showPartial: false,
    partialChars: 2,
    useHash: false,
    hashPrefix: 'HASH_'
  };

  constructor() {
    this.detector = new PHIDetector();
  }

  redact(text: string, options: Partial<RedactionOptions> = {}): RedactionResult {
    const opts = { ...this.defaultOptions, ...options };
    const matches = this.detector.detect(text);
    
    if (matches.length === 0) {
      return {
        redactedText: text,
        matches: [],
        redactionCount: 0,
        originalLength: text.length,
        redactedLength: text.length
      };
    }

    let redactedText = text;

    // Process matches in reverse order to maintain indices
    matches.reverse().forEach(match => {
      const replacement = this.generateReplacement(match.value, opts);
      const startPos = match.startIndex;
      const endPos = match.endIndex;
      
      redactedText = 
        redactedText.substring(0, startPos) + 
        replacement + 
        redactedText.substring(endPos);
    });

    return {
      redactedText,
      matches: matches.reverse(), // Return to original order
      redactionCount: matches.length,
      originalLength: text.length,
      redactedLength: redactedText.length
    };
  }

  private generateReplacement(value: string, options: RedactionOptions): string {
    if (options.useHash) {
      const hash = CryptoJS.SHA256(value).toString().substring(0, 8);
      return `${options.hashPrefix}${hash}`;
    }

    if (options.showPartial && value.length > options.partialChars * 2) {
      const start = value.substring(0, options.partialChars);
      const end = value.substring(value.length - options.partialChars);
      const middleLength = value.length - (options.partialChars * 2);
      const middle = options.redactionChar.repeat(middleLength);
      return `${start}${middle}${end}`;
    }

    if (options.preserveLength) {
      return options.redactionChar.repeat(value.length);
    }

    return `[${options.redactionChar}REDACTED${options.redactionChar}]`;
  }

  // Batch redaction for multiple texts
  redactBatch(texts: string[], options: Partial<RedactionOptions> = {}): RedactionResult[] {
    return texts.map(text => this.redact(text, options));
  }

  // Redact specific PHI types only
  redactByType(text: string, allowedTypes: string[], options: Partial<RedactionOptions> = {}): RedactionResult {
    const matches = this.detector.detect(text).filter(match => 
      allowedTypes.includes(match.type)
    );

    if (matches.length === 0) {
      return {
        redactedText: text,
        matches: [],
        redactionCount: 0,
        originalLength: text.length,
        redactedLength: text.length
      };
    }

    const opts = { ...this.defaultOptions, ...options };
    let redactedText = text;

    matches.reverse().forEach(match => {
      const replacement = this.generateReplacement(match.value, opts);
      redactedText = 
        redactedText.substring(0, match.startIndex) + 
        replacement + 
        redactedText.substring(match.endIndex);
    });

    return {
      redactedText,
      matches: matches.reverse(),
      redactionCount: matches.length,
      originalLength: text.length,
      redactedLength: redactedText.length
    };
  }

  // Safe preview - shows structure but redacts all PHI
  createSafePreview(text: string, maxLength: number = 200): string {
    const result = this.redact(text, {
      redactionChar: '█',
      preserveLength: false,
      showPartial: false,
      useHash: false
    });

    return result.redactedText.length > maxLength 
      ? result.redactedText.substring(0, maxLength) + '...'
      : result.redactedText;
  }
}

export default PHIRedactor;