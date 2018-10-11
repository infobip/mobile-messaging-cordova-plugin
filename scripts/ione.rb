require 'xcodeproj'

project_path = '/Users/andreykadochnikov/nescript/nescript.xcodeproj'
project = Xcodeproj::Project.open(project_path)

ne_target = project.new_target(:app_extension, 'MobileMessagingNotificationExtension', ':ios')

# file = main_group.add_file('/file_path/to/file')
# target.add_source(file)

project.save()

