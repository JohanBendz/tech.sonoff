'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class ZBMINIL extends ZigBeeDevice {
	
	async onNodeInit({ zclNode }) {

		//this.enableDebug();
		//debug(true);
		this.disableDebug();
		debug(false);
		this.printNode();
		
		if (this.isFirstInit()) {
			await this.setStoreValue('onOffReportingInitialized', false);
		} else if (this.getStoreValue('onOffReportingInitialized') === null) {
			await this.setStoreValue('onOffReportingInitialized', false);
		}
	  
		this._saveReportingConfigWhenChanged();

		if (this.hasCapability('onoff')) this.registerCapability('onoff', CLUSTER.ON_OFF, {
		});

	}

	async onEndDeviceAnnounce() {
		if (!this.getAvailable()) {
			await this.setAvailable() // Mark the device as available upon re-announcement
			.then(() => this.log('Device is now available'))
			.catch(err => this.error('Error setting device available', err));
		}

		await this._saveReportingConfigWhenChanged();
	}
	
	async _saveReportingConfigWhenChanged() {
		if (!this.getStoreValue('onOffReportingInitialized')) {
			try {
				await this.configureAttributeReporting([
					{
						endpointId: 1,
						cluster: CLUSTER.ON_OFF,
						attributeName: 'onOff',
						minInterval: 0, // See ZCL spec 2.5.7.1.5 and 2.5.7.1.6
						maxInterval: 3600
					}
				]);
				this.log("Attribute reporting configured successfully.");
				await this.setStoreValue('onOffReportingInitialized', true); // Reset the flag
			} catch (error) {
				this.log("There was a problem configuring attribute reporting:", error);
			}
		}
	}
}

module.exports = ZBMINIL;

/*
	"ids": {
		"modelId": "ZBMINI-L",
		"manufacturerName": "SONOFF"
	},
	"endpoints": {
		"ieeeAddress": "00:12:4b:00:25:7a:f8:b0",
		"networkAddress": 56643,
		"modelId": "ZBMINI-L",
		"manufacturerName": "SONOFF",
		"endpointDescriptors": [
			{
				"status": "SUCCESS",
				"nwkAddrOfInterest": 56643,
				"_reserved": 26,
				"endpointId": 1,
				"applicationProfileId": 260,
				"applicationDeviceId": 2,
				"applicationDeviceVersion": 0,
				"_reserved1": 1,
				"inputClusters": [
					0,
					3,
					4,
					5,
					6,
					7,
					64599,
					64672
				],
				"outputClusters": [
					25
				]
			}
		],
		"deviceType": "enddevice",
		"receiveWhenIdle": false,
		"swBuildId": "1.1.1",
		"capabilities": {
			"alternatePANCoordinator": false,
			"deviceType": false,
			"powerSourceMains": false,
			"receiveWhenIdle": false,
			"security": false,
			"allocateAddress": true
		},
		"extendedEndpointDescriptors": {
			"1": {
				"clusters": {
					"basic": {
						"attributes": [
							{
								"acl": [
									"readable"
								],
								"id": 0,
								"name": "zclVersion",
								"value": 3
							},
							{
								"acl": [
									"readable"
								],
								"id": 1,
								"name": "appVersion",
								"value": 2
							},
							{
								"acl": [
									"readable"
								],
								"id": 3,
								"name": "hwVersion",
								"value": 1
							},
							{
								"acl": [
									"readable"
								],
								"id": 4,
								"name": "manufacturerName",
								"value": "SONOFF"
							},
							{
								"acl": [
									"readable"
								],
								"id": 5,
								"name": "modelId",
								"value": "ZBMINI-L"
							},
							{
								"acl": [
									"readable"
								],
								"id": 6,
								"name": "dateCode",
								"value": "20220507"
							},
							{
								"acl": [
									"readable"
								],
								"id": 7,
								"name": "powerSource",
								"value": "mains"
							},
							{
								"acl": [
									"readable",
									"writable"
								],
								"id": 17,
								"name": "physicalEnv",
								"value": "Unspecified"
							},
							{
								"acl": [
									"readable"
								],
								"id": 16384,
								"name": "swBuildId",
								"value": "1.1.1"
							},
							{
								"acl": [
									"readable"
								],
								"id": 65533,
								"name": "clusterRevision",
								"value": 2
							}
						],
						"commandsGenerated": [],
						"commandsReceived": [
							"factoryReset"
						]
					},
					"identify": {
						"attributes": [
							{
								"acl": [
									"readable",
									"writable"
								],
								"id": 0,
								"name": "identifyTime",
								"value": 0
							},
							{
								"acl": [
									"readable"
								],
								"id": 65533,
								"name": "clusterRevision",
								"value": 1
							}
						],
						"commandsGenerated": [],
						"commandsReceived": []
					},
					"groups": {
						"attributes": [
							{
								"acl": [
									"readable"
								],
								"id": 0,
								"name": "nameSupport",
								"value": {
									"type": "Buffer",
									"data": [
										0
									]
								}
							},
							{
								"acl": [
									"readable"
								],
								"id": 65533,
								"name": "clusterRevision",
								"value": 1
							}
						],
						"commandsGenerated": [],
						"commandsReceived": []
					},
					"scenes": {
						"attributes": [
							{
								"acl": [
									"readable"
								],
								"id": 0
							},
							{
								"acl": [
									"readable"
								],
								"id": 1
							},
							{
								"acl": [
									"readable"
								],
								"id": 2
							},
							{
								"acl": [
									"readable"
								],
								"id": 3
							},
							{
								"acl": [
									"readable"
								],
								"id": 4
							},
							{
								"acl": [
									"readable"
								],
								"id": 65533,
								"name": "clusterRevision",
								"value": 1
							}
						],
						"commandsGenerated": [],
						"commandsReceived": []
					},
					"onOff": {
						"attributes": [
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 0,
								"name": "onOff",
								"value": true,
								"reportingConfiguration": {
									"direction": "reported",
									"attributeDataType": 16,
									"minInterval": 0,
									"maxInterval": 10,
									"status": "SUCCESS"
								}
							},
							{
								"acl": [
									"readable",
									"writable"
								],
								"id": 16387
							},
							{
								"acl": [
									"readable"
								],
								"id": 65533,
								"name": "clusterRevision",
								"value": 1
							}
						],
						"commandsGenerated": [],
						"commandsReceived": [
							"setOff",
							"setOn",
							"toggle",
							"offWithEffect"
						]
					},
					"onOffSwitch": {
						"attributes": [
							{
								"acl": [
									"readable"
								],
								"id": 0
							}
						],
						"commandsGenerated": [],
						"commandsReceived": []
					}
				},
				"bindings": {
					"ota": {}
				}
			}
		}
	}
	*/