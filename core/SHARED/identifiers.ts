/**
 * Strongly typed branded identifier primitives to prevent accidental interchange.
 */

declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type SystemID = Brand<string, 'SystemID'>;
export type DomainID = Brand<string, 'DomainID'>;
export type RuleID = Brand<string, 'RuleID'>;
export type TaskID = Brand<string, 'TaskID'>;
export type RequestID = Brand<string, 'RequestID'>;
export type CorrelationID = Brand<string, 'CorrelationID'>;
export type EntityID = Brand<string, 'EntityID'>;
export type InstanceID = Brand<string, 'InstanceID'>;
export type PageID = Brand<string, 'PageID'>;
export type StoryID = Brand<string, 'StoryID'>;
export type TemporalID = Brand<string, 'TemporalID'>;

// Helper constructors
export const makeSystemID = (id: string): SystemID => id as SystemID;
export const makeDomainID = (id: string): DomainID => id as DomainID;
export const makeRuleID = (id: string): RuleID => id as RuleID;
export const makeTaskID = (id: string): TaskID => id as TaskID;
export const makeRequestID = (id: string): RequestID => id as RequestID;
export const makeCorrelationID = (id: string): CorrelationID => id as CorrelationID;
export const makeEntityID = (id: string): EntityID => id as EntityID;
export const makeInstanceID = (id: string): InstanceID => id as InstanceID;
export const makePageID = (id: string): PageID => id as PageID;
export const makeStoryID = (id: string): StoryID => id as StoryID;
export const makeTemporalID = (id: string): TemporalID => id as TemporalID;
