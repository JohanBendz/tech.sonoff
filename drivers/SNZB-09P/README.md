# SONOFF SNZB-09P indoor siren

Pairs as `SONOFF` / `SNZB-09P`, endpoint 1. Use Homey's standard on/off
Flow actions to start and stop the siren. Device settings select sound/light,
one of the ten original sound presets, volume and duration (1–900 seconds).
Settings are applied at initialization and when changed. Acknowledged values are
cached in memory; unchanged starts send just the start command. Changed attributes
are grouped into at most two writes according to their manufacturer header. A failed
write is retried on the next start, and a rejoin invalidates the cache.

The **Play a sound** Flow action selects one of the ten sounds, volume, duration
and light on/off. It enables sound for that playback without changing saved device
settings. The next standard on/off start restores the saved settings as needed.
Playing the same Flow sound again can use the cached configuration.

The driver exposes battery percentage, low battery and tamper. Invalid battery
reports are ignored; while externally powered, only a 100% report replaces the
last known battery percentage.

Firmware 1.1.2 does not offer a readable alarm status. The on/off tile shows the
last commanded state and resets after the configured duration. Alert notifications
also update this estimate when received. A saved deadline survives app restarts;
expiry updates the Homey tile without sending an extra stop command. If a command
is lost, the displayed state can differ from the physical siren. Device testing is
required before relying on the integration.

Newer firmware's extra chime presets and `alarmStatus` attribute are not used.
Pairing: hold the button for five seconds until the red indicator flashes slowly.
The dedicated learnmode.svg contains the siren without a mains plug.
The pairing and list images use the HS2WD-E outline from com.zigbee.heiman,
with SONOFF vector lettering. Asset provenance and licensing are in assets/NOTICE.md.

Protocol references:
- [Zigbee2MQTT converter](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/sonoff.ts)
- [SONOFF manual](https://support.sonoff.tech/snzb-09p-usermanual/)

Run checks with `node --test test/snzb-09p.test.js` and `homey app validate`.
On hardware, test pairing, start/stop from both the tile and Flow, every setting,
automatic timeout, restart during an alarm, battery reporting and tamper events.
