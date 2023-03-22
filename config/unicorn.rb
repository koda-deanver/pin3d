working_directory "/home/deploy/production/pin3d"
pid "/home/deploy/production/pin3d/tmp/pids/unicorn.pid"
stderr_path "/home/deploy/production/pin3d/log/unicorn_error.log"
stdout_path "/home/deploy/production/pin3d/log/unicorn.log"

listen "/tmp/pin3d_unicorn.pin3d.sock"
worker_processes 2
timeout 120