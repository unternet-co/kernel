# Unternet Kernel

The Unternet Kernel consists of a series of modules which work in tandem to form the basis of an agentic operating system. It's capable of understanding user intent, executing actions, accumulating memory, and orchestrating a full graphical user interface with stateful processes.

For more information, see the [documentation](docs/introduction.md).

## Releasing

From the latest version of main, run `npm run release`. This will select a version bump based on semantic commits, create a release branch, edit the changelog, and push. (You may want to optionally edit the changelog for clarity).

Publish this branch, and merge with main. This will trigger the build & publish to NPM.