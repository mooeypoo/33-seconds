/**
 * The layer rule from ADR-0001 D1, enforced:
 *
 *   presentation ---> application ---> domain
 *   infrastructure -/
 *
 * The domain imports nothing from the other layers. Phaser is only reachable from
 * src/infrastructure/phaser. A violation fails `npm run check:arch`, and therefore CI.
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      comment:
        'src/domain is pure TypeScript: no application, infrastructure, presentation, or third-party engine code.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: {
        pathNot: '^src/domain',
        // Node built-ins and packages are caught by the two rules below, so this one is about our own layers.
        dependencyTypesNot: ['core'],
      },
    },
    {
      name: 'domain-has-no-dependencies',
      comment: 'src/domain does not import packages. Everything it needs is injected.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-no-pkg', 'core'] },
    },
    {
      name: 'application-depends-only-on-domain',
      comment: 'The application layer orchestrates the domain. It knows nothing about the DOM, Phaser, or Vue.',
      severity: 'error',
      from: { path: '^src/application' },
      to: { path: '^src/(infrastructure|presentation)' },
    },
    {
      name: 'presentation-does-not-reach-infrastructure',
      comment: 'Presentation talks to the application layer, not to adapters.',
      severity: 'error',
      from: { path: '^src/presentation' },
      to: { path: '^src/infrastructure' },
    },
    {
      name: 'phaser-stays-in-its-adapter',
      comment: 'Phaser is an external system (ADR-0001 D4). Only src/infrastructure/phaser may import it.',
      severity: 'error',
      from: { pathNot: '^src/infrastructure/phaser' },
      to: { path: 'node_modules/phaser' },
    },
    {
      name: 'vue-stays-in-presentation',
      comment: 'Vue renders the overlay. Game rules and adapters never import it.',
      severity: 'error',
      from: { pathNot: '^src/(presentation|main\\.ts)' },
      to: { path: 'node_modules/(vue|@vue)' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      comment: 'An unreachable module is either dead code or a missing wire-up.',
      severity: 'warn',
      from: { orphan: true, pathNot: ['\\.d\\.ts$'] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.ts', '.vue', '.js'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
