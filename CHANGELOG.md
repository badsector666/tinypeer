# Changelog

## 0.2.0

### Changed

- **BREAKING**: `peer.call()` now returns synchronously instead of returning a Promise. The returned `MediaConnection` object can be used immediately, and connection errors are handled through the connection's event handlers.

### Fixed

- Connections now properly reject when receiving expire messages from the server. Both `peer.connect()` and the `MediaConnection.stream()` will reject their promises if an expire message is received, providing better error handling for expired connection attempts.
