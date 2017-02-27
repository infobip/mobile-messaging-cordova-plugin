/**
 * Unit tests for Mobile Messaging Cordova Plugin
 */

describe('Initialization', function() {

	var cordova;

	beforeEach(function() {
		cordova = {
			exec: function(success, error, object, method, args) {
				console.log('Initialization test args: ' + JSON.stringify(args));
			}
		};

		spyOn(cordova, 'exec');
	});

	it('should fail if no application code', function(done) {
		MobileMessaging.init({}, function(error) {
			expect(error).toBe('No application code provided');
			done();
		}, cordova);
	});

	it('should provide configuration to cordova.exec()', function() {
		MobileMessaging.init({applicationCode: '12345'}, function() {}, cordova);
		expect(cordova.exec).toHaveBeenCalledWith(
			jasmine.any(Function), 
			jasmine.any(Function), 
			'MobileMessagingCordova',
			'init',
			[{
				applicationCode: '12345'
			}]);
	});

});

describe('Initialization with message storage', function() {

	var cordova;

	beforeEach(function() {
		cordova = {
			exec: function(success, error, object, method, args) {
				console.log('Initialization test args: ' + JSON.stringify(args));
			}
		};

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
		}, cordova);
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
		}, cordova);
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
		}, cordova);
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
		}, cordova);
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
		}, cordova);
	});

});