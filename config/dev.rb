# app_path = "/home/deploy/production/pin3d"

# working_directory app_path
# pid app_path + "/tmp/pids/unicorn.pid"
# stderr_path app_path + "/log/unicorn.log"
# stdout_path app_path + "/log/unicorn.log"

# listen "/tmp/development.sock"

# worker_processes 2
# timeout 15


working_directory "/home/deploy/production/pin3d"
pid "/home/deploy/production/pin3d/tmp/pids/unicorn.pid"
stderr_path "/home/deploy/production/pin3d/log/unicorn_error.log"
stdout_path "/home/deploy/production/pin3d/log/unicorn.log"

listen "/tmp/cube_unicorn.pin3d.sock"
worker_processes 2
timeout 120