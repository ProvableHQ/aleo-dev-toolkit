---
'@provablehq/aleo-wallet-adapter-shield': minor
---

Shield relay: accept an `https:` verified-link `deeplinkBase` and export `SHIELD_VERIFIED_DEEPLINK_BASE` (`https://connect.shield.app/connect`), which only the signed Shield app can open. Connect params, the pairing secret included, travel in the URL fragment on https, so they never reach the link host; wake links follow the same base (`…/wake#channelId=…`). The default stays `shield://connect` until most installs run an app version that registers the link. Plain `http:` bases throw. Re-vendors the relay client with the fragment form.
