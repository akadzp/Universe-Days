import { Result, success, failure } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';
import { RuntimeRule } from '../RULES/types.ts';
import { RuleSpecificationCompiler } from '../RULES/compiler.ts';
import { SpecificationRegistryDocument, RuleSpecification } from '../RULES/specification.ts';

export interface CompiledRuleRegistry {
  readonly version: string;
  readonly registryName: string;
  readonly rules: readonly RuntimeRule[];
}

export function compileSpecificationDocument(document: SpecificationRegistryDocument): Result<CompiledRuleRegistry> {
  const result = RuleSpecificationCompiler.compileRegistry(document);
  if (!result.success || !result.data) {
    return failure(result.error ?? EngineErrorCode.INVALID_RULE, result.message ?? 'Specification compilation failed.');
  }

  return success({
    version: document.version,
    registryName: document.registryName,
    rules: result.data
  });
}

export function compileLegacyRuntimeRegistry(input: {
  version: string;
  registryName: string;
  rules: readonly (RuleSpecification & { id?: string })[];
}): Result<CompiledRuleRegistry> {
  const specifications: RuleSpecification[] = input.rules.map(rule => ({
    ...rule,
    ruleId: rule.ruleId || rule.id || ''
  }));

  return compileSpecificationDocument({
    version: input.version,
    registryName: input.registryName,
    specifications
  });
}
