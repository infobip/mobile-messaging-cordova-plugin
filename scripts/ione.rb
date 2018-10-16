require 'xcodeproj'
require 'fileutils'
require 'pathname'
require 'nokogiri'

# puts "Enter main target name:"
# main_target_name = gets.chomp
main_target_name = 'nescript'

# puts "Enter App Group Id:"
# app_group = gets.chomp
app_group = 'group.com.mobile-messaging.notification-service-extension'

# puts "Enter notification extension bundle id:"
# notification_extension_bundle_id = gets.chomp
notification_extension_bundle_id = 'com.infobip.mobilemessaging.bipbip.NotificationServiceExtension'

# puts "Enter Push Application Code:"
# app_code = gets.chomp
app_code = "87dc5af9bb50ebe3df341c891e1bdd15-6b0a9477-8dd9-4c58-ad55-9cf5e370bd56"

# puts "Enter .xcodeproj file path"
# project_file_path = gets.chomp
project_file_path = '/Users/andreykadochnikov/nescript/nescript.xcodeproj'

def createEntitlements(project, project_dir, entitlements_name, app_group)
	puts "> creating entitlements #{entitlements_name}"
	entitlements_destination_filepath = project_dir + '/' + entitlements_name
	FileUtils.cp("MobileMessagingNotificationExtension.entitlements", entitlements_destination_filepath)
	ref = project.main_group.new_reference(entitlements_destination_filepath)
	ref.last_known_file_type = "text.xml"
	modifyXml(entitlements_destination_filepath,app_group)
	return entitlements_destination_filepath
end

def resolvePath(path, project_dir)
	puts "> resolving path from #{path}"
	if path.include? "$(PROJECT_DIR)"
		return path.sub('$(PROJECT_DIR)', project_dir)
	else
		if path.start_with? "/"
			return path
		else
			return "#{project_dir}/#{path}"
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

def modifyXml(filepath, app_group)
	puts "> appending to xml"
	doc = Nokogiri::XML(IO.read(filepath))
	app_groups_key = "com.apple.security.application-groups"
	key_node = doc.search("//dict//key[text() = '#{app_groups_key}']").first
	string_app_group_value = Nokogiri::XML::Node.new("string",doc)
	string_app_group_value.content = app_group
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
			puts "> array node is not nil"
			app_group_string = array_node.xpath("//string[text() = '#{app_group}']").first
			puts app_group_string
			unless app_group_string
				puts "> app group string not found in array, adding it"
				array_node.add_child(string_app_group_value)
			end
		else
			puts "> array node is nil"
			array_node = Nokogiri::XML::Node.new("array",doc)
			array_node.add_child(string_app_group_value)
		end
		key_node.add_next_sibling(array_node)
	end

	file = File.open(filepath,'w')
	file.puts Nokogiri::XML(doc.to_xml) { |x| x.noblanks }
	file.close
end

## variables
project_dir = Pathname.new(project_file_path).parent.to_s
project = Xcodeproj::Project.open(project_file_path)

ne_target_name = 'MobileMessagingNotificationExtension'

extension_source_name = 'NotificationService.swift'
extension_dir_name = 'NotificationExtension'
extension_destination_dir = "#{project_dir}/#{extension_dir_name}"
extension_code_destination_filepath = "#{extension_destination_dir}/#{extension_source_name}"
extension_group_name = 'NotificationExtensionGroup'

plist_name = 'MobileMessagingNotificationServiceExtension.plist'
extension_info_plist_path = "#{project_dir}/#{extension_dir_name}/#{plist_name}"

main_target = project.native_targets().select { |target| target.name == main_target_name }.first
main_target_build_settings_debug = main_target.build_configurations.select { |config| config.type == :debug }.first.build_settings
main_target_build_settings_release = main_target.build_configurations.select { |config| config.type == :release }.first.build_settings
main_target_debug_plist = resolvePath(main_target_build_settings_debug["INFOPLIST_FILE"], project_dir)
main_target_release_plist = resolvePath(main_target_build_settings_release["INFOPLIST_FILE"], project_dir)

## 1
ne_target = project.native_targets().select { |target| target.name == ne_target_name }.first
if ne_target == nil
	puts 'new_target'
	ne_target = project.new_target(:app_extension, ne_target_name, ':ios')
end
extension_build_settings_debug = ne_target.build_configurations.select { |config| config.type == :debug }.first.build_settings
extension_build_settings_release = ne_target.build_configurations.select { |config| config.type == :release }.first.build_settings

