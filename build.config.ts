import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
  ],
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
  },
  clean: true,
  declaration: true,
})
