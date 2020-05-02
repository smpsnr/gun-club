# gundb-template

Vue app demonstrating end-to-end encrypted multi-user p2p groups ("channels") based on [Gun].

- Based on Gun version `0.2020.116` (more recent versions break WebRTC)
- Multicast is broken in this version. If you need multicast, consider using version `0.2019.930` (used by [iris-lib])

Create a `.env` file like:
```
HOST=localhost
PORT=8765
AXE=true
MULTICAST=false
```
[iris-lib]: https://github.com/irislib/iris-lib
[Gun]: https://github.com/amark/gun