## 2
unless File.directory?(extension_destination_dir)
	puts 'mkdir_p'
	FileUtils.mkdir_p(extension_destination_dir)
end
unless File.exist?(extension_code_destination_filepath)
	puts 'cp'
	FileUtils.cp(extension_source_name, extension_destination_dir)
end 

## 3
group_reference = project.groups().select { |group| group.name == extension_group_name }.first
if group_reference == nil
	puts "new_group"
	group_reference = project.new_group(extension_group_name, extension_destination_dir)
	puts "new_file_reference"
	filereference = group_reference.new_reference(extension_code_destination_filepath)
	ne_target.add_file_references([filereference])
end

## 4
extension_build_settings_debug['DEVELOPMENT_TEAM'] = main_target_build_settings_debug['DEVELOPMENT_TEAM']
extension_build_settings_release['DEVELOPMENT_TEAM'] = main_target_build_settings_release['DEVELOPMENT_TEAM']

## 5
unless File.exist?(extension_info_plist_path)
	puts 'cp'
	FileUtils.cp(plist_name, extension_info_plist_path)
	group_reference.new_reference(extension_info_plist_path)
end 
extension_build_settings_debug['INFOPLIST_FILE'] = extension_info_plist_path.sub(project_dir, '$(PROJECT_DIR)')
extension_build_settings_release['INFOPLIST_FILE'] = extension_info_plist_path.sub(project_dir, '$(PROJECT_DIR)')

## 6
extension_build_settings_debug['PRODUCT_BUNDLE_IDENTIFIER'] = notification_extension_bundle_id
extension_build_settings_release['PRODUCT_BUNDLE_IDENTIFIER'] = notification_extension_bundle_id

## 7
entitlements_debug_filepath = extension_build_settings_debug['CODE_SIGN_ENTITLEMENTS'] != nil ? resolvePath(extension_build_settings_debug['CODE_SIGN_ENTITLEMENTS'], project_dir) : nil
entitlements_release_filepath = extension_build_settings_release['CODE_SIGN_ENTITLEMENTS'] != nil ? resolvePath(extension_build_settings_release['CODE_SIGN_ENTITLEMENTS'], project_dir) : nil

if entitlements_debug_filepath == nil and entitlements_release_filepath == nil
	entitlements_destination_filepath = createEntitlements(project, project_dir, ".entitlements", app_group)
	extension_build_settings_debug['CODE_SIGN_ENTITLEMENTS'] = entitlements_destination_filepath.sub(project_dir, '$(PROJECT_DIR)') #FIXME why this changes extension target build settings
	extension_build_settings_release['CODE_SIGN_ENTITLEMENTS'] = entitlements_destination_filepath.sub(project_dir, '$(PROJECT_DIR)')
else
	if entitlements_debug_filepath == entitlements_release_filepath
		modifyXml(entitlements_debug_filepath,app_group)
	else
		if entitlements_debug_filepath != nil
			modifyXml(entitlements_debug_filepath,app_group)
		else
			entitlements_destination_filepath = createEntitlements(project, project_dir, "debug.entitlements", app_group)
			extension_build_settings_debug['CODE_SIGN_ENTITLEMENTS'] = entitlements_destination_filepath.sub(project_dir, '$(PROJECT_DIR)')
		end

		if entitlements_release_filepath != nil
			modifyXml(entitlements_release_filepath,app_group)
		else
			entitlements_destination_filepath = createEntitlements(project, project_dir, "release.entitlements", app_group)
			extension_build_settings_release['CODE_SIGN_ENTITLEMENTS'] = entitlements_destination_filepath.sub(project_dir, '$(PROJECT_DIR)')
		end
	end
end

project.root_object.attributes["TargetAttributes"][ne_target.uuid] = {"SystemCapabilities" => {"com.apple.ApplicationGroups.iOS" => {"enabled" => 1}}}

## 8
#extension app group
putStringValueIntoPlist("com.mobilemessaging.app_group", app_group, extension_info_plist_path) 
#extension app code
putStringValueIntoPlist("com.mobilemessaging.app_code", app_code, extension_info_plist_path)
#main target app group
putStringValueIntoPlist("com.mobilemessaging.app_group", app_group, main_target_release_plist)
#main target app code
putStringValueIntoPlist("com.mobilemessaging.app_code", app_code, main_target_debug_plist)

## 9
# todo since user specifies target we can update podfile for him with extension declaration

project.save()

