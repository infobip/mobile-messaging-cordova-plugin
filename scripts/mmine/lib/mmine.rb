require 'mmine/notification_extension_integrator'

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

NotificationExtensionIntegrator.new(project_file_path, app_code, app_group, main_target_name, notification_extension_bundle_id).setupNotificationExtension()