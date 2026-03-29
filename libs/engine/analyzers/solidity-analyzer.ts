import {
  Analyzer,
  BaseAnalyzer,
  Language,
  Rule,
  AnalysisResult,
  AnalyzerConfig,
  Finding,
  Severity,
} from '../core/analyzer-interface';

export class SolidityAnalyzer extends BaseAnalyzer implements Analyzer {
  private rules: Rule[] = [
    {
      id: 'sol-001',
      name: 'Inefficient Loop',
      description: 'Detects loops that could be optimized to reduce gas consumption',
      severity: Severity.HIGH,
      category: 'gas-optimization',
      enabled: true,
      tags: ['loops', 'gas', 'performance'],
      documentationUrl: 'https://docs.gasguard.dev/rules/sol-001',
      estimatedGasImpact: {
        min: 100,
        max: 5000,
        typical: 1000,
      },
    },
    {
      id: 'sol-002',
      name: 'Use of storage when memory would suffice',
      description: 'Detects unnecessary use of storage variables',
      severity: Severity.HIGH,
      category: 'gas-optimization',
      enabled: true,
      tags: ['storage', 'memory', 'gas'],
      documentationUrl: 'https://docs.gasguard.dev/rules/sol-002',
      estimatedGasImpact: {
        min: 2000,
        max: 20000,
        typical: 5000,
      },
    },
    {
      id: 'sol-003',
      name: 'Uncached array length in loop',
      description: 'Array length should be cached outside of loop to save gas',
      severity: Severity.MEDIUM,
      category: 'gas-optimization',
      enabled: true,
      tags: ['loops', 'arrays', 'gas'],
      documentationUrl: 'https://docs.gasguard.dev/rules/sol-003',
      estimatedGasImpact: {
        min: 50,
        max: 500,
        typical: 200,
      },
    },
    {
      id: 'sol-004',
      name: 'Use of ++ operator instead of ++i',
      description: 'Using ++i is more gas efficient than i++',
      severity: Severity.LOW,
      category: 'gas-optimization',
      enabled: true,
      tags: ['operators', 'gas'],
      documentationUrl: 'https://docs.gasguard.dev/rules/sol-004',
      estimatedGasImpact: {
        min: 5,
        max: 20,
        typical: 10,
      },
    },
    {
      id: 'sol-006',
      name: 'Missing Reentrancy Guard',
      description: 'Functions that transfer ETH or tokens should have reentrancy guards',
      severity: Severity.CRITICAL,
      category: 'security',
      enabled: true,
      tags: ['security', 'reentrancy', 'vulnerability'],
      documentationUrl: 'https://docs.gasguard.dev/rules/sol-006',
    },
    {
      id: 'sol-007',
      name: 'Insecure Fallback Function',
      description: 'Fallback/default handlers should reject unknown calls or enforce strict validation',
      severity: Severity.HIGH,
      category: 'security',
      enabled: true,
      tags: ['security', 'fallback', 'receive', 'validation'],
      documentationUrl: 'https://docs.gasguard.dev/rules/sol-007',
    },
  ];
  
  getName(): string {
    return 'SolidityAnalyzer';
  }
  
  getVersion(): string {
    return '1.0.0';
  }
  
  supportsLanguage(language: Language | string): boolean {
    return language === Language.SOLIDITY || language === 'solidity' || language === 'sol';
  }
  
  getSupportedLanguages(): Language[] {
    return [Language.SOLIDITY];
  }
  
  getRules(): Rule[] {
    return this.rules;
  }
  
