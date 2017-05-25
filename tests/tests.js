/**
 * Unit tests for Mobile Messaging Cordova Plugin
 */

/* cordova mock */
window.cordova = {
	exec: function(success, error, object, method, args) {
		console.log(object + '.' + method + ' with args ' + JSON.stringify(args));
	},

	require: function(what) {
		if (what === 'cordova/plugin_list') {
			return {
				metadata: {
					'com-infobip-plugins-mobilemessaging': '1.2.3-test'
				}
			}
		}
		return undefined
	}
};

/* tests */
describe('Initialization', function() {
	
	beforeEach(function() {
		spyOn(cordova, 'exec');
	});

	it('should fail if no application code', function(done) {
		MobileMessaging.init({}, function(error) {
			expect(error).toBe('No application code provided');
			done();
		});
	});

	it('should provide configuration to cordova.exec()', function() {
		MobileMessaging.init({applicationCode: '12345'}, function() {});
		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function),
			jasmine.any(Function),
			'MobileMessagingCordova',
			'registerReceiver',
			jasmine.any(Array)
			)
		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function),
			jasmine.any(Function),
			'MobileMessagingCordova',
			'init',
			[{
				applicationCode: '12345',
				cordovaPluginVersion: '1.2.3-test'
			}]);
	});

});

describe('Initialization with message storage', function() {

	beforeEach(function() {
		spyOn(cordova, 'exec');
	});

	it('should fail without start function', function(done) {
		var config = {
			applicationCode: '12345',
			messageStorage: {
				stop: function() {},
				save: function() {},
				find: function() {},
				findAll: function() {}
			}
		};

		MobileMessaging.init(config, function(error) {
			expect(error).toBe('Missing messageStorage.start function definition');
			done();
		});
	});

	it('should fail without stop function', function(done) {
		var config = {
			applicationCode: '12345',
			messageStorage: {
				start: function() {},
				save: function() {},
				find: function() {},
				findAll: function() {}
			}
		};

		MobileMessaging.init(config, function(error) {
			expect(error).toBe('Missing messageStorage.stop function definition');
			done();
		});
	});

	it('should fail without save function', function(done) {
		var config = {
			applicationCode: '12345',
			messageStorage: {
				stop: function() {},
				start: function() {},
				find: function() {},
				findAll: function() {}
			}
		};

		MobileMessaging.init(config, function(error) {
			expect(error).toBe('Missing messageStorage.save function definition');
			done();
		});
	});

	it('should fail without find function', function(done) {
		var config = {
			applicationCode: '12345',
			messageStorage: {
				stop: function() {},
				start: function() {},
				save: function() {},
				findAll: function() {}
			}
		};

		MobileMessaging.init(config, function(error) {
			expect(error).toBe('Missing messageStorage.find function definition');
			done();
		});
	});

	it('should fail without findAll function', function(done) {
		var config = {
			applicationCode: '12345',
			messageStorage: {
				stop: function() {},
				save: function() {},
				find: function() {},
				start: function() {}
			}
		};

		MobileMessaging.init(config, function(error) {
			expect(error).toBe('Missing messageStorage.findAll function definition');
			done();
		});
	});

});

