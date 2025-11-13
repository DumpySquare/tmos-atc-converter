Generic helpers and utils for Shell (sh) scripting in CI/CD environment

Usage:

```shell
#!/usr/bin/env sh

cibsfile="$(dirname "$0")/../misc/ci-scripts-lib/bootstrap.sh"
BS_FILE="${cibsfile}" . "${cibsfile}"
unset cibsfile


```