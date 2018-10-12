require 'xcodeproj'
require 'fileutils'
require 'pathname'

# puts "Enter App Group Id:"
# app_group = gets.chomp
app_group = "com.mobilemessaging.app-group-name"

# puts "Enter Push Application Code:"
# app_code = gets.chomp
app_code = "87dc5af9bb50ebe3df341c891e1bdd15-6b0a9477-8dd9-4c58-ad55-9cf5e370bd56"

# puts "Enter .xcodeproj file path"
# project_path = gets.chomp
project_path = '/Users/andreykadochnikov/nescript/nescript.xcodeproj'
project = Xcodeproj::Project.open(project_path)

## 1
ne_target = project.new_target(:app_extension, 'MobileMessagingNotificationExtension', ':ios')

## 2
dirname = Pathname.new(project_path).parent.to_s + '/NotificationExtension'
unless File.directory?(dirname)
  FileUtils.mkdir_p(dirname)
end
FileUtils.cp('NotificationService.swift', dirname)

# file = main_group.add_file('/file_path/to/file')
# target.add_source(file)

# - add to Podfile:
#       use_frameworks!
# 	    target 'MobileMessagingNotificationExtension' do
#            inherit! :search_paths
#       end
# - pod update
# - set team for ne_target
# - set ne_target.App_Group = On
# - set ne_target.infoPlist = ne.plist




# - append NotificationService.swift to compile sources
# - Pass App Group ID to the MobileMessaging SDK within your main application (use additional withAppGroupId(<# your App Group ID #>) constructor method):
# - Pass App Group ID to the MobileMessaging SDK within Extension (use additional withAppGroupId(<# your App Group ID #>) constructor method):

project.save()

