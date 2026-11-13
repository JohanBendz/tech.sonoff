'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SNZB03 extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this._zone = zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME];
    this._isWaterSensor = this.getStoreValue('verifiedWaterSensor') === true;
    this._statusRevision = 0;

    // Keep persisted alarms until a fresh device report or read replaces them.
    this._zone.onZoneStatusChangeNotification = ({ zoneStatus }) => {
      this._statusRevision += 1;
      this._onZoneStatus(zoneStatus).catch(this.error);
    };
    this._zone.on('attr.zoneStatus', zoneStatus => {
      this._statusRevision += 1;
      this._onZoneStatus(zoneStatus).catch(this.error);
    });
    await this._syncZoneState();
  }

  async _verifyZoneType() {
    if (this._verification) return this._verification;
    this._verification = this._readZoneType();
    try {
      return await this._verification;
    } finally {
      this._verification = null;
    }
  }

  async _readZoneType() {
    try {
      const { zoneType } = await this._zone.readAttributes(['zoneType']);
      // Both motion and water sensors can identify as eWeLink / SNZB-03.
      if (!zoneType) throw new Error('Missing IAS zone type');
      this._isWaterSensor = zoneType === 'waterSensor';
      await this.setStoreValue('verifiedWaterSensor', this._isWaterSensor);
      if (this._isWaterSensor) {
        await this.setAvailable();
      } else {
        await this.setUnavailable('This device is not an IAS water leak sensor (zone type: ' + zoneType + ').');
      }
    } catch (error) {
      this.error('Could not verify IAS zone type', error);
      if (!this._isWaterSensor) {
        await this.setUnavailable('Could not verify the water sensor. Wake the device to retry.');
      }
    }
    return this._isWaterSensor;
  }

  async _onZoneStatus(zoneStatus) {
    if (!this._isWaterSensor && !await this._verifyZoneType()) return;
    await this._applyZoneStatus(zoneStatus);
  }

  async _applyZoneStatus(zoneStatus) {
    if (!zoneStatus) return;
    if (typeof zoneStatus.alarm1 === 'boolean') {
      await this.setCapabilityValue('alarm_water', zoneStatus.alarm1);
    }
    if (typeof zoneStatus.battery === 'boolean') {
      await this.setCapabilityValue('alarm_battery', zoneStatus.battery);
    }
  }

  async _syncZoneState() {
    if (!await this._verifyZoneType()) return;
    const revision = this._statusRevision;
    try {
      const { zoneStatus } = await this._zone.readAttributes(['zoneStatus']);
      // A live notification takes precedence over an overlapping startup read.
      if (revision === this._statusRevision) await this._applyZoneStatus(zoneStatus);
    } catch (error) {
      this.error('Could not read IAS zone status; retaining the last known alarms', error);
    }
  }

  async onEndDeviceAnnounce() {
    await this._syncZoneState();
  }
}

module.exports = SNZB03;
