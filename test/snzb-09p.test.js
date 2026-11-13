'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');
const { Cluster, ZCLNode } = require('zigbee-clusters');
const SonoffCluster = require('../lib/SonoffSpecificCluster');

function fixture(deadline = null) {
  const context = {
    module: { exports: {} }, Buffer,
    require: name => name === 'homey-zigbeedriver' ? { ZigBeeDevice: class {} }
      : name === '../../lib/SonoffSpecificCluster' ? SonoffCluster : require(name),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../drivers/SNZB-09P/device'), 'utf8'), context);
  const device = new context.module.exports();
  const writes = [];
  const siren = Object.assign(new EventEmitter(), {
    writeAttributes: async values => writes.push(values),
    alert: async values => writes.push(values),
    readAttributes: async () => ({ powerSupplyMode: 'battery', tamper: 0 }),
  });
  const power = Object.assign(new EventEmitter(), { readAttributes: async () => ({ batteryPercentageRemaining: 70 }) });
  const zone = {};
  const timers = new Map();
  let nextTimer = 1;
  const store = { sirenDeadline: deadline };
  const values = {};
  const settings = { alarmSoundEnable: true, alarmLightEnable: true, alarmSoundType: '0', alarmVolumeLevel: '1', alarmDuration: 10 };
  Object.assign(device, {
    homey: { setTimeout: fn => { timers.set(nextTimer, fn); return nextTimer++; }, clearTimeout: id => timers.delete(id) },
    registerCapabilityListener: (key, fn) => { device.listener = fn; },
    getSettings: () => settings, getSetting: key => settings[key],
    getStoreValue: key => store[key], setStoreValue: async (key, value) => { store[key] = value; },
    setCapabilityValue: async (key, value) => { values[key] = value; },
    isFirstInit: () => true, configureAttributeReporting: async () => {}, error: () => {},
    zclNode: { endpoints: { 1: { clusters: { SonoffSpecificCluster: siren, powerConfiguration: power, iasZone: zone },
      bind: (name, bound) => { device.bound = bound; } } } },
  });
  return { device, siren, power, zone, settings, values, store, timers, writes };
}

test('initial settings are grouped; unchanged starts send only the start byte; expiry resets state', async () => {
  const f = fixture();
  await f.device.onNodeInit({ zclNode: f.device.zclNode });
  assert.equal(f.values.measure_battery, 35);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].alarmDuration, 10);
  await f.device.listener(true);
  assert.equal(f.writes.length, 3);
  assert.deepEqual(f.writes[2].data, Buffer.from([0]));
  assert.equal(f.values.onoff, true);
  await f.device.listener(false);
  assert.deepEqual(f.writes[3].data, Buffer.from([1]));
  assert.equal(f.values.onoff, false);
  assert.equal(f.timers.size, 0);
  await f.device.listener(true);
  [...f.timers.values()][0]();
  await f.device._queue;
  assert.equal(f.values.onoff, false);
  assert.equal(f.store.sirenDeadline, null);
});

test('failed start leaves state unchanged and the next stop still works', async () => {
  const f = fixture();
  await f.device.onNodeInit({ zclNode: f.device.zclNode });
  f.writes.length = 0;
  f.device._appliedSettings = {};
  f.siren.writeAttributes = async () => { throw new Error('offline'); };
  await assert.rejects(f.device.listener(true), /offline/);
  assert.equal(f.values.onoff, false);
  assert.equal(f.writes.length, 0);
  await f.device.listener(false);
  assert.deepEqual(f.writes[0].data, Buffer.from([1]));
});

test('restores deadlines, cleans up timers, and ignores invalid battery/notification data', async () => {
  const f = fixture(Date.now() + 30000);
  await f.device.onNodeInit({ zclNode: f.device.zclNode });
  assert.equal(f.values.onoff, true);
  f.power.emit('attr.batteryPercentageRemaining', 255);
  assert.equal(f.values.measure_battery, 35);
  f.siren.emit('attr.powerSupplyMode', 'external');
  f.power.emit('attr.batteryPercentageRemaining', 10);
  assert.equal(f.values.measure_battery, 35);
  f.device.bound.alert({ data: Buffer.from([4, 0]) });
  await f.device._queue;
  assert.equal(f.values.onoff, false);
  f.device.bound.alert({ data: Buffer.from([4, 2]) });
  await f.device._queue;
  assert.equal(f.values.onoff, true);
  f.device.onUninit();
  assert.equal(f.timers.size, 0);
});

test('real ZCL frames use command 0x0f, raw payload, and no manufacturer header', async () => {
  Cluster.addCluster(SonoffCluster);
  const frames = [];
  const node = new ZCLNode({ endpointDescriptors: [{ endpointId: 1, inputClusters: [64529], outputClusters: [] }],
    sendFrame: async (endpoint, cluster, frame) => frames.push(frame) });
  const cluster = node.endpoints[1].clusters.SonoffSpecificCluster;
  await cluster.alert({ data: Buffer.from([0]) });
  await cluster.alert({ data: Buffer.from([1]) });
  assert.equal(frames[0][0], 0x11);
  assert.equal(frames[0][2], 0x0f);
  assert.equal(frames[0][3], 0);
  assert.equal(frames[1][3], 1);
  assert.equal(frames[0].length, 4);
  const received = [];
  cluster.onAlert = ({ data }) => received.push([...data]);
  await node.handleFrame(1, 64529, Buffer.from([0x19, 10, 0x0f, 4, 0]));
  assert.deepEqual(received, [[4, 0]]);
  assert.equal(SonoffCluster.ATTRIBUTES.alarmSoundEnable.manufacturerId, 0x1286);
  assert.equal(SonoffCluster.ATTRIBUTES.alarmDuration.type.id, 0x21);
  assert.equal(SonoffCluster.ATTRIBUTES.alarmSoundType.type.id, 0x30);
  assert.equal(SonoffCluster.ATTRIBUTES.alarmVolumeLevel.type.id, 0x30);
  assert.equal(SonoffCluster.ATTRIBUTES.alarmDuration.manufacturerId, undefined);
});

test('Flow sound overrides are temporary, repeated playback is cached, and normal start restores defaults', async () => {
  const f = fixture();
  await f.device.onNodeInit({ zclNode: f.device.zclNode });
  f.writes.length = 0;
  const before = Date.now();
  await f.device.playSound({ sound: '7', volume: '2', duration: 30, light: 'off' });
  assert.equal(f.writes.length, 3);
  assert.equal(f.writes[0].alarmLightEnable, false);
  assert.equal(f.writes[1].alarmSoundType, 7);
  assert.equal(f.writes[1].alarmDuration, 30);
  assert.ok(f.store.sirenDeadline >= before + 30000);
  assert.equal(f.settings.alarmSoundType, '0');
  await f.device.playSound({ sound: '7', volume: '2', duration: 30, light: 'off' });
  assert.equal(f.writes.length, 4);
  await f.device.listener(true);
  assert.equal(f.writes.length, 7);
  assert.equal(f.writes[4].alarmLightEnable, true);
  assert.equal(f.writes[5].alarmSoundType, 0);
  assert.equal(f.writes[5].alarmDuration, 10);
});

test('invalid Flow arguments send no frames and do not change the cache', async () => {
  const f = fixture();
  await f.device.onNodeInit({ zclNode: f.device.zclNode });
  f.writes.length = 0;
  await assert.rejects(f.device.playSound({ sound: '9', volume: '3', duration: 901, light: 'off' }), /Invalid setting/);
  assert.equal(f.writes.length, 0);
  await f.device.listener(true);
  assert.equal(f.writes.length, 1);
});