describe('Base methods', function() {
	var spy1 = jasmine.createSpy('spy1');
	var spy2 = jasmine.createSpy('spy2');

	var handlersSpies = {
		  handler1: spy1,
		  handler2: spy2
	};
    var expectedHandlers = [handlersSpies.handler1, handlersSpies.handler2];
    
	beforeEach(function() {
		var config = {
			applicationCode: '12345',
			messageStorage: {
				start: function() {},
				stop: function() {},
				save: function() {},
				find: function() {},
				findAll: function() {}
			}
		};

		spyOn(cordova, 'exec');

		MobileMessaging.init(config, function(err) {});
	});
    
	it('should register', function() {
		var supportedEvents = MobileMessaging.supportedEvents;
		for (i = 0; i < supportedEvents.length; i++) {
			for (ii = 0; ii < expectedHandlers.length; ii++) {
        		MobileMessaging.register(supportedEvents[i], expectedHandlers[ii]);
        	}
		}

		console.log("should register: Current event handlers -" + JSON.stringify(MobileMessaging.eventHandlers, null, 4));
		for (i = 0; i < supportedEvents.length; i++) {
			var actualHandlers = MobileMessaging.eventHandlers[supportedEvents[i]];
			expect(actualHandlers).toEqual(expectedHandlers);
		}

	});
	
	it('should call handler', function() {
	
		var actualHandlers = MobileMessaging.eventHandlers['messageReceived'];
		console.log("should call handler: Actual handlers -" + JSON.stringify(actualHandlers, null, 4));
		MobileMessaging.init({applicationCode: '12345'}, function() {});
		expect(cordova.exec).toHaveBeenCalledWith(
												jasmine.any(Function),
												jasmine.any(Function),
												'MobileMessagingCordova',
												'registerReceiver',
												jasmine.any(Array)
		);
		var args = cordova.exec.calls.argsFor(5); //5 it's the number of exec call of 'registerReceiver'
		console.log("should call handler: args - " + JSON.stringify(args, null, 4));
		var handlingCallback = args[0];
		expect(typeof handlingCallback == 'function');
		var parameters = {'paramKey': 'paramValue'};
		handlingCallback(['messageReceived', parameters]);
		expect(spy1).toHaveBeenCalledWith(parameters);
		expect(spy2).toHaveBeenCalledWith(parameters);
	});


	it('should unregister', function() {
	    var supportedEvents = MobileMessaging.supportedEvents;
		for (i = 0; i < supportedEvents.length; i++) {
			for (ii = 0; ii < expectedHandlers.length; ii++) {
        		MobileMessaging.unregister(supportedEvents[i], expectedHandlers[ii]);
        	}
		}

		console.log("should unregister: Current event handlers -" + JSON.stringify(MobileMessaging.eventHandlers, null, 4));
		for (i = 0; i < supportedEvents.length; i++) {
			var actualHandlers = MobileMessaging.eventHandlers[supportedEvents[i]];
			expect(actualHandlers).toEqual([]);
		}
	});
	
	it('should syncUserData', function() {
		MobileMessaging.syncUserData({}, function(data) {}, function(err) {});

		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function),
			jasmine.any(Function),
			'MobileMessagingCordova',
			'syncUserData',
			[{}]);
	});

	it('should fetchUserData', function() {
		MobileMessaging.fetchUserData(function(data) {}, function(err) {});

		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function),
			jasmine.any(Function),
			'MobileMessagingCordova',
			'fetchUserData',
			[]);
	});

	it('should markMessagesSeen', function() {
		MobileMessaging.markMessagesSeen([1,2,3], function(data) {}, function(err) {});

		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function),
			jasmine.any(Function),
			'MobileMessagingCordova',
			'markMessagesSeen',
			[1,2,3]);
	});

	it('should defaultMessageStorage disabled', function() {
		var defaultMessageStorage = MobileMessaging.defaultMessageStorage();

		expect(defaultMessageStorage).toBeUndefined();
	});
});

describe('defaultMessageStorage methods', function() {

	beforeEach(function() {
		var config = {
			applicationCode: '12345',
			messageStorage: {
				start: function() {},
				stop: function() {},
				save: function() {},
				find: function() {},
				findAll: function() {}
			},
			defaultMessageStorage: true
		};

		spyOn(cordova, 'exec');

		MobileMessaging.init(config, function(err) {});
	});

	it('should defaultMessageStorage find', function() {
		var defaultMessageStorage = MobileMessaging.defaultMessageStorage();
		
		defaultMessageStorage.find(1, function() {});

		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function),
			jasmine.any(Function),
			'MobileMessagingCordova',
			'defaultMessageStorage_find',
			[1]);
	});

	it('should defaultMessageStorage findAll', function() {
		var defaultMessageStorage = MobileMessaging.defaultMessageStorage();

		defaultMessageStorage.findAll(function() {});

		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function),
			jasmine.any(Function),
			'MobileMessagingCordova',
			'defaultMessageStorage_findAll',
			[]);
	});

	it('should defaultMessageStorage delete', function() {
		var defaultMessageStorage = MobileMessaging.defaultMessageStorage();

		defaultMessageStorage.delete(1, function() {});

		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function),
			jasmine.any(Function),
			'MobileMessagingCordova',
			'defaultMessageStorage_delete',
			[1]);
	});

	it('should defaultMessageStorage deleteAll', function() {
		var defaultMessageStorage = MobileMessaging.defaultMessageStorage();

		defaultMessageStorage.deleteAll(function() {});

		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function),
			jasmine.any(Function),
			'MobileMessagingCordova',
			'defaultMessageStorage_deleteAll',
			[]);
	});
});