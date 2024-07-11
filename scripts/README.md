# scripts

Collection of utility scripts.

Getting path mapping to work with Nx and ts-node is a nightmare, so resorted to
esbuild. To add new scripts, make sure to add an entry in project.json, and
include the path to it in `targets.build.options.additionEntryPoints`.
