interface PHIPattern {
  name: string;
  pattern: RegExp;
  confidence: 'high' | 'medium' | 'low';
  category: string;
}

interface PHIMatch {
  type: string;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: 'high' | 'medium' | 'low';
  category: string;
}

export class PHIDetector {
  private patterns: PHIPattern[] = [
    // High confidence patterns
    {
      name: 'SSN',
      pattern: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,
      confidence: 'high',
      category: 'identifier'
    },
    {
      name: 'Medicare Number',
      pattern: /\b\d{3}-\d{2}-\d{4}-[A-Z]\b/g,
      confidence: 'high',
      category: 'identifier'
    },
    {
      name: 'Email',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      confidence: 'medium',
      category: 'contact'
    },
    {
      name: 'Phone Number',
      pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      confidence: 'medium',
      category: 'contact'
    },
    {
      name: 'Medical Record Number',
      pattern: /\b(?:MRN|mrn|Medical Record Number)[:\s]?[\w-]{4,20}\b/gi,
      confidence: 'high',
      category: 'medical'
    },
    {
      name: 'Date of Birth',
      pattern: /\b(?:DOB|dob|Date of Birth)[:\s]?\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/gi,
      confidence: 'high',
      category: 'demographic'
    },
    {
      name: 'Credit Card',
      pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
      confidence: 'high',
      category: 'financial'
    },
    {
      name: 'IP Address',
      pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      confidence: 'low',
      category: 'technical'
    },
    // Medium confidence patterns
    {
      name: 'Patient Name Context',
      pattern: /\b(?:patient|Patient|PATIENT)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
      confidence: 'medium',
      category: 'demographic'
    },
    {
      name: 'Doctor Name Context',
      pattern: /\b(?:Dr\.|Doctor|Physician|Provider)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
      confidence: 'medium',
      category: 'provider'
    },
    {
      name: 'Address',
      pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/gi,
      confidence: 'medium',
      category: 'demographic'
    }
  ];

  detect(text: string): PHIMatch[] {
    const matches: PHIMatch[] = [];
    
    this.patterns.forEach(({ name, pattern, confidence, category }) => {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          type: name,
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence,
          category
        });
      }
    });

    // Sort by position to maintain text order
    return matches.sort((a, b) => a.startIndex - b.startIndex);
  }

  analyzeRisk(text: string): {
    riskLevel: 'high' | 'medium' | 'low' | 'none';
    phiCount: number;
    categories: string[];
    highConfidenceCount: number;
  } {
    const matches = this.detect(text);
    
    if (matches.length === 0) {
      return {
        riskLevel: 'none',
        phiCount: 0,
        categories: [],
        highConfidenceCount: 0
      };
    }

    const highConfidenceCount = matches.filter(m => m.confidence === 'high').length;
    const uniqueCategories = [...new Set(matches.map(m => m.category))];

    let riskLevel: 'high' | 'medium' | 'low' | 'none';
    if (highConfidenceCount >= 3 || matches.length >= 5) {
      riskLevel = 'high';
    } else if (highConfidenceCount >= 1 || matches.length >= 3) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      riskLevel,
      phiCount: matches.length,
      categories: uniqueCategories,
      highConfidenceCount
    };
  }

  // Check if text contains any PHI
  containsPHI(text: string): boolean {
    return this.detect(text).length > 0;
  }

  // Get summary statistics
  getSummary(text: string): {
    totalMatches: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byConfidence: Record<string, number>;
  } {
    const matches = this.detect(text);
    
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byConfidence: Record<string, number> = { high: 0, medium: 0, low: 0 };

    matches.forEach(match => {
      byType[match.type] = (byType[match.type] || 0) + 1;
      byCategory[match.category] = (byCategory[match.category] || 0) + 1;
      byConfidence[match.confidence]++;
    });

    return {
      totalMatches: matches.length,
      byType,
      byCategory,
      byConfidence
    };
  }
}

export default PHIDetector;