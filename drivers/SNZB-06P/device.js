'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

class SensorSNZB06P extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {

		debug(true);
        this.printNode();

        if (this.isFirstInit()) {
            await this.configureAttributeReporting([
                {
                    endpointId: 1,
                    cluster: CLUSTER.OCCUPANCY_SENSING,
                    attributeName: 'occupancy',
                    minInterval: 65535,
                    maxInterval: 0,
                    minChange: 0,
                },
                {
                    endpointId: 1,
                    cluster: CLUSTER.IAS_ZONE,
                    attributeName: 'zoneStatus',
                    minInterval: 65535,
                    maxInterval: 0,
                    minChange: 0,
                }
            ]);
        }

        // Occupancy
        zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]
        .on('attr.occupancy', this.onOccupancyAttributeReport.bind(this));

        // IAS Zone Status
        zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
        .onZoneStatusChangeNotification = payload => {
            this.onIASZoneStatusChangeNotification(payload);
        }

    }

    onOccupancyAttributeReport(occupancy) {
        this.log("Occupancy status:", occupancy);
        this.setCapabilityValue('alarm_motion', occupancy)
        .catch(err => this.error('Error: could not set alarm_motion capability value', err));
    }

    onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
        this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
        this.setCapabilityValue('alarm_contact', zoneStatus.alarm1).catch(this.error)
        .catch(err => this.error('Error: could not set alarm_contact capability value', err));
      }

}

module.exports = SensorSNZB06P;
