require 'xcodeproj'
require 'fileutils'
require 'pathname'

# puts "Enter main target name:"
# main_target_name = gets.chomp
main_target_name = 'nescript'

# puts "Enter App Group Id:"
# app_group = gets.chomp
app_group = 'com.mobilemessaging.app-group-name'

# puts "Enter notification extension bundle id:"
# notification_extension_bundle_id = gets.chomp
notification_extension_bundle_id = 'com.mobilemessaging.notificationextension'

# puts "Enter Push Application Code:"
# app_code = gets.chomp
app_code = "87dc5af9bb50ebe3df341c891e1bdd15-6b0a9477-8dd9-4c58-ad55-9cf5e370bd56"

# puts "Enter .xcodeproj file path"
# project_path = gets.chomp
project_path = '/Users/andreykadochnikov/nescript/nescript.xcodeproj'
project = Xcodeproj::Project.open(project_path)

## 1
ne_target_name = 'MobileMessagingNotificationExtension'
ne_target = project.native_targets().select { |target| target.name == ne_target_name }.first
if ne_target == nil
	puts 'new_target'
	ne_target = project.new_target(:app_extension, ne_target_name, ':ios')
end

## 2
project_dir = Pathname.new(project_path).parent.to_s
extension_source_name = 'NotificationService.swift'
extension_dir_name = 'NotificationExtension'
extension_destination_dir = project_dir + '/' + extension_dir_name
extension_code_destination_filepath = extension_destination_dir + '/' + extension_source_name
unless File.directory?(extension_destination_dir)
	puts 'mkdir_p'
	FileUtils.mkdir_p(extension_destination_dir)
end
unless File.exist?(extension_code_destination_filepath)
	puts 'cp'
	FileUtils.cp(extension_source_name, extension_destination_dir)
end 

## 3
extension_group_name = 'NotificationExtensionGroup'
group_reference = project.groups().select { |group| group.name == extension_group_name }.first
if group_reference == nil
	puts "new_group"
	group_reference = project.new_group(extension_group_name, extension_destination_dir)
	puts "new_file_reference"
	filereference = group_reference.new_reference(extension_code_destination_filepath)
	ne_target.add_file_references([filereference])
end

## 4
main_target = project.native_targets().select { |target| target.name == main_target_name }.first
main_target_build_settings_debug = main_target.build_configurations.select { |config| config.type == :debug }.first.build_settings
main_target_build_settings_release = main_target.build_configurations.select { |config| config.type == :release }.first.build_settings
build_settings_debug = ne_target.build_configurations.select { |config| config.type == :debug }.first.build_settings
build_settings_release = ne_target.build_configurations.select { |config| config.type == :release }.first.build_settings
build_settings_debug['DEVELOPMENT_TEAM'] = main_target_build_settings_debug['DEVELOPMENT_TEAM']
build_settings_release['DEVELOPMENT_TEAM'] = main_target_build_settings_release['DEVELOPMENT_TEAM']

## 5
plist_name = 'MobileMessagingNotificationServiceExtension.plist'
plist_destination_filepath = extension_destination_dir + '/' + plist_name
unless File.exist?(plist_destination_filepath)
	puts 'cp'
	FileUtils.cp(plist_name, plist_destination_filepath)
	group_reference.new_reference(plist_destination_filepath)
end 
info_plist_path = "$(SRCROOT)/#{extension_dir_name}/#{plist_name}"
build_settings_debug['INFOPLIST_FILE'] = info_plist_path
build_settings_release['INFOPLIST_FILE'] = info_plist_path

## 6
build_settings_debug['PRODUCT_BUNDLE_IDENTIFIER'] = notification_extension_bundle_id
build_settings_release['PRODUCT_BUNDLE_IDENTIFIER'] = notification_extension_bundle_id

## 7
#todo since user specifies target we can update podfile for him with extension declaration

## 8
# - set ne_target.App_Group = On
# build_settings_debug['CODE_SIGN_ENTITLEMENTS'] = '.entitlements'
# build_settings_release['CODE_SIGN_ENTITLEMENTS'] = '.entitlements'

## 9
# put app code and group id into plists and read it from there!
# - Pass App Group ID to the MobileMessaging SDK within your main application (use additional withAppGroupId(<# your App Group ID #>) constructor method):
# - Pass App Group ID to the MobileMessaging SDK within Extension (use additional withAppGroupId(<# your App Group ID #>) constructor method):

project.save()

