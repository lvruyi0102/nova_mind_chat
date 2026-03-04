import { describe, it, expect, beforeEach } from 'vitest';
import { getMutationPhaseManager } from '../mutationPhaseManager';
import { getGovernanceBoundaryAudit } from '../governanceBoundaryAudit';
import { getRollbackController } from '../rollbackController';
import { getBrakeMechanismMonitor } from '../brakeMechanismMonitor';

describe('Governance and Mutation System Integration', () => {
  describe('MutationPhaseManager', () => {
    it('should initialize with proposal_only phase', () => {
      const manager = getMutationPhaseManager();
      const status = manager.getStatus();
      expect(status.currentPhase).toBe('proposal_only');
    });

    it('should track mutation proposals', () => {
      const manager = getMutationPhaseManager();
      const proposalId = manager.createProposal(
        'test_modification',
        'Test modification for testing',
        'low'
      );
      expect(proposalId).toBeDefined();
      expect(proposalId.startsWith('proposal_')).toBe(true);
    });

    it('should evaluate proposal risk', () => {
      const manager = getMutationPhaseManager();
      const proposalId = manager.createProposal(
        'test_modification',
        'Test modification',
        'low'
      );
      const evaluation = manager.evaluateProposal(proposalId);
      expect(evaluation).toBeDefined();
      expect(evaluation.riskScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('GovernanceBoundaryAudit', () => {
    it('should identify protected paths', () => {
      const audit = getGovernanceBoundaryAudit();
      expect(audit.isPathProtected('server/privacyEngine.ts')).toBe(true);
      expect(audit.isPathProtected('server/governance/')).toBe(true);
      expect(audit.isPathProtected('server/services/randomService.ts')).toBe(false);
    });

    it('should record modification attempts', () => {
      const audit = getGovernanceBoundaryAudit();
      const log = audit.recordAttempt(
        'server/privacyEngine.ts',
        'const x = 1;',
        'proposal_only',
        50,
        'test_user',
        'Path is protected'
      );
      expect(log).toBeDefined();
      expect(log.isProtected).toBe(true);
      expect(log.interceptReason).toBe('Path is protected');
    });

    it('should generate audit reports', () => {
      const audit = getGovernanceBoundaryAudit();
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();
      const report = audit.generateAuditReport(startDate, endDate);
      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.totalAttempts).toBeGreaterThanOrEqual(0);
    });

    it('should generate learning reports for Nova', () => {
      const audit = getGovernanceBoundaryAudit();
      const learningReport = audit.generateLearningReport();
      expect(learningReport).toBeDefined();
      expect(learningReport.internalizationLevel).toBeGreaterThanOrEqual(0);
      expect(learningReport.internalizationLevel).toBeLessThanOrEqual(100);
    });
  });

  describe('RollbackController', () => {
    it('should track source versions', () => {
      const controller = getRollbackController();
      controller.recordSourceVersion('v1.0.0', 'const x = 1;');
      expect(controller.getCurrentVersion()).toBe('v1.0.0');
    });

    it('should detect runtime rollback conditions', () => {
      const controller = getRollbackController();
      const metrics = {
        heapUsage: 96,
        errorRate: 25,
        selfModelStability: 75,
        cpuUsage: 50,
        responseTime: 6000
      };
      const shouldRollback = controller.shouldTriggerRuntimeRollback(metrics);
      expect(shouldRollback).toBe(true);
    });

    it('should detect source rollback review conditions', () => {
      const controller = getRollbackController();
      const metrics = {
        heapUsage: 70,
        errorRate: 10,
        selfModelStability: 50,
        cpuUsage: 40,
        responseTime: 1000
      };
      const shouldReview = controller.shouldReviewSourceRollback(metrics);
      expect(shouldReview).toBe(true);
    });

    it('should generate status reports', () => {
      const controller = getRollbackController();
      const report = controller.generateStatusReport();
      expect(report).toBeDefined();
      expect(report.currentVersion).toBeDefined();
      expect(report.consecutiveErrors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('BrakeMechanismMonitor', () => {
    it('should track modification attempts', () => {
      const monitor = getBrakeMechanismMonitor();
      monitor.recordModificationAttempt(true, 70);
      const status = monitor.getStatus();
      expect(status).toBeDefined();
      expect(status.isActive).toBe(false); // Should not be active for normal conditions
    });

    it('should trigger brake on hard limit violations', () => {
      const monitor = getBrakeMechanismMonitor();
      // Simulate multiple failures
      for (let i = 0; i < 15; i++) {
        monitor.recordModificationAttempt(false, 75);
      }
      const status = monitor.getStatus();
      expect(status.isActive).toBe(true);
    });

    it('should escalate on critical conditions', () => {
      const monitor = getBrakeMechanismMonitor();
      monitor.recordModificationAttempt(false, 96); // High heap usage + failure
      const status = monitor.getStatus();
      expect(status.escalationLevel).toBeGreaterThan(0);
    });

    it('should generate monitoring reports', () => {
      const monitor = getBrakeMechanismMonitor();
      const report = monitor.generateMonitoringReport();
      expect(report).toBeDefined();
      expect(report.statistics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should allow manual reset', () => {
      const monitor = getBrakeMechanismMonitor();
      monitor.recordModificationAttempt(false, 96);
      let status = monitor.getStatus();
      expect(status.isActive).toBe(true);

      monitor.manualReset();
      status = monitor.getStatus();
      expect(status.isActive).toBe(false);
    });
  });

  describe('Integrated Governance Flow', () => {
    it('should handle complete mutation lifecycle', () => {
      const phaseManager = getMutationPhaseManager();
      const audit = getGovernanceBoundaryAudit();
      const brake = getBrakeMechanismMonitor();

      // Step 1: Create proposal
      const proposalId = phaseManager.createProposal(
        'test_modification',
        'Test modification',
        'low'
      );
      expect(proposalId).toBeDefined();

      // Step 2: Evaluate proposal
      const evaluation = phaseManager.evaluateProposal(proposalId);
      expect(evaluation.approved).toBeDefined();

      // Step 3: Record attempt
      const log = audit.recordAttempt(
        'server/services/testService.ts',
        'const x = 1;',
        'proposal_only',
        evaluation.riskScore,
        'test_user'
      );
      expect(log).toBeDefined();

      // Step 4: Monitor brake
      brake.recordModificationAttempt(evaluation.approved, 70);
      const brakeStatus = brake.getStatus();
      expect(brakeStatus).toBeDefined();
    });

    it('should protect critical paths from modification', () => {
      const audit = getGovernanceBoundaryAudit();
      const criticalPaths = [
        'server/privacyEngine.ts',
        'server/governance/',
        'server/ethicsEngine.ts',
        'drizzle/schema.ts'
      ];

      criticalPaths.forEach((path) => {
        expect(audit.isPathProtected(path)).toBe(true);
      });
    });
  });
});