  async analyze(
    code: string,
    filePath: string,
    config?: AnalyzerConfig
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const findings: Finding[] = [];
    const errors: Array<{ file: string; message: string; error?: Error }> = [];
    
    // Ensure analyzer is initialized
    if (!this.initialized) {
      await this.initialize(config);
    }
    
    // Check if file should be analyzed
    if (!this.shouldAnalyzeFile(filePath, config)) {
      return {
        findings: [],
        filesAnalyzed: 0,
        analysisTime: Date.now() - startTime,
        analyzerVersion: this.getVersion(),
        summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      };
    }
    
    try {
      // Rule: sol-003 - Uncached array length in loop
      if (this.isRuleEnabled('sol-003', config)) {
        const uncachedArrayLoops = this.detectUncachedArrayLength(code);
        findings.push(...uncachedArrayLoops.map(location => ({
          ruleId: 'sol-003',
          message: 'Array length is not cached in loop. Cache it to save gas.',
          severity: this.getRuleSeverity('sol-003', config),
          location: {
            file: filePath,
            ...location,
          },
          estimatedGasSavings: 200,
          suggestedFix: {
            description: 'Cache array length in a local variable before the loop',
            codeSnippet: 'uint256 length = array.length;\nfor (uint256 i = 0; i < length; ++i) { ... }',
            documentationUrl: 'https://docs.gasguard.dev/rules/sol-003',
          },
        })));
      }
      
      // Rule: sol-004 - Use of i++ instead of ++i
      if (this.isRuleEnabled('sol-004', config)) {
        const inefficientIncrements = this.detectInefficientIncrements(code);
        findings.push(...inefficientIncrements.map(location => ({
          ruleId: 'sol-004',
          message: 'Use ++i instead of i++ to save gas',
          severity: this.getRuleSeverity('sol-004', config),
          location: {
            file: filePath,
            ...location,
          },
          estimatedGasSavings: 10,
          suggestedFix: {
            description: 'Replace i++ with ++i',
            codeSnippet: 'for (uint256 i = 0; i < length; ++i)',
            documentationUrl: 'https://docs.gasguard.dev/rules/sol-004',
          },
        })));
      }
      
      // Rule: sol-005 - Public function that could be external
      if (this.isRuleEnabled('sol-005', config)) {
        const publicFunctions = this.detectPublicFunctionsThatCouldBeExternal(code);
        findings.push(...publicFunctions.map(location => ({
          ruleId: 'sol-005',
          message: 'Function is public but could be external to save gas',
          severity: this.getRuleSeverity('sol-005', config),
          location: {
            file: filePath,
            ...location,
          },
          estimatedGasSavings: 300,
          suggestedFix: {
            description: 'Change function visibility from public to external',
            documentationUrl: 'https://docs.gasguard.dev/rules/sol-005',
          },
        })));
      }
      
      // Rule: sol-006 - Missing Reentrancy Guard
      if (this.isRuleEnabled('sol-006', config)) {
        const missingGuards = this.detectMissingReentrancyGuards(code);
        findings.push(...missingGuards.map(location => ({
          ruleId: 'sol-006',
          message: 'Function transfers ETH/tokens but lacks reentrancy guard',
          severity: this.getRuleSeverity('sol-006', config),
          location: {
            file: filePath,
            ...location,
          },
          suggestedFix: {
            description: 'Add reentrancy guard modifier to prevent reentrancy attacks',
            codeSnippet: 'function withdraw() external nonReentrant { ... }',
            documentationUrl: 'https://docs.gasguard.dev/rules/sol-006',
          },
        })));
      }

      // Rule: sol-007 - Insecure Fallback Function
      if (this.isRuleEnabled('sol-007', config)) {
        const insecureFallbacks = this.detectInsecureFallbackFunctions(code);
        findings.push(...insecureFallbacks.map(location => ({
          ruleId: 'sol-007',
          message: 'Fallback/receive handler is permissive or executes sensitive logic without strict validation',
          severity: this.getRuleSeverity('sol-007', config),
          location: {
            file: filePath,
            ...location,
          },
          suggestedFix: {
            description: 'Keep fallback minimal: reject unknown calls, avoid sensitive logic, and validate accepted ETH transfers',
            codeSnippet: 'fallback() external payable {\n    revert("Unknown function call");\n}',
            documentationUrl: 'https://docs.gasguard.dev/rules/sol-007',
          },
        })));
      }
    } catch (error) {
      errors.push({
        file: filePath,
        message: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error : undefined,
      });
    }
    
    const analysisTime = Date.now() - startTime;
    
    return {
      findings,
      filesAnalyzed: 1,
      analysisTime,
      analyzerVersion: this.getVersion(),
      summary: this.calculateSummary(findings),
      totalEstimatedGasSavings: this.calculateTotalGasSavings(findings),
      errors: errors.length > 0 ? errors : undefined,
    };
  }
  
  
  private isRuleEnabled(ruleId: string, config?: AnalyzerConfig): boolean {
    const cfg = config || this.config;
    
    if (!cfg.rules || !(ruleId in cfg.rules)) {
      // Use default enabled state from rule definition
      const rule = this.getRule(ruleId);
      return rule?.enabled ?? true;
    }
    
    const ruleConfig = cfg.rules[ruleId];
    
    if (typeof ruleConfig === 'boolean') {
      return ruleConfig;
    }
    
    return ruleConfig.enabled ?? true;
  }
  
  
  private getRuleSeverity(ruleId: string, config?: AnalyzerConfig): Severity {
    const cfg = config || this.config;
    const rule = this.getRule(ruleId);
    
    if (!rule) {
      return Severity.MEDIUM;
    }
    
    if (cfg.rules && ruleId in cfg.rules) {
      const ruleConfig = cfg.rules[ruleId];
      if (typeof ruleConfig === 'object' && ruleConfig.severity) {
        return ruleConfig.severity;
      }
    }
    
    return rule.severity;
  }
  
  
  private detectUncachedArrayLength(code: string): Array<{ startLine: number; endLine: number }> {
    const findings: Array<{ startLine: number; endLine: number }> = [];
    const lines = code.split('\n');
    
    // Simple regex to detect for loops with .length in condition
    const forLoopPattern = /for\s*\([^)]*\.length[^)]*\)/;
    
    lines.forEach((line, index) => {
      if (forLoopPattern.test(line)) {
        findings.push({
          startLine: index + 1,
          endLine: index + 1,
        });
      }
    });
    
    return findings;
  }
  
  private detectInefficientIncrements(code: string): Array<{ startLine: number; endLine: number }> {
    const findings: Array<{ startLine: number; endLine: number }> = [];
    const lines = code.split('\n');
    
    // Detect i++ in for loops (but not ++i)
    const inefficientIncrementPattern = /\bi\+\+(?!\s*\))/;
    
    lines.forEach((line, index) => {
      if (line.includes('for') && inefficientIncrementPattern.test(line)) {
        findings.push({
          startLine: index + 1,
          endLine: index + 1,
        });
      }
    });
    
    return findings;
  }
  
  private detectPublicFunctionsThatCouldBeExternal(code: string): Array<{ startLine: number; endLine: number }> {
    const findings: Array<{ startLine: number; endLine: number }> = [];
    const lines = code.split('\n');
    
    // Simple heuristic: public functions that are not called internally
    const publicFunctionPattern = /function\s+\w+\s*\([^)]*\)\s+public/;
    
    lines.forEach((line, index) => {
      if (publicFunctionPattern.test(line)) {
        findings.push({
          startLine: index + 1,
          endLine: index + 1,
        });
      }
    });
    
    return findings;
  }
  
  private detectUnnecessaryStorageUsage(code: string): Array<{ startLine: number; endLine: number }> {
    const findings: Array<{ startLine: number; endLine: number }> = [];
    const lines = code.split('\n');

    // Detect storage variables in function parameters or local variables
    const storagePattern = /\b(string|bytes|uint\[\]|address\[\])\s+storage\s+\w+/;

    lines.forEach((line, index) => {
      if (storagePattern.test(line) && !line.includes('function')) {
        findings.push({
          startLine: index + 1,
          endLine: index + 1,
        });
      }
    });

    return findings;
  }

  private detectMissingReentrancyGuards(code: string): Array<{ startLine: number; endLine: number }> {
    const findings: Array<{ startLine: number; endLine: number }> = [];
    const lines = code.split('\n');

    // Pattern to detect functions that transfer ETH or tokens
    const transferPatterns = [
      /\.transfer\s*\(/,
      /\.send\s*\(/,
      /\.call\s*\{.*value.*\}/,
      /address\s*\(\s*\w+\s*\)\.call\s*\{.*value.*\}/,
      /payable\s*\(\s*\w+\s*\)\.transfer\s*\(/,
      /payable\s*\(\s*\w+\s*\)\.send\s*\(/,
    ];

    // Pattern to detect reentrancy guard modifiers
    const guardPatterns = [
      /\bnonReentrant\b/,
      /\bnoReentrancy\b/,
      /\breentrancyGuard\b/,
      /\block\b/,
    ];

    // Find all function definitions
    const functionPattern = /^\s*function\s+(\w+)\s*\([^}]*\)\s*(\w+)?\s*(\w+)?\s*\{/;

    lines.forEach((line, index) => {
      const functionMatch = line.match(functionPattern);
      if (functionMatch) {
        const functionName = functionMatch[1];
        const functionStartLine = index + 1;

        // Check if function has reentrancy guard
        let hasGuard = false;
        for (let i = Math.max(0, index - 5); i <= Math.min(lines.length - 1, index + 5); i++) {
          const checkLine = lines[i];
          if (guardPatterns.some(pattern => pattern.test(checkLine))) {
            hasGuard = true;
            break;
          }
        }

        // If no guard, check if function transfers ETH/tokens
        if (!hasGuard) {
          // Look for transfer patterns in the function body
          let braceCount = 0;
          let inFunction = false;

          for (let i = index; i < lines.length; i++) {
            const currentLine = lines[i];
            braceCount += (currentLine.match(/\{/g) || []).length;
            braceCount -= (currentLine.match(/\}/g) || []).length;

            if (braceCount === 1 && !inFunction) {
              inFunction = true;
            }

            if (inFunction && transferPatterns.some(pattern => pattern.test(currentLine))) {
              findings.push({
                startLine: functionStartLine,
                endLine: functionStartLine,
              });
              break;
            }

            if (braceCount === 0 && inFunction) {
              break;
            }
          }
        }
      }
    });

    return findings;
  }

  private detectInsecureFallbackFunctions(code: string): Array<{ startLine: number; endLine: number }> {
    const findings: Array<{ startLine: number; endLine: number }> = [];
    const lines = code.split('\n');
    const fallbackDeclarationPattern = /^\s*(fallback|receive)\s*\(\s*\)\s*[^;{]*\{/;

    const hasSensitiveOperation = (body: string): boolean => {
      const sensitivePatterns = [
        /\bdelegatecall\s*\(/,
        /\bcallcode\s*\(/,
        /\bselfdestruct\s*\(/,
        /\.call\s*\{/,
        /\.transfer\s*\(/,
        /\.send\s*\(/,
      ];

      return sensitivePatterns.some(pattern => pattern.test(body));
    };

    const hasStateMutation = (bodyLines: string[]): boolean => {
      const localDeclarationPattern = /^\s*(?:u?int(?:8|16|32|64|128|256)?|address|bool|string|bytes(?:\d+)?|bytes|mapping\s*\(|var|memory|storage)\b/;
      const stateMutationPattern = /\b[A-Za-z_]\w*(?:\[[^\]]+\])?\s*(?:\+\+|--|\+=|-=|\*=|\/=|%=|=)\s*[^=]/;

      for (const line of bodyLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          continue;
        }

        if (trimmed.startsWith('emit ')) {
          continue;
        }

        if (localDeclarationPattern.test(trimmed)) {
          continue;
        }

        if (stateMutationPattern.test(trimmed)) {
          return true;
        }
      }

      return false;
    };

    const hasExplicitReject = (body: string): boolean => {
      return /\brevert\s*\(/.test(body) || /\brequire\s*\(\s*false\b/.test(body) || /\bassert\s*\(\s*false\b/.test(body);
    };

    const hasInputValidation = (body: string): boolean => {
      const validationPatterns = [
        /\brequire\s*\([^)]*msg\.(sender|value|data)[^)]*\)/,
        /\bif\s*\([^)]*msg\.(sender|value|data)[^)]*\)\s*\{?\s*revert\s*\(/,
      ];

      return validationPatterns.some(pattern => pattern.test(body));
    };

    const isOnlyEventsOrNoop = (bodyLines: string[]): boolean => {
      const executable = bodyLines
        .map(line => line.trim())
        .filter(line => line && line !== '{' && line !== '}' && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*'));

      if (executable.length === 0) {
        return true;
      }

      return executable.every(line => line.startsWith('emit ') || line === ';');
    };

    for (let i = 0; i < lines.length; i++) {
      const declarationLine = lines[i];
      const declarationMatch = declarationLine.match(fallbackDeclarationPattern);

      if (!declarationMatch) {
        continue;
      }

      const handlerType = declarationMatch[1];
      const startLine = i + 1;
      let braceDepth = 0;
      const bodyLines: string[] = [];
      let started = false;

      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];
        const openBraces = (currentLine.match(/\{/g) || []).length;
        const closeBraces = (currentLine.match(/\}/g) || []).length;

        if (openBraces > 0) {
          started = true;
        }

        if (started) {
          bodyLines.push(currentLine);
        }

        braceDepth += openBraces;
        braceDepth -= closeBraces;

        if (started && braceDepth === 0) {
          i = j;
          break;
        }
      }

      const body = bodyLines.join('\n');
      const sensitive = hasSensitiveOperation(body);
      const mutatesState = hasStateMutation(bodyLines);
      const explicitReject = hasExplicitReject(body);
      const validatesInput = hasInputValidation(body);
      const eventsOnly = isOnlyEventsOrNoop(bodyLines);

      const insecureFallback =
        handlerType === 'fallback' && !explicitReject && !validatesInput && !eventsOnly;

      const insecureReceive =
        handlerType === 'receive' && (sensitive || mutatesState) && !validatesInput;

      if (sensitive || mutatesState || insecureFallback || insecureReceive) {
        findings.push({
          startLine,
          endLine: startLine,
        });
      }
    }

    return findings;
  }
}