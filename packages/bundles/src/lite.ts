// Minimal bundle: core + assert only
import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  xit,
  xdescribe,
  fit,
  fdescribe,
  runTests,
  getTestList,
  resetRegistry
} from '@embedunit/core';
import { expect } from '@embedunit/assert';

const EmbedUnitLite = {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  xit,
  xdescribe,
  fit,
  fdescribe,
  runTests,
  getTestList,
  resetRegistry
};

export default EmbedUnitLite;

// Auto-install to globalThis.EmbedUnit
(globalThis as Record<string, unknown>).EmbedUnit = EmbedUnitLite;
