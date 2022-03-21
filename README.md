# JavaScript Library

**Hitachi ID Bravura Safe is a modified version of Bitwarden®. It was developed using Bitwarden open source software.  
Hitachi ID Systems, Inc. and Bravura Safe are not affiliated with or endorsed by Bitwarden or Bitwarden, Inc.  
Bitwarden is a trademark or registered trademark of Bitwarden, Inc. in the United States and/or other countries.**

The original work is available at [https://github.com/bitwarden/server].
The original documentation is available at [https://bitwarden.com/help/].
A complete list of all changes is available in the git history of this project.

Common code referenced across Bitwarden JavaScript projects.


## Requirements

- [Node.js](https://nodejs.org) v16.13.1 or greater
- NPM v8
- Git
- node-gyp

### Windows

- _Microsoft Build Tools 2015_ in Visual Studio Installer
- [Windows 10 SDK 17134](https://developer.microsoft.com/en-us/windows/downloads/sdk-archive/)
  either by downloading it seperately or through the Visual Studio Installer.

## Prettier

We recently migrated to using Prettier as code formatter. All previous branches will need to updated to avoid large merge conflicts using the following steps:

1. Check out your local Branch
2. Run `git merge 8b2dfc6cdcb8ff5b604364c2ea6d343473aee7cd`
3. Resolve any merge conflicts, commit.
4. Run `npm run prettier`
5. Commit
6. Run `git merge -Xours 193434461dbd9c48fe5dcbad95693470aec422ac`
7. Push

### Git blame

We also recommend that you configure git to ignore the prettier revision using:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```
