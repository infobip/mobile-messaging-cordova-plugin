require 'xcodeproj'
require 'fileutils'
require 'pathname'
require 'nokogiri'

module Mmine
  def self.root
    File.expand_path '../..', File.dirname(__FILE__)
  end
end

class NotificationExtensionIntegrator
	def initialize(application_code, project_file_path, app_group, main_target_name)
		@application_code = application_code
		@project_file_path = project_file_path
		@app_group = app_group
		@main_target_name = main_target_name
		
		@project_dir = Pathname.new(@project_file_path).parent.to_s
		@project = Xcodeproj::Project.open(@project_file_path)
		@ne_target_name = 'MobileMessagingNotificationExtension'
		@extension_source_name_filepath = File.join(Mmine.root, 'resources','NotificationService.swift')
		@extension_dir_name = 'NotificationExtension'
		@extension_destination_dir = File.join(@project_dir, @extension_dir_name)
		@extension_code_destination_filepath = File.join(@extension_destination_dir, 'NotificationService.swift')
		@extension_group_name = 'NotificationExtensionGroup'

		@plist_name = 'MobileMessagingNotificationServiceExtension.plist'
		@plist_source_filepath = File.join(Mmine.root, 'resources', @plist_name)
		@extension_info_plist_path = File.join(@project_dir, @extension_dir_name, @plist_name)

		@main_target = @project.native_targets().select { |target| target.name == @main_target_name }.first
		@main_target_build_settings_debug = @main_target.build_configurations.select { |config| config.type == :debug }.first.build_settings
		@main_target_build_settings_release = @main_target.build_configurations.select { |config| config.type == :release }.first.build_settings
		@main_target_debug_plist = resolveAbsolutePath(@main_target_build_settings_debug["INFOPLIST_FILE"])
		@main_target_release_plist = resolveAbsolutePath(@main_target_build_settings_release["INFOPLIST_FILE"])
	end

	def setupNotificationExtension
	
		createNotificationExtensionTarget()
		createNotificationExtensionDir()
		addNotificationExtensionSourceCode()
		setupDevelopmentTeam()
		setupDeploymentTarget()
		setupNotificationExtensionInfoPlist()
		setupNotificationExtensionBundleId()
		setupNotificationExtensionEntitlements()
		setupMainTargetEntitlements()
		setupAppGroupPlistValue()
		setupApplicationCodePlistValue()

		## 9
		# todo since user specifies target we can update podfile for him with extension declaration
		@project.save()
	end

	def createNotificationExtensionTarget
		@ne_target = @project.native_targets().select { |target| target.name == @ne_target_name }.first
		if @ne_target == nil
			@ne_target = @project.new_target(:app_extension, @ne_target_name, ':ios')
		end
		@extension_build_settings_debug = @ne_target.build_configurations.select { |config| config.type == :debug }.first.build_settings
		@extension_build_settings_release = @ne_target.build_configurations.select { |config| config.type == :release }.first.build_settings
	end

	def createNotificationExtensionDir
		unless File.directory?(@extension_destination_dir)
			puts 'mkdir_p'
			FileUtils.mkdir_p(@extension_destination_dir)
		end
	end

	def addNotificationExtensionSourceCode
		puts ">>>>> #{@extension_code_destination_filepath}"
		unless File.exist?(@extension_code_destination_filepath)
			puts 'cp'
			FileUtils.cp(@extension_source_name_filepath, @extension_code_destination_filepath)
			filereference = notificationExtensionGroupReference().new_reference(@extension_code_destination_filepath)
			@ne_target.add_file_references([filereference])
		end
	end

	def setupDevelopmentTeam
		setNotificationExtensionBuildSettings('DEVELOPMENT_TEAM', @main_target_build_settings_debug['DEVELOPMENT_TEAM'], @main_target_build_settings_release['DEVELOPMENT_TEAM'])
	end

	def setupDeploymentTarget
		setNotificationExtensionBuildSettings('IPHONEOS_DEPLOYMENT_TARGET', "10.0")
	end

	def setupNotificationExtensionInfoPlist
		unless File.exist?(@extension_info_plist_path)
			FileUtils.cp(@plist_source_filepath, @extension_info_plist_path)
			notificationExtensionGroupReference().new_reference(@extension_info_plist_path) #check if additional plist manipulations needed (target membership?)
		end 		
		setNotificationExtensionBuildSettings('INFOPLIST_FILE', resolveXcodePath(@extension_info_plist_path))
	end

	def setupNotificationExtensionBundleId
		suffix = "notification-extension"
		debug_id = @main_target_build_settings_debug['PRODUCT_BUNDLE_IDENTIFIER']
		release_id = @main_target_build_settings_release['PRODUCT_BUNDLE_IDENTIFIER']
		setNotificationExtensionBuildSettings('PRODUCT_BUNDLE_IDENTIFIER', "#{debug_id}.#{suffix}", "#{release_id}.#{suffix}")
	end

	def setupMainTargetEntitlements
		setupEntitlements(@main_target_build_settings_debug, @main_target_build_settings_release, @main_target_name)
	end

	def setupNotificationExtensionEntitlements
		setupEntitlements(@extension_build_settings_debug, @extension_build_settings_release, @ne_target_name)
	end

	def setupApplicationCodePlistValue
		putStringValueIntoPlist("com.mobilemessaging.app_code", @application_code, @main_target_release_plist)
	end

	def setupAppGroupPlistValue
		putStringValueIntoPlist("com.mobilemessaging.app_group", @app_group, @main_target_release_plist)
	end

	# private ->
	def setupEntitlements(_build_settings_debug, _build_settings_release, target_name)
		entitlements_debug_filepath = _build_settings_debug['CODE_SIGN_ENTITLEMENTS'] != nil ? resolveAbsolutePath(_build_settings_debug['CODE_SIGN_ENTITLEMENTS']) : nil
		entitlements_release_filepath = _build_settings_release['CODE_SIGN_ENTITLEMENTS'] != nil ? resolveAbsolutePath(_build_settings_release['CODE_SIGN_ENTITLEMENTS']) : nil

		if entitlements_debug_filepath == nil and entitlements_release_filepath == nil
			entitlements_destination_filepath = createAppGroupEntitlements("#{target_name}.entitlements")
			setBuildSettings(_build_settings_debug, _build_settings_release, 'CODE_SIGN_ENTITLEMENTS', resolveXcodePath(entitlements_destination_filepath))
		else
			if entitlements_debug_filepath == entitlements_release_filepath
				modifyXml(entitlements_debug_filepath)
			else
				if entitlements_debug_filepath != nil
					modifyXml(entitlements_debug_filepath)
				else
					entitlements_destination_filepath = createAppGroupEntitlements("#{target_name}_debug.entitlements")
					_build_settings_debug['CODE_SIGN_ENTITLEMENTS'] = resolveXcodePath(entitlements_destination_filepath)
				end

				if entitlements_release_filepath != nil
					modifyXml(entitlements_release_filepath)
				else
					entitlements_destination_filepath = createAppGroupEntitlements("#{target_name}_release.entitlements")
					_build_settings_release['CODE_SIGN_ENTITLEMENTS'] = resolveXcodePath(entitlements_destination_filepath)
				end
			end
		end

		@project.root_object.attributes["TargetAttributes"][@ne_target.uuid] = {"SystemCapabilities" => {"com.apple.ApplicationGroups.iOS" => {"enabled" => 1}}}
	end


	def resolveXcodePath(path)
		return path.sub(@project_dir, '$(PROJECT_DIR)')
	end

	def setBuildSettings(_build_settings_debug, _build_settings_release, key, debug_value, release_value=nil)
		_build_settings_debug[key] = debug_value
		_build_settings_release[key] = release_value != nil ? release_value : debug_value
	end

	def setNotificationExtensionBuildSettings(key, debug_value, release_value=nil)
		@extension_build_settings_debug[key] = debug_value
		@extension_build_settings_release[key] = release_value != nil ? release_value : debug_value
	end

	def notificationExtensionGroupReference
		group_reference = @project.groups().select { |group| group.name == @extension_group_name }.first
		if group_reference == nil
			group_reference = @project.new_group(@extension_group_name, @extension_destination_dir)
		end
		return group_reference
	end

	def createAppGroupEntitlements(_entitlements_name)
		puts "> creating entitlements #{_entitlements_name}"
		entitlements_destination_filepath = File.join(@project_dir, _entitlements_name)
		entitlements_source_filepath = File.join(Mmine.root, 'resources', "MobileMessagingNotificationExtension.entitlements")
		unless File.exist?(entitlements_destination_filepath)
			FileUtils.cp(entitlements_source_filepath, entitlements_destination_filepath)
			ref = @project.main_group.new_reference(entitlements_destination_filepath)
			ref.last_known_file_type = "text.xml"
		end
		modifyXml(entitlements_destination_filepath)
		return entitlements_destination_filepath
	end

	def resolveAbsolutePath(path)
		puts "> resolving path from #{path}"
		if path.include? "$(PROJECT_DIR)"
			return path.sub('$(PROJECT_DIR)', @project_dir)
		else
			if path.start_with? "/"
				return path
			else
				return File.join(@project_dir, path)
			end
		end
	end

	def putStringValueIntoPlist(key, value, plist_path)
		puts "> putting plist string: \n#{key}\n#{value}\n#{plist_path}"
		doc = Nokogiri::XML(IO.read(plist_path))
		key_node = doc.search("//dict//key[text() = '#{key}']").first
		string_value_node = Nokogiri::XML::Node.new("string",doc)
		string_value_node.content = value
		if key_node == nil
			key_node = Nokogiri::XML::Node.new("key",doc)
			key_node.content = key
			doc.xpath("//dict").first.add_child(key_node)
			key_node.add_next_sibling(string_value_node)
		else
			existing_string_value_node = key_node.xpath("following-sibling::*").first
			if existing_string_value_node.name == 'string'
				existing_string_value_node.content = value
			else
				key_node.add_next_sibling(string_value_node)
			end
		end

		file = File.open(plist_path,'w')
		file.puts Nokogiri::XML(doc.to_xml) { |x| x.noblanks }
		file.close
	end

	def modifyXml(filepath)
		puts "> appending to xml"
		doc = Nokogiri::XML(IO.read(filepath))
		app_groups_key = "com.apple.security.application-groups"
		key_node = doc.search("//dict//key[text() = '#{app_groups_key}']").first
		string_app_group_value = Nokogiri::XML::Node.new("string",doc)
		string_app_group_value.content = @app_group
		if key_node == nil
			puts "> key node for app groups not found"
			key_node = Nokogiri::XML::Node.new("key",doc)
			key_node.content = app_groups_key
			array_node = Nokogiri::XML::Node.new("array",doc)
			array_node.add_child(string_app_group_value)

			doc.xpath("//dict").first.add_child(key_node)
			key_node.add_next_sibling(array_node)
		else
			puts "> key node for app groups found"
			array_node = key_node.xpath("following-sibling::*").first
			if array_node.name == 'array'
				puts "> array node is not nil, going further"
				unless array_node.xpath("//string[text() = '#{@app_group}']").first
					puts "> app group string not found in array, adding it"
					array_node.add_child(string_app_group_value)
				end
			else
				puts "> array node is nil, creating one"
				array_node = Nokogiri::XML::Node.new("array",doc)
				array_node.add_child(string_app_group_value)
			end
			key_node.add_next_sibling(array_node)
		end

		file = File.open(filepath,'w')
		file.puts Nokogiri::XML(doc.to_xml) { |x| x.noblanks }
		file.close
	end
end
