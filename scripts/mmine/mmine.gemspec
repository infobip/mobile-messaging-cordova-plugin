Gem::Specification.new do |s|
  s.executables = ['mmine']
  s.name        = 'mmine'
  s.version     = '0.1.0'
  s.date		= '2018-10-16'
  s.summary     = "Mobile Messaging iOS Notification Extension Integration Tool!!!"
  s.description = "Use this tool to automatically integrate your Xcode project with Mobile Messaging Notification Service Extension"
  s.authors     = ["Andrey Kadochnikov"]
  s.email       = 'andrey.kadochnikov@infobip.com'
  s.homepage    = 'https://github.com/infobip/mobile-messaging-mmine'
  s.metadata 	= {"source_code_url" => "https://github.com/infobip/mobile-messaging-mmine"}
  s.files 		= Dir['lib/*'] + Dir['lib/mmine/*'] + Dir['bin/*'] + Dir['resources/*']
  s.license		= 'MIT'
  s.add_runtime_dependency 'xcodeproj', '=1.6.0'
  s.add_runtime_dependency 'nokogiri', '=1.8.5'
end