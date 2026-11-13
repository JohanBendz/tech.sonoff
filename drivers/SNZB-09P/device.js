'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, BoundCluster, CLUSTER } = require('zigbee-clusters');
const SonoffSpecificCluster = require('../../lib/SonoffSpecificCluster');

Cluster.addCluster(SonoffSpecificCluster);

const SETTINGS = ['alarmSoundEnable', 'alarmLightEnable', 'alarmSoundType',
  'alarmVolumeLevel', 'alarmDuration'];

class SirenBoundCluster extends BoundCluster {
  constructor(onStatus) {
    super();
    this.onStatus = onStatus;
  }

  alert({ data }) {
    const [type, status] = data;
    if (type === 4 && [0, 1, 2].includes(status)) {
      this.onStatus(status !== 0).catch(this.onError);
    }
  }
}

class SonoffSNZB09P extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this._siren = zclNode.endpoints[1].clusters[SonoffSpecificCluster.NAME];
    this._queue = Promise.resolve();
    this._appliedSettings = {};
    this.registerCapabilityListener('onoff', value => this._enqueue(() => this._setSiren(value)));

    const bound = new SirenBoundCluster(active => this._enqueue(() => this._updateSirenState(active)));
    bound.onError = error => this.error('Siren notification failed', error);
    this._siren.onAlert = payload => bound.alert(payload);
    zclNode.endpoints[1].bind(SonoffSpecificCluster.NAME, bound);
    this._siren.on('attr.tamper', value => {
      if (value === 0 || value === 1) this.setCapabilityValue('alarm_tamper', value === 1).catch(this.error);
    });
    this._siren.on('attr.powerSupplyMode', value => { this._powerSupplyMode = value; });

    const power = zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME];
    power.on('attr.batteryPercentageRemaining', value => this._onBattery(value));
    const zone = zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME];
    zone.onZoneStatusChangeNotification = ({ zoneStatus }) => {
      this.setCapabilityValue('alarm_tamper', zoneStatus.tamper).catch(this.error);
      this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
    };

    // Older firmware has no readable alarm status. Restore only a locally tracked deadline.
    const deadline = this.getStoreValue('sirenDeadline');
    if (deadline > Date.now()) {
      await this.setCapabilityValue('onoff', true);
      this._scheduleExpiry(deadline);
    } else {
      await this._updateSirenState(false);
    }
    await this._readState();
    await this._enqueue(() => this._writeSettings(this.getSettings(), SETTINGS))
      .catch(error => this.error('Could not apply siren settings', error));
    if (this.isFirstInit()) {
      await this.configureAttributeReporting([{
        endpointId: 1, cluster: CLUSTER.POWER_CONFIGURATION,
        attributeName: 'batteryPercentageRemaining', minInterval: 30,
        maxInterval: 21600, minChange: 2,
      }]).catch(error => this.error('Could not configure battery reporting', error));
    }
  }

  _enqueue(operation) {
    const result = this._queue.then(operation);
    this._queue = result.catch(() => {});
    return result;
  }

  async _setSiren(active, settings = this.getSettings()) {
    if (active) await this._writeSettings(settings, SETTINGS);
    await this._siren.alert({ data: Buffer.from([active ? 0 : 1]) });
    if (active) this._activeDuration = Number(settings.alarmDuration);
    await this._updateSirenState(active);
  }

  playSound({ sound, volume, duration, light }) {
    if (!['on', 'off'].includes(light)) return Promise.reject(new Error('Invalid light setting'));
    return this._enqueue(() => this._setSiren(true, {
      ...this.getSettings(),
      alarmSoundEnable: true,
      alarmLightEnable: light === 'on',
      alarmSoundType: sound,
      alarmVolumeLevel: volume,
      alarmDuration: duration,
    }));
  }

  async _updateSirenState(active) {
    this._clearExpiry();
    const duration = this._activeDuration || this.getSetting('alarmDuration') || 10;
    const deadline = active ? Date.now() + duration * 1000 : null;
    await this.setStoreValue('sirenDeadline', deadline);
    await this.setCapabilityValue('onoff', active);
    if (active) this._scheduleExpiry(deadline);
  }

  _scheduleExpiry(deadline) {
    this._clearExpiry();
    this._expiryTimer = this.homey.setTimeout(() => {
      this._enqueue(async () => {
        if (this.getStoreValue('sirenDeadline') === deadline) await this._updateSirenState(false);
      }).catch(this.error);
    }, Math.max(0, deadline - Date.now()));
  }

  _clearExpiry() {
    if (this._expiryTimer) this.homey.clearTimeout(this._expiryTimer);
    this._expiryTimer = null;
  }

  async _writeSettings(settings, keys) {
    const groups = new Map();
    // A frame may contain only attributes with the same manufacturer header.
    for (const key of keys.filter(key => SETTINGS.includes(key))) {
      let value = settings[key];
      if (key === 'alarmSoundEnable' || key === 'alarmLightEnable') {
        if (typeof value !== 'boolean') throw new Error(`Invalid setting: ${key}`);
      } else {
        value = Number(value);
        const max = { alarmSoundType: 9, alarmVolumeLevel: 3, alarmDuration: 900 }[key];
        const min = key === 'alarmDuration' ? 1 : 0;
        if (!Number.isInteger(value) || value < min || value > max) {
          throw new Error(`Invalid setting: ${key}`);
        }
      }
      if (this._appliedSettings[key] === value) continue;
      const manufacturer = SonoffSpecificCluster.ATTRIBUTES[key].manufacturerId || 0;
      if (!groups.has(manufacturer)) groups.set(manufacturer, {});
      groups.get(manufacturer)[key] = value;
    }
    for (const attributes of groups.values()) {
      await this._siren.writeAttributes(attributes);
      Object.assign(this._appliedSettings, attributes);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    await this._enqueue(() => this._writeSettings(newSettings, changedKeys));
  }

  _onBattery(raw) {
    if (!Number.isInteger(raw) || raw < 0 || raw > 200) return;
    const percentage = raw / 2;
    // External supply can produce misleading battery percentages; preserve the last good value.
    if (this._powerSupplyMode === 'external' && percentage !== 100) return;
    this.setCapabilityValue('measure_battery', percentage).catch(this.error);
    this.setCapabilityValue('alarm_battery', percentage < 20).catch(this.error);
  }

  async _readState() {
    await this._siren.readAttributes(['powerSupplyMode'])
      .then(data => { this._powerSupplyMode = data.powerSupplyMode; })
      .catch(error => this.error('Could not read power supply mode', error));
    await this.zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .readAttributes(['batteryPercentageRemaining'])
      .then(data => this._onBattery(data.batteryPercentageRemaining))
      .catch(error => this.error('Could not read battery', error));
    await this._siren.readAttributes(['tamper'])
      .then(data => {
        if (data.tamper === 0 || data.tamper === 1) {
          return this.setCapabilityValue('alarm_tamper', data.tamper === 1);
        }
        return undefined;
      }).catch(error => this.error('Could not read tamper state', error));
  }

  async onEndDeviceAnnounce() {
    // A rejoin can follow a reset, so previously acknowledged values may be lost.
    await this._enqueue(async () => { this._appliedSettings = {}; });
    await this._readState();
  }

  onUninit() {
    this._clearExpiry();
  }

  onDeleted() {
    this._clearExpiry();
  }
}

module.exports = SonoffSNZB09P;
