'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');

function fixture({ type = 'waterSensor', status = { alarm1: false, battery: false }, verified = false } = {}) {
  const context = {
    module: { exports: {} },
    require: name => name === 'homey-zigbeedriver' ? { ZigBeeDevice: class {} } : require(name),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../drivers/SNZB-03/device'), 'utf8'), context);
  const device = new context.module.exports();
  const zone = Object.assign(new EventEmitter(), {
    readAttributes: async ([key]) => {
      if (key === 'zoneType') return { zoneType: type };
      return { zoneStatus: status };
    },
  });
  const values = { alarm_water: true, alarm_battery: true };
  const store = { verifiedWaterSensor: verified };
  Object.assign(device, {
    getStoreValue: key => store[key],
    setStoreValue: async (key, value) => { store[key] = value; },
    setCapabilityValue: async (key, value) => { values[key] = value; },
    setAvailable: async () => { device.unavailable = null; },
    setUnavailable: async reason => { device.unavailable = reason; },
    error: () => {},
  });
  const init = () => device.onNodeInit({ zclNode: { endpoints: { 1: { clusters: { iasZone: zone } } } } });
  return { device, zone, values, store, init };
}

test('startup reads verified water status and notifications set and clear both alarms', async () => {
  const f = fixture();
  await f.init();
  assert.equal(f.store.verifiedWaterSensor, true);
  assert.deepEqual(f.values, { alarm_water: false, alarm_battery: false });
  await f.device._onZoneStatus({ alarm1: true, battery: true });
  assert.deepEqual(f.values, { alarm_water: true, alarm_battery: true });
  await f.device._onZoneStatus({ alarm1: false, battery: false });
  assert.deepEqual(f.values, { alarm_water: false, alarm_battery: false });
});

test('sleeping sensor retains alarms across startup and verifies on the next report', async () => {
  const f = fixture();
  const read = f.zone.readAttributes;
  f.zone.readAttributes = async () => { throw new Error('sleeping'); };
  await f.init();
  assert.deepEqual(f.values, { alarm_water: true, alarm_battery: true });
  assert.ok(f.device.unavailable);
  f.zone.readAttributes = read;
  await f.device._onZoneStatus({ alarm1: false, battery: false });
  assert.deepEqual(f.values, { alarm_water: false, alarm_battery: false });
  assert.equal(f.device.unavailable, null);
});

test('previously verified sleeping water sensor accepts reports without losing persisted alarms', async () => {
  const f = fixture({ verified: true });
  f.zone.readAttributes = async () => { throw new Error('sleeping'); };
  await f.init();
  assert.deepEqual(f.values, { alarm_water: true, alarm_battery: true });
  await f.device._onZoneStatus({ alarm1: false });
  assert.deepEqual(f.values, { alarm_water: false, alarm_battery: true });
});

test('motion sensor sharing the model ID is unavailable and cannot produce water alarms', async () => {
  const f = fixture({ type: 'motionSensor', verified: true });
  f.values.alarm_water = false;
  await f.init();
  assert.equal(f.store.verifiedWaterSensor, false);
  assert.match(f.device.unavailable, /not an IAS water leak sensor/);
  await f.device._onZoneStatus({ alarm1: true, battery: false });
  assert.equal(f.values.alarm_water, false);
});

test('live notification wins over an older overlapping status read', async () => {
  const f = fixture({ verified: true });
  await f.init();
  let resolveRead;
  f.zone.readAttributes = async ([key]) => key === 'zoneType'
    ? { zoneType: 'waterSensor' } : new Promise(resolve => { resolveRead = resolve; });
  const sync = f.device._syncZoneState();
  while (!resolveRead) await new Promise(resolve => setImmediate(resolve));
  f.zone.onZoneStatusChangeNotification({ zoneStatus: { alarm1: true, battery: true } });
  await new Promise(resolve => setImmediate(resolve));
  resolveRead({ zoneStatus: { alarm1: false, battery: false } });
  await sync;
  assert.deepEqual(f.values, { alarm_water: true, alarm_battery: true });
});
