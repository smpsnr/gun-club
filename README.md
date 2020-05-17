# gundb-template

Vue app demonstrating end-to-end encrypted multi-user p2p groups ("channels") based on [Gun]. To avoid duplicating data for each member, channels are represented by seperate SEA users (compare this approach to that of [iris-lib]).

### Configuration

Create a `.env` file like:
```
HOST=localhost
PORT=8765
AXE=false
MULTICAST=false
```
[iris-lib]: https://github.com/irislib/iris-lib
[Gun]: https://github.com/amark/gun

### Debugging

- Browser console filter: `-/^(\[(WDS|HMR)|unreachable)/`
- Node console filter: `-/(🉑|⭕)/`
