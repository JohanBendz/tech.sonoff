'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

class SonoffSpecificCluster extends Cluster {

    static get ID() {
        return 64529;
    }
    
    static get NAME() {
        return 'SonoffSpecificCluster';
    }
    
    static get COMMANDS() {
        return {
            // One-byte requests and two-byte notifications share command 0x0f.
            // Accept both ZCL direction bits; some firmware sends notifications as requests.
            alert: {
                id: 0x0f,
                frameControl: ['clusterSpecific', 'disableDefaultResponse'],
                args: { data: ZCLDataTypes.buffer },
            },
        };
    }

    static get ATTRIBUTES() {
        return {
            powerSupplyMode: {
                id: 0x0024,
                type: ZCLDataTypes.enum8({ battery: 0, external: 1 }),
            },
            alarmSoundEnable: {
                id: 0x2026,
                type: ZCLDataTypes.bool,
                manufacturerId: 0x1286,
            },
            alarmLightEnable: {
                id: 0x2022,
                type: ZCLDataTypes.bool,
                manufacturerId: 0x1286,
            },
            alarmSoundType: {
                id: 0x2023,
                type: ZCLDataTypes.enum8({
                    classic: 0, steady: 1, chirp: 2, rising: 3, hiLo: 4,
                    warning: 5, rapid: 6, intermittent: 7, emergency: 8, pulse: 9,
                }),
            },
            alarmVolumeLevel: {
                id: 0x2024,
                type: ZCLDataTypes.enum8({ low: 0, medium: 1, high: 2, max: 3 }),
            },
            alarmDuration: {
                id: 0x2025,
                type: ZCLDataTypes.uint16,
            },
            child_lock: {
                id: 0x0000,
                type: ZCLDataTypes.bool
            },
            tamper: {
                id: 0x2000,
                manufacturerId: 0x1286,
                type: ZCLDataTypes.uint8
            },
            illumination: {
                id: 0x2001,
                type: ZCLDataTypes.uint8
            },
            open_window: {
                id: 0x6000,
                type: ZCLDataTypes.bool
            },
            frost_protection_temperature: {
                id: 0x6002,
                type: ZCLDataTypes.int16
            },
            idle_steps: {
                id: 0x6003,
                type: ZCLDataTypes.uint16
            },
            closing_steps: {
                id: 0x6004,
                type: ZCLDataTypes.uint16
            },
            valve_opening_limit_voltage: {
                id: 0x6005,
                type: ZCLDataTypes.uint16
            },
            valve_closing_limit_voltage: {
                id: 0x6006,
                type: ZCLDataTypes.uint16
            },
            valve_motor_running_voltage: {
                id: 0x6007,
                type: ZCLDataTypes.uint16
            },
            valve_opening_degree: {
                id: 0x600b,
                type: ZCLDataTypes.uint8
            },
            valve_closing_degree: {
                id: 0x600c,
                type: ZCLDataTypes.uint8
            },
        };
    }
}

module.exports = SonoffSpecificCluster;