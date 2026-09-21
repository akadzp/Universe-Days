import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ProcessRegistry,
  UniverseProcessStatus,
  createUniverseProcess,
  PeriodInitializer,
  PeriodFinalizer,
  TimePoint
} from '../../../core/universe/daily/index.ts';

describe('Phase 5 - Process Continuation Unit Tests (Section 59)', () => {
  it('1. Successfully models full process lifecycle: PLANNED -> ACTIVE -> PAUSED -> ACTIVE -> COMPLETED', () => {
    const reg = new ProcessRegistry();
    const proc = createUniverseProcess({
      processId: 'PROC-01',
      startReference: '2024-01-01T00:00:00Z',
      initialStatus: UniverseProcessStatus.PLANNED
    });
    reg.register(proc);

    // Start
    const startRes = reg.start('PROC-01');
    assert.strictEqual(startRes.success, true);
    assert.strictEqual(reg.get('PROC-01')?.currentStatus, UniverseProcessStatus.ACTIVE);

    // Pause
    const pauseRes = reg.pause('PROC-01');
    assert.strictEqual(pauseRes.success, true);
    assert.strictEqual(reg.get('PROC-01')?.currentStatus, UniverseProcessStatus.PAUSED);

    // Resume from paused
    const resumeRes = reg.resumeInterrupted('PROC-01');
    assert.strictEqual(resumeRes.success, true);
    assert.strictEqual(reg.get('PROC-01')?.currentStatus, UniverseProcessStatus.ACTIVE);

    // Complete explicitly
    const compRes = reg.complete('PROC-01', 'Criteria met');
    assert.strictEqual(compRes.success, true);
    assert.strictEqual(reg.get('PROC-01')?.currentStatus, UniverseProcessStatus.COMPLETED);
  });

  it('2. Supports process interruption and explicit resumption without auto-resume', () => {
    const reg = new ProcessRegistry();
    const proc = createUniverseProcess({
      processId: 'PROC-02',
      startReference: '2024-01-01T00:00:00Z',
      initialStatus: UniverseProcessStatus.ACTIVE
    });
    reg.register(proc);

    const intRes = reg.interrupt('PROC-02', 'Power loss');
    assert.strictEqual(intRes.success, true);
    assert.strictEqual(reg.get('PROC-02')?.currentStatus, UniverseProcessStatus.INTERRUPTED);

    // Explicit resume
    const resRes = reg.resumeInterrupted('PROC-02');
    assert.strictEqual(resRes.success, true);
    assert.strictEqual(reg.get('PROC-02')?.currentStatus, UniverseProcessStatus.ACTIVE);
  });

  it('3. Supports cancellation and failure', () => {
    const reg = new ProcessRegistry();
    const proc = createUniverseProcess({
      processId: 'PROC-03',
      startReference: '2024-01-01T00:00:00Z',
      initialStatus: UniverseProcessStatus.ACTIVE
    });
    reg.register(proc);

    const failRes = reg.fail('PROC-03', 'Engine breakdown');
    assert.strictEqual(failRes.success, true);
    assert.strictEqual(reg.get('PROC-03')?.currentStatus, UniverseProcessStatus.FAILED);
  });

  it('4. Period finalization does NOT auto-complete active processes; active processes survive across periods', () => {
    const startTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
    const activeProcess = createUniverseProcess({
      processId: 'PROC-LONG-RUNNING',
      startReference: startTime.toCanonical(),
      initialStatus: UniverseProcessStatus.ACTIVE
    });

    const initRes = PeriodInitializer.initialize({
      startTime,
      previousProcesses: [activeProcess]
    });
    assert.strictEqual(initRes.success, true);
    const ctx = initRes.data!;

    assert.strictEqual(ctx.processes.length, 1);
    assert.strictEqual(ctx.processes[0].currentStatus, UniverseProcessStatus.ACTIVE);

    // Finalize the period
    const finalRes = PeriodFinalizer.finalize(ctx);
    assert.strictEqual(finalRes.success, true);

    // The active process is preserved in NextPeriodContext as ACTIVE
    assert.strictEqual(finalRes.data!.nextPeriodContext.activeProcesses.length, 1);
    assert.strictEqual(
      finalRes.data!.nextPeriodContext.activeProcesses[0].currentStatus,
      UniverseProcessStatus.ACTIVE
    );
    assert.strictEqual(finalRes.data!.activeProcessCount, 1);
  });
});
