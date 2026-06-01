/**
 * Example: Testing Solidity Rules with the GasGuard Testing Framework
 * 
 * This demonstrates how to use the RuleTester with fixtures and snapshots
 */

import { RuleTester } from '../../libs/testing/src/rule-tester';
import { FixtureLoader } from '../../libs/testing/src/fixture-loader';
import { SnapshotManager } from '../../libs/testing/src/snapshot-manager';
import { RuleAssertions } from '../../libs/testing/src/assertions';
import { SolidityAnalyzer } from '../../libs/engine/analyzers/solidity-analyzer';

describe('Solidity Rule Tests', () => {
  let analyzer: SolidityAnalyzer;
  let tester: RuleTester;
  let snapshotManager: SnapshotManager;

  beforeAll(async () => {
    analyzer = new SolidityAnalyzer();
    await analyzer.initialize();
    
    tester = new RuleTester(analyzer, {
      snapshotEnabled: false,
      verbose: true,
    });
    
    snapshotManager = new SnapshotManager('./tests/rules/__snapshots__');
  });

  describe('sol-003: Uncached Array Length', () => {
    it('should detect uncached array.length in for loop', async () => {
      const fixture = FixtureLoader.loadFixture(
        './tests/rules/fixtures/sol-003-uncached-array.json'
      );

      const result = await tester.runFixture(fixture);
      
      expect(result.passed).toBe(true);
      expect(result.matchedExpected.length).toBe(1);
      expect(result.missedExpected.length).toBe(0);
      expect(result.unexpectedFindings.length).toBe(0);
    });

    it('should NOT flag cached array.length', async () => {
      const code = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract OptimizedContract {
    uint[] public numbers;
    
    function sumNumbers() public view returns (uint) {
        uint total = 0;
        uint length = numbers.length;
        for (uint i = 0; i < length; i++) {
            total += numbers[i];
        }
        return total;
    }
}
`;

      const result = await analyzer.analyze(code, 'optimized.sol');
      
      // Should not have sol-003 violations
      RuleAssertions.assertNotHasFinding(result.findings, 'sol-003');
    });
  });

  describe('sol-006: Missing Reentrancy Guard', () => {
    it('should detect missing reentrancy guard on withdraw function', async () => {
      const fixture = FixtureLoader.loadFixture(
        './tests/rules/fixtures/sol-006-reentrancy.json'
      );

      const result = await tester.runFixture(fixture);
      
      expect(result.passed).toBe(true);
      expect(result.matchedExpected.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT flag function with nonReentrant modifier', async () => {
      const code = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureBank is ReentrancyGuard {
    mapping(address => uint) public balances;
    
    function withdraw(uint amount) public nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
`;

      const result = await analyzer.analyze(code, 'secure-bank.sol');
      
      // Should not have sol-006 violations
      RuleAssertions.assertNotHasFinding(result.findings, 'sol-006');
    });
  });

  describe('Rule Assertions', () => {
    it('should provide helpful assertion messages', async () => {
      const code = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestContract {
    uint[] public numbers;
    
    function process() public view {
        for (uint i = 0; i < numbers.length; i++) {
            // do something
        }
    }
}
`;

      const result = await analyzer.analyze(code, 'test.sol');
      
      // Test various assertions
      RuleAssertions.assertHasFinding(result.findings, 'sol-003');
      RuleAssertions.assertFindingSeverity(result.findings, 'sol-003', 'medium');
      RuleAssertions.assertFindingAtLine(result.findings, 'sol-003', 9, 1);
      RuleAssertions.assertFindingMessage(
        result.findings, 
        'sol-003', 
        'Array length is not cached'
      );
    });
  });

  describe('Fixture Loading', () => {
    it('should load fixtures from directory', () => {
      const fixtures = FixtureLoader.loadFixturesFromDir(
        './tests/rules/fixtures'
      );
      
      expect(fixtures.length).toBeGreaterThan(0);
      
      // Each fixture should have required fields
      for (const fixture of fixtures) {
        expect(fixture.id).toBeDefined();
        expect(fixture.name).toBeDefined();
        expect(fixture.input).toBeDefined();
        expect(fixture.expectedFindings).toBeDefined();
      }
    });

    it('should load test suites', () => {
      const suite = FixtureLoader.loadTestSuite(
        './tests/rules/suites/sol-003-suite.json'
      );
      
      expect(suite.ruleId).toBe('sol-003');
      expect(suite.fixtures.length).toBeGreaterThan(0);
    });
  });

  // Helper config to isolate a single rule by disabling all others
  function isolateRule(ruleId: string): any {
    const allRuleIds = [
      'sol-003', 'sol-004', 'sol-005', 'sol-006', 'sol-007',
      'sol-008', 'sol-009', 'sol-010', 'sol-011', 'sol-012',
      'sol-018'
    ];
    const rules: any = {};
    for (const id of allRuleIds) {
      rules[id] = { enabled: id === ruleId };
    }
    return { rules };
  }

  describe('sol-018: Event Parameter Indexing Opportunities', () => {
    it('should detect non-indexed event parameters', async () => {
      const code = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EventsContract {
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event BalanceUpdated(address user, uint256 newBalance);
    event Approval(address owner, address spender, uint256 amount);
}
`;

      const result = await analyzer.analyze(code, 'test018.sol', isolateRule('sol-018'));
      RuleAssertions.assertHasFinding(result.findings, 'sol-018');
      const sol018Findings = result.findings.filter(f => f.ruleId === 'sol-018');
      expect(sol018Findings.length).toBeGreaterThanOrEqual(3);
    });

    it('should NOT flag fully indexed events', async () => {
      const code = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GoodEvents {
    event Transfer(address indexed from, address indexed to, uint256 indexed amount);
}
`;

      const result = await analyzer.analyze(code, 'good-events.sol', isolateRule('sol-018'));
      RuleAssertions.assertNotHasFinding(result.findings, 'sol-018');
    });
  });

  describe('Batch Testing', () => {
    it('should run multiple fixtures and generate report', async () => {
      const fixtures = FixtureLoader.loadFixturesFromDir(
        './tests/rules/fixtures'
      );

      const summary = await tester.runAll(fixtures);
      
      const report = tester.generateReport(summary.results);
      console.log(report);
      
      expect(summary.passed + summary.failed).toBe(summary.results.length);
    });
  });
});
